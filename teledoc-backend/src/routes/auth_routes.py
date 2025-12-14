from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional
from src.security.auth import verify_google_token
from src.security.jwt_utils import create_access_token
from src.db.client import get_database
from src.models.users import UserCreate, UserResponse
import uuid
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Auth"])

class GoogleAuthRequest(BaseModel):
    id_token: str
    role: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    name: Optional[str] = None

@router.post("/google/verify")
async def verify_google(request: GoogleAuthRequest):
    id_token = request.id_token
    id_info = verify_google_token(id_token)
    if not id_info:
        raise HTTPException(status_code=400, detail="Invalid Google Token")

    google_sub = id_info['sub']
    email = id_info['email']
    # Use provided name, or Google name, or email fallback
    name = request.name or id_info.get('name', email.split('@')[0])
    
    db = get_database()
    user = await db.users.find_one({"google_sub": google_sub})
    
    if not user:
        # If role is not provided in request, it means this is a login attempt for a potential new user
        # We return 404 so frontend can show onboarding
        if not request.role and not request.age and not request.sex:
             # Check if we should default or require onboarding. 
             # For this requirement, we MUST ask role. So we return 404 to trigger onboarding.
             # However, we need to distinguish between "invalid token" and "user not found".
             # We'll return a specific structure or 404.
             raise HTTPException(status_code=404, detail="User not found, onboarding required")

        # Create new user with provided role/demographics
        user_id = uuid.uuid4().hex
        # Only generate patient_id if role is patient
        patient_id = uuid.uuid4().hex if request.role == "patient" else None
        
        new_user = {
            "user_id": user_id,
            "google_sub": google_sub,
            "email": email,
            "name": name,
            "role": request.role,
            "patient_id": patient_id,
            "created_at": datetime.utcnow(),
            "age": request.age,
            "sex": request.sex
        }
        await db.users.insert_one(new_user)
        user = new_user
    else:
        # User exists, but we might want to update details if provided (e.g. during onboarding/re-onboarding)
        update_fields = {}
        if request.name: update_fields["name"] = request.name
        if request.age: update_fields["age"] = request.age
        if request.sex: update_fields["sex"] = request.sex
        if request.role and user.get("role") != request.role: 
             # Allow role switch if needed, or just update if missing
             update_fields["role"] = request.role
             if request.role == "patient" and not user.get("patient_id"):
                 update_fields["patient_id"] = uuid.uuid4().hex
        
        if update_fields:
            await db.users.update_one({"_id": user["_id"]}, {"$set": update_fields})
            # Update local user object for token generation
            user.update(update_fields)
    
    # Create JWT
    token_data = {
        "sub": user["user_id"],
        "role": user["role"],
        "patient_id": user.get("patient_id"),
        "email": user["email"]
    }
    jwt_token = create_access_token(token_data)
    
    return {
        "jwt": jwt_token,
        "profile": {
            "sub": user["user_id"],
            "role": user["role"],
            "patient_id": user.get("patient_id"),
            "email": user["email"],
            "name": user.get("name", name),
            "age": user.get("age"),
            "sex": user.get("sex")
        }
    }

@router.post("/dev/login")
async def dev_login(email: str = Body(..., embed=True)):
    """
    Dev-only login to get a token without Google Auth.
    Creates a user if not exists.
    """
    db = get_database()
    user = await db.users.find_one({"email": email})
    
    if not user:
        # Create new user
        user_id = uuid.uuid4().hex
        patient_id = uuid.uuid4().hex
        new_user = {
            "user_id": user_id,
            "google_sub": f"dev_{uuid.uuid4().hex}",
            "email": email,
            "role": "patient",
            "patient_id": patient_id,
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(new_user)
        user = new_user
    
    # Create JWT
    token_data = {
        "sub": user["user_id"],
        "role": user["role"],
        "patient_id": user.get("patient_id"),
        "email": user["email"]
    }
    jwt_token = create_access_token(token_data)
    
    return {
        "access_token": jwt_token, # Match standard OAuth response key or what client expects
        "jwt": jwt_token, # Keep this for compatibility if needed
        "profile": {
            "sub": user["user_id"],
            "role": user["role"],
            "patient_id": user.get("patient_id"),
            "email": user["email"]
        }
    }
