import google.generativeai as genai
from src.config import get_settings
import time
import logging

logger = logging.getLogger("teledoc")
settings = get_settings()

genai.configure(api_key=settings.GEMINI_API_KEY)

class GeminiAdapter:
    def __init__(self, model_name="gemini-flash-latest"):
        self.model = genai.GenerativeModel(model_name)
        
    def generate(self, prompt: str, retries=3) -> str:
        for attempt in range(retries):
            try:
                response = self.model.generate_content(prompt)
                return response.text
            except Exception as e:
                logger.warning(f"Gemini generation failed (attempt {attempt+1}/{retries}): {e}")
                time.sleep(2 ** attempt) # Exponential backoff
        raise Exception("Gemini generation failed after retries")

# Simple wrapper to make it look like a LangChain LLM if needed by CrewAI, 
# but for this simplified version we might just use it directly or via CrewAI's built-in support if configured.
# However, the prompt implies we are building a "small adapter".
# We will use this in our Agent classes.
