from fastapi import APIRouter, Depends, HTTPException, Body, File, UploadFile
from src.security.rbac import require_role
from src.db.client import get_database
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import shutil
import os

router = APIRouter(prefix="/doctor", tags=["Doctor"])

class DoctorProfile(BaseModel):
    specialty: Optional[str] = None
    bio: Optional[str] = None
    experience_years: Optional[int] = None
    license_number: Optional[str] = None
    name: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None

class ReviewRequest(BaseModel):
    status: str # "approved" or "rejected"
    comments: Optional[str] = None

@router.put("/profile")
async def update_doctor_profile(
    profile: DoctorProfile,
    user: dict = Depends(require_role(["doctor"]))
):
    db = get_database()
    
    # Update root fields (name, age, sex)
    root_updates = {}
    if profile.name: root_updates["name"] = profile.name
    if profile.age: root_updates["age"] = profile.age
    if profile.sex: root_updates["sex"] = profile.sex
    
    # Update doctor_profile fields
    doctor_profile_updates = {
        "doctor_profile.updated_at": datetime.utcnow()
    }
    if profile.specialty: doctor_profile_updates["doctor_profile.specialty"] = profile.specialty
    if profile.bio: doctor_profile_updates["doctor_profile.bio"] = profile.bio
    if profile.experience_years is not None: doctor_profile_updates["doctor_profile.experience_years"] = profile.experience_years
    if profile.license_number: doctor_profile_updates["doctor_profile.license_number"] = profile.license_number
    
    # Combine updates
    update_query = {"$set": {**root_updates, **doctor_profile_updates}}
    
    await db.users.update_one(
        {"user_id": user["sub"]},
        update_query
    )
    
    return {"message": "Profile updated successfully"}

@router.post("/license")
async def upload_license(
    file: UploadFile = File(...),
    user: dict = Depends(require_role(["doctor"]))
):
    # Ensure directory exists
    upload_dir = "uploads/licenses"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_location = f"{upload_dir}/{user['sub']}_{file.filename}"
    
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
        
    db = get_database()
    await db.users.update_one(
        {"user_id": user["sub"]},
        {"$set": {"doctor_profile.license_file": file_location, "doctor_profile.verified": False}}
    )
    
    return {"message": "License uploaded successfully"}

@router.get("/reports")
async def get_doctor_reports(user: dict = Depends(require_role(["doctor"]))):
    """
    Fetch all reports for doctor review.
    """
    db = get_database()
    # Fetch all reports, sorted by creation time (newest first)
    cursor = db.reports.find({}).sort("created_at", -1)
    reports = await cursor.to_list(length=100)
    
    # Enrich with patient names
    for report in reports:
        if "_id" in report:
            report["_id"] = str(report["_id"])
            
        patient = await db.users.find_one({"patient_id": report["patient_id"]})
        report["patient_name"] = patient.get("name", "Unknown") if patient else "Unknown"
        
    return reports

@router.post("/reports/{report_id}/review")
async def review_report(
    report_id: str,
    review: ReviewRequest,
    user: dict = Depends(require_role(["doctor"]))
):
    """
    Approve or Reject a report with comments.
    """
    db = get_database()
    
    update_data = {
        "doctor_review": {
            "status": review.status,
            "comments": review.comments,
            "reviewed_at": datetime.utcnow(),
            "reviewed_by": user["sub"]
        },
        "reviewed": True
    }
    
    result = await db.reports.update_one(
        {"report_id": report_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
        
    return {"message": "Report reviewed successfully"}

@router.get("/fhir/DiagnosticReport")
async def get_fhir_reports(user: dict = Depends(require_role(["doctor"]))):
    """
    FHIR-compliant endpoint for fetching reports.
    Returns a Bundle of DiagnosticReport resources.
    """
    db = get_database()
    cursor = db.reports.find({}).sort("created_at", -1)
    reports = await cursor.to_list(length=50)
    
    entries = []
    for report in reports:
        patient = await db.users.find_one({"patient_id": report["patient_id"]})
        patient_name = patient.get("name", "Unknown") if patient else "Unknown"
        
        fhir_resource = {
            "resourceType": "DiagnosticReport",
            "id": report["report_id"],
            "status": "final",
            "code": {
                "coding": [{
                    "system": "http://loinc.org",
                    "code": "55151-3",
                    "display": "General Medical Consultation Report"
                }]
            },
            "subject": {
                "reference": f"Patient/{report['patient_id']}",
                "display": patient_name
            },
            "effectiveDateTime": report["created_at"].isoformat() if isinstance(report["created_at"], datetime) else report["created_at"],
            "issued": report["created_at"].isoformat() if isinstance(report["created_at"], datetime) else report["created_at"],
            "performer": [{
                "display": "Healio AI Assistant"
            }],
            "presentedForm": [{
                "contentType": "application/pdf",
                "url": f"/patients/{report['patient_id']}/reports/{report['report_id']}/pdf",
                "title": "Medical Report PDF"
            }],
            "conclusion": report.get("doctor_report", {}).get("assessment", {}).get("primary_diagnosis", {}).get("name", "Unknown"),
            "extension": [
                {
                    "url": "http://healio.ai/fhir/StructureDefinition/review-status",
                    "valueString": report.get("doctor_review", {}).get("status", "pending")
                },
                {
                    "url": "http://healio.ai/fhir/StructureDefinition/doctor-comments",
                    "valueString": report.get("doctor_review", {}).get("comments", "")
                }
            ]
        }
        
        entries.append({
            "resource": fhir_resource
        })
        
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": entries
    }
