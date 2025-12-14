from src.db.client import get_database
from src.services.keywords import extract_keywords

async def get_relevant_context(patient_id: str, current_text: str) -> str:
    db = get_database()
    
    # 1. Extract keywords from current text
    keywords = extract_keywords(current_text, top_n=5)
    
    context_parts = []
    
    # 2. Search past chats
    if keywords:
        # Simple text search on messages
        cursor = db.chats.find(
            {
                "patient_id": patient_id, 
                "$text": {"$search": " ".join(keywords)}
            }
        ).limit(3)
        
        async for chat in cursor:
            context_parts.append(f"Past Chat Summary: {chat.get('summary', 'N/A')}")
            
        # Search uploads (OCR)
        cursor = db.uploads.find(
            {
                "patient_id": patient_id,
                "$text": {"$search": " ".join(keywords)}
            }
        ).limit(3)
        
        async for upload in cursor:
            if upload.get('ocr_text'):
                context_parts.append(f"Document ({upload['filename']}): {upload['ocr_text'][:200]}...")

    # Fallback: if no keywords or no results, just get last chat summary
    if not context_parts:
        last_chat = await db.chats.find_one(
            {"patient_id": patient_id},
            sort=[("updated_at", -1)]
        )
        if last_chat:
            context_parts.append(f"Previous Chat Summary: {last_chat.get('summary', 'N/A')}")

    return "\n".join(context_parts)
