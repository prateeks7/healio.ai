from fastapi import APIRouter, Depends, HTTPException
from src.security.rbac import require_role
from src.db.client import get_database
from src.models.chats import Chat

router = APIRouter(prefix="/chats", tags=["Chats"])

@router.get("/")
async def get_chats(user: dict = Depends(require_role(["patient", "doctor", "admin"]))):
    db = get_database()
    
    query = {}
    if user["role"] == "patient":
        query["patient_id"] = user["patient_id"]
        
    cursor = db.chats.find(query).sort("created_at", -1)
    chats = await cursor.to_list(length=100)
    
    # Filter out empty chats (no messages or only system messages)
    valid_chats = []
    for chat in chats:
        # Check if chat has messages that are NOT system messages
        has_real_messages = False
        if "messages" in chat and chat["messages"]:
            for msg in chat["messages"]:
                if msg.get("role") != "system":
                    has_real_messages = True
                    break
        
        if has_real_messages:
            if "_id" in chat:
                chat["_id"] = str(chat["_id"])
            valid_chats.append(chat)
            
    return valid_chats

@router.get("/{chat_id}")
async def get_chat(
    chat_id: str,
    user: dict = Depends(require_role(["patient", "doctor", "admin"]))
):
    db = get_database()
    chat = await db.chats.find_one({"chat_id": chat_id})
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    # Access control
    if user["role"] == "patient" and chat["patient_id"] != user["patient_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Convert ObjectId to str if needed (though chat_id is UUID)
    if "_id" in chat:
        chat["_id"] = str(chat["_id"])
        
    return chat
