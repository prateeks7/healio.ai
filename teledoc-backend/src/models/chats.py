from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Message(BaseModel):
    role: str  # "user" or "agent"
    content: str
    timestamp: datetime = datetime.utcnow()
    attachments: List[str] = []  # List of file_ids
    report_id: Optional[str] = None

class Chat(BaseModel):
    chat_id: str
    patient_id: str
    messages: List[Message] = []
    summary: str = ""
    keywords: List[str] = []
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()
