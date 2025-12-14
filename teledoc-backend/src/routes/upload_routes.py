from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from src.security.rbac import require_role
from src.db.gridfs_utils import upload_file_to_gridfs, download_file_from_gridfs
from src.services.ocr import extract_text_from_image
from src.db.client import get_database
from bson import ObjectId

router = APIRouter(prefix="/patients", tags=["Uploads"])

async def process_ocr(file_id: ObjectId, content: bytes):
    text = extract_text_from_image(content)
    if text:
        db = get_database()
        await db.uploads.update_one(
            {"file_id": file_id},
            {"$set": {"ocr_text": text}}
        )

@router.post("/{patient_id}/uploads")
async def upload_file(
    patient_id: str, 
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    user: dict = Depends(require_role(["patient", "admin"]))
):
    if user["role"] == "patient" and user["patient_id"] != patient_id:
        raise HTTPException(status_code=403, detail="Cannot upload for other patient")

    # Read content for OCR before upload (since upload consumes stream)
    content = await file.read()
    await file.seek(0)
    
    file_id = await upload_file_to_gridfs(file, patient_id, user["sub"])
    
    # Trigger OCR in background
    background_tasks.add_task(process_ocr, file_id, content)
    
    return {"file_id": str(file_id)}

@router.get("/{patient_id}/uploads/{file_id}")
async def get_file(
    patient_id: str, 
    file_id: str, 
    user: dict = Depends(require_role(["patient", "doctor", "admin"]))
):
    if user["role"] == "patient" and user["patient_id"] != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    try:
        oid = ObjectId(file_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid file ID")

    grid_out = await download_file_from_gridfs(oid)
    if not grid_out:
        raise HTTPException(status_code=404, detail="File not found")
        
    return StreamingResponse(grid_out, media_type=grid_out.metadata["contentType"])
