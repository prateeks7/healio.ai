import os
import pandas as pd
from pypdf import PdfReader
from io import BytesIO
from bson import ObjectId
from src.db.gridfs_utils import download_file_from_gridfs
from langchain.tools import Tool
from langchain_google_genai import ChatGoogleGenerativeAI
from src.config import get_settings
from PIL import Image
import base64

class FileAnalysisTool:
    def __init__(self):
        settings = get_settings()
        self.vision_llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.0
        )

    async def analyze_file(self, file_id: str) -> str:
        """
        Analyzes a file based on its type.
        - Images: Uses Gemini Vision to describe findings.
        - PDF: Extracts text.
        - Excel/CSV: Extracts data summary.
        """
        try:
            oid = ObjectId(file_id)
            grid_out = await download_file_from_gridfs(oid)
            if not grid_out:
                return f"Error: File {file_id} not found."

            content_type = grid_out.metadata.get("contentType", "")
            content = await grid_out.read()
            
            if content_type.startswith("image/"):
                return await self._analyze_image(content, content_type)
            elif content_type == "application/pdf":
                return self._read_pdf(content)
            elif content_type in ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"]:
                return self._read_excel_csv(content, content_type)
            else:
                return f"Unsupported file type: {content_type}"

        except Exception as e:
            return f"Error analyzing file {file_id}: {str(e)}"

    async def _analyze_image(self, content: bytes, mime_type: str) -> str:
        try:
            # Gemini Vision expects base64 encoded image or PIL image
            # For LangChain Google GenAI, we can pass message with image content
            from langchain_core.messages import HumanMessage
            
            image_data = base64.b64encode(content).decode("utf-8")
            
            message = HumanMessage(
                content=[
                    {"type": "text", "text": "Analyze this medical image in detail. Describe any abnormalities, findings, or relevant medical information."},
                    {"type": "image_url", "image_url": f"data:{mime_type};base64,{image_data}"}
                ]
            )
            
            response = await self.vision_llm.ainvoke([message])
            return f"[Image Analysis]: {response.content}"
        except Exception as e:
            return f"Image analysis failed: {str(e)}"

    def _read_pdf(self, content: bytes) -> str:
        try:
            reader = PdfReader(BytesIO(content))
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return f"[PDF Content]: {text[:5000]}..." # Truncate if too long
        except Exception as e:
            return f"PDF reading failed: {str(e)}"

    def _read_excel_csv(self, content: bytes, content_type: str) -> str:
        try:
            if "csv" in content_type:
                df = pd.read_csv(BytesIO(content))
            else:
                df = pd.read_excel(BytesIO(content))
            
            return f"[Data Summary]:\nColumns: {list(df.columns)}\nFirst 5 rows:\n{df.head().to_string()}"
        except Exception as e:
            return f"Data reading failed: {str(e)}"

# Create a wrapper function for the tool
file_tool_instance = FileAnalysisTool()

async def analyze_file_wrapper(file_id: str):
    return await file_tool_instance.analyze_file(file_id)
