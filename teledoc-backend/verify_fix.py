import requests
import json
from PIL import Image, ImageDraw
import io
import time

BASE_URL = "http://localhost:8000"
EMAIL = "test_patient_verify_2@example.com" # Changed email to avoid conflict if previous run half-succeeded
PASSWORD = "password123"

def get_token():
    # Try login
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if resp.status_code == 200:
        return resp.json()["access_token"]
    
    # Register if failed
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": EMAIL, 
        "password": PASSWORD, 
        "role": "patient",
        "name": "Test Patient Verify"
    })
    if resp.status_code == 200:
        # Login again
        resp = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        return resp.json()["access_token"]
    else:
        print("Login/Register failed:", resp.text)
        return None

try:
    print("1. Authenticating...")
    token = get_token()
    if not token:
        exit(1)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    user_info = resp.json()
    patient_id = user_info["patient_id"]
    print(f"   Authenticated as patient: {patient_id}")

    print("2. Creating and Uploading Image...")
    img = Image.new('RGB', (200, 100), color = (73, 109, 137))
    d = ImageDraw.Draw(img)
    d.text((10,10), "Patient has a FRACTURE in left arm", fill=(255,255,0))
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    files = {'file': ('xray_verify.png', img_byte_arr, 'image/png')}
    resp = requests.post(f"{BASE_URL}/patients/{patient_id}/uploads", headers=headers, files=files)
    if resp.status_code != 200:
        print(f"   Upload failed: {resp.text}")
        exit(1)
        
    file_id = resp.json()["file_id"]
    print(f"   File uploaded. ID: {file_id}")

    print("3. Starting Chat...")
    resp = requests.post(f"{BASE_URL}/agents/interaction/start", headers=headers)
    chat_id = resp.json()["chat_id"]
    print(f"   Chat started. ID: {chat_id}")

    print("4. Sending Message with Attachment...")
    payload = {
        "message": "Doctor, please look at my X-ray. It hurts a lot.",
        "attachments": [file_id]
    }
    resp = requests.post(f"{BASE_URL}/agents/interaction/{chat_id}/message", headers=headers, json=payload)
    if resp.status_code != 200:
        print(f"   Message send failed: {resp.text}")
        exit(1)
    print("   Message sent.")

    print("5. Running Medical Crew (Report)...")
    payload = {
        "chat_id": chat_id,
        "diagnostic": True
    }
    # This might take time
    resp = requests.post(f"{BASE_URL}/agents/report/run", headers=headers, json=payload)
    if resp.status_code != 200:
        print(f"   Report generation failed: {resp.text}")
        exit(1)
        
    report = resp.json()
    print("   Report generated.")
    
    report_str = json.dumps(report).lower()
    if "fracture" in report_str:
        print("SUCCESS: The report mentions the fracture found in the image!")
    else:
        print("FAILURE: The report does NOT mention the fracture.")
        print("Report content snippet:", str(report)[:500])

except Exception as e:
    print(f"An error occurred: {e}")
