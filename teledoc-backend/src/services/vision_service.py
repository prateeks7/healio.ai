
import logging
from src.config import get_settings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema.messages import HumanMessage
import base64

logger = logging.getLogger("teledoc")

# Configure LLM
settings = get_settings()
llm = ChatGoogleGenerativeAI(
    model="gemini-flash-latest",
    temperature=0.2, # Low temp for factual description
    google_api_key=settings.GEMINI_API_KEY
)

import io
from pydantic import BaseModel
from pypdf import PdfReader 

async def analyze_image(image_bytes: bytes, filename: str = "image.png") -> str:
    """
    Uses Gemini Vision to generate a detailed clinical summary of the image or PDF.
    Replaces legacy OCR.
    """
    try:
        # Determine mime type (simple heuristic)
        if filename.lower().endswith(".pdf"):
            logger.info("Detected PDF. Extracting text via pypdf...")
            try:
                reader = PdfReader(io.BytesIO(image_bytes))
                text_content = ""
                for page in reader.pages:
                    text_content += page.extract_text() + "\n"
                
                # Send extracted text to LLM for clinical summary
                logger.info(f"Extracted {len(text_content)} chars from PDF. Summarizing...")
                message = HumanMessage(
                    content=f"""
                    Analyze this medical document text extracted from a PDF.
                    Provide a detailed clinical summary including:
                    1. Patient Name/ID (if identifying info is safe to share, otherwise redact).
                    2. Key Findings (Labs, Diagnosis, Meds).
                    3. Dates and Context.
                    
                    Text Content:
                    {text_content[:10000]}  # Truncate to avoid context limits
                    """
                )
                response = await llm.ainvoke([message])
                summary = response.content.strip()
                logger.info(f"PDF Summary Result: {summary[:50]}...")
                return summary

            except Exception as pdf_err:
                logger.error(f"PDF Extraction failed: {pdf_err}")
                return f"Error reading PDF: {str(pdf_err)}"

        # Encode bytes to base64 for Images
        b64_data = base64.b64encode(image_bytes).decode('utf-8')
        mime_type = "image/png"
        if filename.lower().endswith(".jpg") or filename.lower().endswith(".jpeg"):
            mime_type = "image/jpeg"
            
        logger.info(f"Sending image ({len(image_bytes)} bytes) to Gemini Vision...")
        
        message = HumanMessage(
            content=[
                {
                    "type": "text", 
                    "text": """
                    Analyze this medical image or document. 
                    Provide a detailed summary of:
                    1. Text content (OCR).
                    2. Visual findings (e.g., 'transverse fracture of phalanx', 'blister on heel').
                    3. Document type (e.g., 'X-ray', 'Lab Report', 'Chat Screenshot').
                    
                    Be concise but comprehensive. Do not hallucinate.
                    """
                },
                {
                    "type": "image_url",
                    "image_url": f"data:{mime_type};base64,{b64_data}"
                }
            ]
        )
        
        # Invoke LLM
        response = await llm.ainvoke([message])
        summary = response.content.strip()
        
        logger.info(f"Gemini Vision Result: {summary[:50]}...")
        return summary

    except Exception as e:
        logger.error(f"Vision Analysis failed: {e}")
        return "" 
