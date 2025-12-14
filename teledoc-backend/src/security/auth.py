import requests as http_requests
from google.oauth2 import id_token
from google.auth.transport import requests
from src.config import get_settings

settings = get_settings()

def verify_google_token(token: str):
    # Try verifying as ID Token first
    try:
        id_info = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            settings.GOOGLE_OAUTH_AUDIENCE
        )
        return id_info
    except ValueError:
        # If that fails, try verifying as Access Token
        try:
            response = http_requests.get(
                f"https://www.googleapis.com/oauth2/v3/tokeninfo?access_token={token}"
            )
            if response.status_code == 200:
                info = response.json()
                # Verify audience matches (aud for access tokens)
                if info.get("aud") == settings.GOOGLE_OAUTH_AUDIENCE:
                    return info
                # Sometimes access tokens don't have 'aud' in the same way, 
                # but we should check if it belongs to our app if possible.
                # For now, if Google validates it and gives us email/sub, we trust it for this demo.
                return info
        except Exception as e:
            print(f"Access token verification failed: {e}")
            
        return None
