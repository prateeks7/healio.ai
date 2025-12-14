from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from src.security.rbac import require_role
from src.db.client import get_database
from src.services.pdf_service import generate_report_pdf

router = APIRouter(prefix="/patients", tags=["Patient"])

@router.get("/{patient_id}/reports")
async def list_my_reports(
    patient_id: str,
    user: dict = Depends(require_role(["patient"]))
):
    if user["patient_id"] != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    db = get_database()
    cursor = db.reports.find({"patient_id": patient_id})
    reports = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        
        # Embed Doctor Details if reviewed
        if doc.get("reviewed") and doc.get("doctor_review", {}).get("reviewed_by"):
            doctor_id = doc["doctor_review"]["reviewed_by"]
            doctor = await db.users.find_one({"user_id": doctor_id})
            if doctor:
                doc["doctor_details"] = {
                    "name": doctor.get("name", "Unknown Doctor"),
                    "specialty": doctor.get("doctor_profile", {}).get("specialty", "General Practitioner"),
                    "bio": doctor.get("doctor_profile", {}).get("bio", ""),
                    "experience_years": doctor.get("doctor_profile", {}).get("experience_years", 0),
                    "verified": doctor.get("doctor_profile", {}).get("verified", False)
                }
                
        reports.append(doc)
    return reports

@router.get("/{patient_id}/reports/{report_id}")
async def get_my_report(
    patient_id: str,
    report_id: str,
    user: dict = Depends(require_role(["patient"]))
):
    if user["patient_id"] != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    db = get_database()
    report = await db.reports.find_one({"report_id": report_id, "patient_id": patient_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    # Mark as read by patient if it was reviewed
    if report.get("reviewed") and not report.get("patient_read", False):
        await db.reports.update_one(
            {"report_id": report_id},
            {"$set": {"patient_read": True}}
        )
        report["patient_read"] = True
        
    # Embed Doctor Details if reviewed
    if report.get("reviewed") and report.get("doctor_review", {}).get("reviewed_by"):
        doctor_id = report["doctor_review"]["reviewed_by"]
        doctor = await db.users.find_one({"user_id": doctor_id})
        if doctor:
            report["doctor_details"] = {
                "name": doctor.get("name", "Unknown Doctor"),
                "specialty": doctor.get("doctor_profile", {}).get("specialty", "General Practitioner"),
                "bio": doctor.get("doctor_profile", {}).get("bio", ""),
                "verified": doctor.get("doctor_profile", {}).get("verified", False)
            }
        
    report["_id"] = str(report["_id"])
    return report

@router.get("/{patient_id}/reports/{report_id}/pdf")
async def download_report_pdf(
    patient_id: str,
    report_id: str,
    user: dict = Depends(require_role(["patient", "doctor"]))
):
    # Allow if user is the patient OR if user is a doctor
    if user["role"] == "patient" and user["patient_id"] != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    db = get_database()
    report = await db.reports.find_one({"report_id": report_id, "patient_id": patient_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Fetch patient name from DB to ensure it's up to date
    user_doc = await db.users.find_one({"patient_id": patient_id})
    patient_name = user_doc.get("name", "Patient") if user_doc else "Patient"
    
    pdf_buffer = generate_report_pdf(report, patient_name)
    
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=report_{report_id}.pdf"}
    )

from pydantic import BaseModel
class ProfileUpdate(BaseModel):
    name: str
    age: int
    sex: str

@router.put("/{patient_id}/profile")
async def update_profile(
    patient_id: str,
    profile: ProfileUpdate,
    user: dict = Depends(require_role(["patient"]))
):
    if user["patient_id"] != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    db = get_database()
    
    update_data = {
        "name": profile.name,
        "age": profile.age,
        "sex": profile.sex
    }
    
    # Update the user document where patient_id matches
    result = await db.users.update_one(
        {"patient_id": patient_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"status": "success", "profile": update_data}
