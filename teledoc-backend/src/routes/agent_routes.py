from fastapi import APIRouter, Depends, HTTPException, Body
from src.security.rbac import require_role
from src.db.client import get_database
from src.models.chats import Chat, Message
from src.agents.interaction_agent import InteractionAgent
from src.agents.interaction_agent import InteractionAgent
from src.services.history_service import build_extended_context
from src.services.keywords import extract_keywords
import uuid
from datetime import datetime

router = APIRouter(prefix="/agents", tags=["Agents"])

interaction_agent = InteractionAgent()

@router.post("/interaction/start")
async def start_chat(user: dict = Depends(require_role(["patient"]))):
    chat_id = uuid.uuid4().hex
    new_chat = Chat(
        chat_id=chat_id,
        patient_id=user["patient_id"]
    )
    db = get_database()
    print(f"DEBUG: Creating new chat {chat_id} for patient {user['patient_id']}")
    result = await db.chats.insert_one(new_chat.model_dump())
    print(f"DEBUG: Chat insert acknowledged: {result.acknowledged}")
    return {"chat_id": chat_id}

@router.post("/interaction/{chat_id}/message")
async def chat_message(
    chat_id: str, 
    message: str = Body(..., embed=True), 
    attachments: list[str] = Body([], embed=True),
    user: dict = Depends(require_role(["patient"]))
):
    print(f"DEBUG: Received message request")
    print(f"DEBUG: message = {message}")
    print(f"DEBUG: attachments = {attachments}")
    print(f"DEBUG: attachments type = {type(attachments)}")
    print(f"DEBUG: attachments length = {len(attachments)}")
    
    db = get_database()
    chat_doc = await db.chats.find_one({"chat_id": chat_id, "patient_id": user["patient_id"]})
    if not chat_doc:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Append user message
    user_msg = Message(role="user", content=message, attachments=attachments)
    print(f"DEBUG: Appending user message to chat {chat_id}")
    await db.chats.update_one(
        {"chat_id": chat_id},
        {"$push": {"messages": user_msg.model_dump()}}
    )
    
    # Build context
    history_doc = await db.medical_histories.find_one({"patient_id": user["patient_id"]})
    history_str = str(history_doc.get("history", {})) if history_doc else "No history provided."
    
    transcript = "\n".join([f"{m['role']}: {m['content']}" for m in chat_doc['messages']] + [f"user: {message}"])
    
    # Use new HistoryService for context
    context = await build_extended_context(user["patient_id"], message)
    
    # Fetch file summaries from current conversation attachments
    all_attachments = []
    for m in chat_doc['messages']:
        if 'attachments' in m and m['attachments']:
            all_attachments.extend(m['attachments'])
    if attachments:  # Add current message attachments
        all_attachments.extend(attachments)
    
    print(f"DEBUG: Found {len(all_attachments)} total attachments in conversation")
    
    if all_attachments:
        from bson import ObjectId
        context += "\n\n=== UPLOADED FILES IN THIS CONVERSATION ===\n"
        for file_id in all_attachments:
            try:
                upload_doc = await db.uploads.find_one({"file_id": ObjectId(file_id)})
                if upload_doc:
                    filename = upload_doc.get("filename", "Unknown File")
                    summary = upload_doc.get("image_summary", "Processing...")
                    print(f"DEBUG: File {filename} - Summary length: {len(summary) if summary else 0}")
                    if summary and summary != "Processing...":
                        context += f"\nFile: {filename}\nAnalysis: {summary}\n"
                    else:
                        print(f"DEBUG: Skipping file {filename} - summary not ready")
            except Exception as e:
                print(f"Error fetching file {file_id} for chat context: {e}")
    
    print(f"DEBUG: Final context length: {len(context)} chars")
    
    # Run Agent
    agent_reply = interaction_agent.run(context, history_str, transcript)
    
    # Append agent message
    agent_msg = Message(role="agent", content=agent_reply)
    
    # Update summary and keywords - REMOVED per user request (only at end)
    # new_keywords = extract_keywords(message + " " + agent_reply)
    
    await db.chats.update_one(
        {"chat_id": chat_id},
        {
            "$push": {"messages": agent_msg.model_dump()},
            # "$addToSet": {"keywords": {"$each": new_keywords}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {
        "reply": agent_reply,
        "keywords": [] # Empty for now, will be populated at report time
    }

@router.post("/diagnosis/run")
async def run_diagnosis(
    payload: dict = Body(...), # {chat_id: ...}
    user: dict = Depends(require_role(["patient"]))
):
    chat_id = payload.get("chat_id")
    
    db = get_database()
    chat_doc = await db.chats.find_one({"chat_id": chat_id, "patient_id": user["patient_id"]})
    if not chat_doc:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    history_doc = await db.medical_histories.find_one({"patient_id": user["patient_id"]})
    history_str = str(history_doc.get("history", {})) if history_doc else "No history provided."
    transcript = "\n".join([f"{m['role']}: {m['content']}" for m in chat_doc['messages']])
    
    # Build Extended Context
    # We use the entire transcript as the query to find relevant history
    extended_context = await build_extended_context(user["patient_id"], transcript)
    
    # Collect all attachments
    all_attachments = []
    for m in chat_doc['messages']:
        if 'attachments' in m and m['attachments']:
            all_attachments.extend(m['attachments'])
    
    # Fetch file summaries from database and inject into context
    file_summaries_text = ""
    if all_attachments:
        from bson import ObjectId
        file_summaries_text = "\n\n=== UPLOADED FILES ===\n"
        for file_id in all_attachments:
            try:
                upload_doc = await db.uploads.find_one({"file_id": ObjectId(file_id)})
                if upload_doc:
                    filename = upload_doc.get("filename", "Unknown File")
                    summary = upload_doc.get("image_summary", "No summary available")
                    file_summaries_text += f"\nFile: {filename}\nSummary: {summary}\n"
            except Exception as e:
                print(f"Error fetching file {file_id}: {e}")
        
        # Append to extended context
        extended_context += file_summaries_text
            
    # Run Medical Crew
    from src.crew.medical_crew import MedicalCrew
    import json
    import re

    crew = MedicalCrew(user["patient_id"], history_str, transcript, attachment_ids=all_attachments, extended_context=extended_context)
    print(f"DEBUG: Starting CrewAI Diagnosis run for chat {chat_id}")
    
    import asyncio
    loop = asyncio.get_event_loop()
    result_raw = await loop.run_in_executor(None, crew.run)
    
    # Parse result
    try:
        json_str = ""
        # 1. Try finding Markdown JSON block
        json_match = re.search(r'```json\n(.*?)\n```', str(result_raw), re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # 2. Try finding the first outer JSON object
            text = str(result_raw)
            start_idx = text.find('{')
            end_idx = text.rfind('}')
            
            if start_idx != -1 and end_idx != -1:
                json_str = text[start_idx:end_idx+1]
            else:
                json_str = text

        try:
            result_json = json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"DEBUG: JSON decode failed: {e}")
            # Attempt to clean common issues like trailing commas
            if ",}" in json_str:
                json_str = json_str.replace(",}", "}")
            if ",]" in json_str:
                json_str = json_str.replace(",]", "]")
            result_json = json.loads(json_str)
            
        if "doctor_report" not in result_json:
            raise ValueError("Invalid report structure: 'doctor_report' key missing")
            
        report = result_json["doctor_report"]
        
        # --- Persist Report (Merged from run_report) ---
        report_id = uuid.uuid4().hex
        report_doc = {
            "report_id": report_id,
            "patient_id": user["patient_id"],
            "chat_id": chat_id,
            "doctor_report": result_json["doctor_report"],
            "patient_summary": result_json.get("patient_summary", "No summary provided."),
            "chat_title": result_json.get("chat_title", "Medical Consultation"),
            "keywords": result_json.get("keywords", []),
            "reviewed": False,
            "created_at": datetime.utcnow()
        }
        
        print(f"DEBUG: Inserting report {report_id} for chat {chat_id}")
        await db.reports.insert_one(report_doc)
        
        # Reply with Cure/Treatment Plan
        treatment_plan = result_json["doctor_report"].get("treatment_plan", "Please consult a doctor for a detailed treatment plan.")
        
        cure_msg = Message(
            role="agent", 
            content=f"**Diagnosis Complete.**\n\n**Treatment Plan:**\n{treatment_plan}\n\nI have generated a detailed report for you.",
            report_id=report_id
        )
        
        await db.chats.update_one(
            {"chat_id": chat_id},
            {"$push": {"messages": cure_msg.model_dump()}}
        )

        # Update Chat with Summary and Keywords
        print(f"DEBUG: Updating Chat {chat_id} with summary and keywords")
        await db.chats.update_one(
            {"chat_id": chat_id},
            {
                "$set": {
                    "title": result_json.get("chat_title", "Medical Consultation"),
                    "summary": result_json.get("patient_summary", ""),
                    "keywords": result_json.get("keywords", []),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Map to Diagnostic interface (for UI preview)
        diagnostic = {
            "primary_hypothesis": {
                "name": report["assessment"]["primary_diagnosis"]["name"],
                "confidence": report["assessment"]["primary_diagnosis"]["confidence"]
            },
            "differentials": [
                {"name": d["name"], "confidence": d["confidence"]} 
                for d in report["assessment"]["differentials"]
            ],
            "red_flags": report["red_flags"],
            "urgency": report["urgency"],
            "rationale": report["llm_rationale"]
        }
        
        # Return combined data
        return {
            "diagnostic": diagnostic,
            "report_id": report_id,
            "chat_title": result_json.get("chat_title"),
            "patient_summary": result_json.get("patient_summary"),
            "keywords": result_json.get("keywords", [])
        }

    except Exception as e:
        print(f"Failed to parse CrewAI result: {e}")
        print(f"Raw output causing error: {str(result_raw)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate diagnosis: {str(e)}")

