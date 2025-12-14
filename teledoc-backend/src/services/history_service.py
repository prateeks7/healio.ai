from src.db.client import get_database
from langchain_google_genai import ChatGoogleGenerativeAI
from src.config import get_settings
import os

settings = get_settings()
os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY

llm = ChatGoogleGenerativeAI(
    model="gemini-flash-latest",
    temperature=0.0,
    google_api_key=settings.GEMINI_API_KEY
)

async def get_patient_keywords(patient_id: str) -> list[str]:
    """
    Aggregates all unique keywords from patient's past chats and uploads.
    """
    db = get_database()
    keywords = set()
    
    # Fetch from chats
    async for chat in db.chats.find({"patient_id": patient_id}, {"keywords": 1}):
        if chat.get("keywords"):
            keywords.update(chat["keywords"])
            
    # Fetch from uploads (if we store keywords there, otherwise we might rely on filenames/OCR)
    # For now, let's assume uploads might have keywords or we just use filenames
    async for upload in db.uploads.find({"patient_id": patient_id}, {"filename": 1}):
        keywords.add(upload["filename"])
        
    return list(keywords)

async def select_relevant_keywords(query: str, all_keywords: list[str]) -> list[str]:
    """
    Uses LLM to select keywords from the list that are relevant to the current query.
    """
    if not all_keywords:
        return []
        
    prompt = f"""
    You are a helpful assistant.
    
    Task: Identify which of the following keywords are relevant to the user's current query.
    User Query: "{query}"
    Available Keywords: {", ".join(all_keywords)}
    
    Output ONLY a comma-separated list of the relevant keywords. If none are relevant, output "NONE".
    """
    
    response = await llm.ainvoke(prompt)
    content = response.content.strip()
    
    if content == "NONE":
        return []
        
    selected = [k.strip() for k in content.split(",")]
    # Filter to ensure they actually exist in our list (hallucination check)
    valid_selected = [k for k in selected if k in all_keywords]
    
    return valid_selected

async def build_extended_context(patient_id: str, query: str) -> str:
    """
    Builds a context string containing relevant past chat summaries and file info.
    """
    all_keywords = await get_patient_keywords(patient_id)
    relevant_keywords = await select_relevant_keywords(query, all_keywords)
    
    if not relevant_keywords:
        return "No relevant past context found."
        
    db = get_database()
    context_parts = []
    
    # Fetch relevant chats
    # We use $in for simple matching if any keyword matches
    # A more advanced way would be text search, but let's stick to keyword matching for now
    cursor = db.chats.find(
        {
            "patient_id": patient_id,
            "keywords": {"$in": relevant_keywords}
        }
    ).limit(5)
    
    async for chat in cursor:
        summary = chat.get("summary", "N/A")
        date = chat.get("created_at", "Unknown Date")
        context_parts.append(f"- Past Chat ({date}): {summary}")
        
    # Fetch relevant uploads
    # Assuming we might match filenames or if we had keywords on uploads
    # For now, let's just search filenames
    cursor = db.uploads.find(
        {
            "patient_id": patient_id,
            "filename": {"$in": relevant_keywords} # Exact match on filename if it was a keyword
        }
    ).limit(3)
    
    async for upload in cursor:
        ocr = upload.get("ocr_text", "")[:200] # Truncate
        context_parts.append(f"- File '{upload['filename']}': {ocr}...")
        
    if not context_parts:
        return "No relevant details found in history despite keyword match."
        
    return "Relevant Historical Context:\n" + "\n".join(context_parts)
