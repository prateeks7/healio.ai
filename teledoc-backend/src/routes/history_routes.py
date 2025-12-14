from fastapi import APIRouter, Depends, HTTPException
from src.security.rbac import require_role
from src.db.client import get_database
from src.models.medical_history import MedicalHistory
from datetime import datetime

router = APIRouter(prefix="/patients", tags=["History"])

@router.put("/{patient_id}/history")
async def upsert_history(
    patient_id: str, 
    history: MedicalHistory, 
    user: dict = Depends(require_role(["patient", "admin"]))
):
    # Ensure patient is updating their own history
    if user["role"] == "patient" and user["patient_id"] != patient_id:
        raise HTTPException(status_code=403, detail="Cannot update other patient's history")
        
    db = get_database()
    await db.medical_histories.update_one(
        {"patient_id": patient_id},
        {"$set": {
            "history": history.dict(), 
            "updated_at": datetime.utcnow()
        }},
        upsert=True
    )
    return {"status": "success"}

@router.get("/{patient_id}/history")
async def get_history(
    patient_id: str, 
    user: dict = Depends(require_role(["patient", "doctor", "admin"]))
):
    if user["role"] == "patient" and user["patient_id"] != patient_id:
        raise HTTPException(status_code=403, detail="Cannot view other patient's history")
        
    db = get_database()
    doc = await db.medical_histories.find_one({"patient_id": patient_id})
    if not doc:
        raise HTTPException(status_code=404, detail="History not found")
    return doc["history"]
