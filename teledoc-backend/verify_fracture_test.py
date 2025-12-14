import requests
import json
from PIL import Image, ImageDraw
import io
import time

BASE_URL = "http://localhost:8000"
EMAIL = "test_patient_fracture@example.com"
PASSWORD = "password123"

def get_token_and_id():
    # Use Dev Login
    resp = requests.post(f"{BASE_URL}/auth/dev/login", json={"email": EMAIL})
    if resp.status_code == 200:
        data = resp.json()
        return data["access_token"], data["profile"]["patient_id"]
    else:
        print("Dev Login failed:", resp.text)
        return None, None

token, patient_id = get_token_and_id()
if not token:
    exit(1)

print("Token obtained.")
print("Patient ID:", patient_id)
headers = {"Authorization": f"Bearer {token}"}

# 1. Generate Dummy Fracture Image
print("Generating Image...")
img = Image.new('RGB', (500, 100), color = (0, 0, 0))
d = ImageDraw.Draw(img)
d.text((10,10), "RADIOLOGY FINDING: DISPLACED FRACTURE OF INDEX FINGER PIP JOINT", fill=(255,255,255))

img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='PNG')
img_byte_arr.seek(0)

# 2. Upload the file
print("Uploading Image...")
files = {'file': ('index_finger_fracture.png', img_byte_arr, 'image/png')}
resp = requests.post(f"{BASE_URL}/patients/{patient_id}/uploads", headers=headers, files=files)
if resp.status_code != 200:
    print("Upload failed:", resp.text)
    exit(1)
fracture_file_id = resp.json()["file_id"]
print("Fracture File ID:", fracture_file_id)

# 3. Conversation 1: Initial Diagnosis
print("\n--- Starting Conversation 1 (Diagnosis) ---")
resp = requests.post(f"{BASE_URL}/agents/interaction/start", headers=headers)
chat1_id = resp.json()["chat_id"]

# Send Message with Attachment
payload = {
    "message": "I fell and hurt my finger. Look at this X-ray.",
    "attachments": [fracture_file_id]
}
resp = requests.post(f"{BASE_URL}/agents/interaction/{chat1_id}/message", headers=headers, json=payload)
print("Agent Reply 1:", resp.json()["reply"])

# Run Diagnosis & Report
print("Generating Report 1...")
requests.post(f"{BASE_URL}/agents/diagnosis/run", json={"chat_id": chat1_id}, headers=headers)
requests.post(f"{BASE_URL}/agents/report/run", json={"chat_id": chat1_id, "diagnostic": {}}, headers=headers)
print("Report 1 Generated.")

# 4. Conversation 2: Follow-up (Memory Test)
print("\n--- Starting Conversation 2 (Follow-up) ---")
resp = requests.post(f"{BASE_URL}/agents/interaction/start", headers=headers)
chat2_id = resp.json()["chat_id"]

# Send Message (No history mentioned)
msg = "I am feeling pain in my index finger again."
print(f"User: {msg}")
resp = requests.post(f"{BASE_URL}/agents/interaction/{chat2_id}/message", json={"message": msg}, headers=headers)
reply = resp.json()["reply"]
print(f"Agent Reply 2: {reply}")

# Assertions
if "fracture" in reply.lower() or "broken" in reply.lower() or "injury" in reply.lower():
    print("\n[SUCCESS] Agent recalled the previous injury/fracture in the chat!")
else:
    print("\n[WARNING] Agent did not explicitly mention the fracture in the first reply.")

# Run Diagnosis & Report 2
print("Generating Report 2...")
requests.post(f"{BASE_URL}/agents/diagnosis/run", json={"chat_id": chat2_id}, headers=headers)
resp = requests.post(f"{BASE_URL}/agents/report/run", json={"chat_id": chat2_id, "diagnostic": {}}, headers=headers)
report2 = resp.json()
summary = report2["patient_summary"]
print(f"\nPatient Summary 2: {summary}")

if "fracture" in summary.lower() or "broken" in summary.lower():
    print("\n[SUCCESS] Report 2 cites the historical fracture!")
else:
    print("\n[FAILURE] Report 2 missed the history.")
