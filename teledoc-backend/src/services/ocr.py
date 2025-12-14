import logging
from io import BytesIO
from PIL import Image

logger = logging.getLogger("teledoc")

try:
    import pytesseract
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False

def extract_text_from_image(image_bytes: bytes) -> str:
    if not HAS_TESSERACT:
        logger.warning("Tesseract not available, skipping OCR")
        return None
    
    try:
        image = Image.open(BytesIO(image_bytes))
        text = pytesseract.image_to_string(image)
        return text.strip()
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        return None
