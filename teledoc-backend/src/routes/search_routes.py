from fastapi import APIRouter, Depends, HTTPException
from src.security.rbac import require_role
from src.db.client import get_database

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("/chats")
async def search_chats(
    patient_id: str,
    q: str = None,
    user: dict = Depends(require_role(["doctor", "admin", "patient"]))
):
    if user["role"] == "patient" and user["patient_id"] != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    db = get_database()
    
    if not q:
        # Return all chats sorted by date
        cursor = db.chats.find({"patient_id": patient_id}).sort("updated_at", -1)
        results = []
        async for chat in cursor:
            # Remove _id
            if "_id" in chat: del chat["_id"]
            results.append(chat)
        return results

    # Search chats
    chat_cursor = db.chats.find(
        {"patient_id": patient_id, "$text": {"$search": q}},
        {"score": {"$meta": "textScore"}}
    ).sort([("score", {"$meta": "textScore"})])
    
    results = []
    async for chat in chat_cursor:
        results.append({
            "type": "chat",
            "id": chat["chat_id"],
            "summary": chat.get("summary"),
            "score": chat.get("score")
        })
        
    # Search uploads (OCR)
    upload_cursor = db.uploads.find(
        {"patient_id": patient_id, "$text": {"$search": q}},
        {"score": {"$meta": "textScore"}}
    ).sort([("score", {"$meta": "textScore"})])
    
    async for upload in upload_cursor:
        results.append({
            "type": "file",
            "id": str(upload["file_id"]),
            "filename": upload["filename"],
            "score": upload.get("score")
        })
        
    return results
