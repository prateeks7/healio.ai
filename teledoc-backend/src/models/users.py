from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    role: str = "patient"

class UserCreate(UserBase):
    google_sub: str
    user_id: str
    patient_id: Optional[str] = None
    created_at: datetime = datetime.utcnow()

class UserResponse(UserBase):
    user_id: str
    patient_id: Optional[str] = None
