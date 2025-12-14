import google.generativeai as genai
import os
from src.config import get_settings

settings = get_settings()
api_key = settings.GEMINI_API_KEY

if not api_key:
    print("Error: GEMINI_API_KEY not found in settings.")
    exit(1)

genai.configure(api_key=api_key)

print("Listing available models...")
try:
    for m in genai.list_models():
        # Access attributes directly without trying to print the whole object if it causes issues
        try:
            name = m.name
            methods = m.supported_generation_methods
            print(f"Name: {name}")
            print(f"Methods: {methods}")
            print("-" * 20)
        except Exception as inner_e:
            print(f"Skipping a model due to error: {inner_e}")
except Exception as e:
    print(f"Error listing models: {e}")
