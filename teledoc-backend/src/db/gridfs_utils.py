import hashlib
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from src.db.client import get_database
from fastapi import UploadFile

async def get_gridfs():
    db = get_database()
    return AsyncIOMotorGridFSBucket(db)

async def upload_file_to_gridfs(file: UploadFile, patient_id: str, user_id: str):
    db = get_database()
    fs = await get_gridfs()
    
    # Calculate checksum
    content = await file.read()
    checksum = hashlib.sha256(content).hexdigest()
    await file.seek(0) # Reset cursor
    
    # Check for duplicates
    existing = await db.uploads.find_one({"checksum": checksum, "patient_id": patient_id})
    if existing:
        return existing["file_id"]
    
    # Upload to GridFS
    grid_in = fs.open_upload_stream(
        file.filename,
        metadata={"contentType": file.content_type}
    )
    await grid_in.write(content)
    await grid_in.close()
    
    file_id = grid_in._id
    
    # Store metadata in 'uploads' collection
    upload_doc = {
        "file_id": file_id,
        "patient_id": patient_id,
        "uploader_user_id": user_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "checksum": checksum,
        "ocr_text": None, # Populated later
        "created_at": grid_in.upload_date
    }
    await db.uploads.insert_one(upload_doc)
    
    return file_id

async def download_file_from_gridfs(file_id):
    fs = await get_gridfs()
    try:
        grid_out = await fs.open_download_stream(file_id)
        return grid_out
    except Exception:
        return None
