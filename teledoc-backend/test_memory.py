import requests
import json
import time

BASE_URL = "http://localhost:8000"
# Use the token from previous cells or login again
# Assuming 'token' and 'patient_id' are available from previous cells

def test_memory_and_report():
    print("--- Starting Memory & Report Test ---")
    
    # 1. Seed Past Chat
    print("1. Seeding Past Chat...")
    resp = requests.post(f"{BASE_URL}/agents/interaction/start", headers=headers)
    chat_id_1 = resp.json()["chat_id"]
    
    msg = "I have a severe allergy to Penicillin. It causes anaphylaxis."
    requests.post(f"{BASE_URL}/agents/interaction/{chat_id_1}/message", json={"message": msg}, headers=headers)
    
    # Force update summary/keywords (usually happens at end of chat or via background task)
    # For this test, we rely on the agent's immediate update or we might need to trigger it manually if we had an endpoint.
    # The current implementation updates summary/keywords at the END of a report generation. 
    # So let's generate a dummy report for this chat to "save" the memory.
    requests.post(f"{BASE_URL}/agents/diagnosis/run", json={"chat_id": chat_id_1}, headers=headers)
    requests.post(f"{BASE_URL}/agents/report/run", json={"chat_id": chat_id_1, "diagnostic": {}}, headers=headers)
    print("   Past chat seeded and summarized.")
    
    # 2. New Chat (Memory Test)
    print("2. Starting New Chat (Memory Test)...")
    resp = requests.post(f"{BASE_URL}/agents/interaction/start", headers=headers)
    chat_id_2 = resp.json()["chat_id"]
    
    # Ask about allergy
    msg = "What am I allergic to?"
    resp = requests.post(f"{BASE_URL}/agents/interaction/{chat_id_2}/message", json={"message": msg}, headers=headers)
    reply = resp.json()["reply"]
    print(f"   Agent Reply: {reply}")
    
    if "Penicillin" in reply:
        print("   SUCCESS: Agent remembered Penicillin allergy!")
    else:
        print("   WARNING: Agent did not mention Penicillin. Check HistoryService.")
        
    # 3. Report Generation & PDF Link
    print("3. Generating Report for New Chat...")
    # Add some symptoms
    requests.post(f"{BASE_URL}/agents/interaction/{chat_id_2}/message", json={"message": "I have a headache and fever."}, headers=headers)
    
    # Run Diagnosis
    resp = requests.post(f"{BASE_URL}/agents/diagnosis/run", json={"chat_id": chat_id_2}, headers=headers)
    diagnostic = resp.json()
    
    # Run Report
    resp = requests.post(f"{BASE_URL}/agents/report/run", json={"chat_id": chat_id_2, "diagnostic": diagnostic}, headers=headers)
    report_data = resp.json()
    
    if "report_id" in report_data:
        report_id = report_data["report_id"]
        print(f"   SUCCESS: Report generated with ID: {report_id}")
        
        # Verify PDF Link
        pdf_url = f"{BASE_URL}/patients/{patient_id}/reports/{report_id}/pdf"
        resp = requests.get(pdf_url, headers=headers)
        if resp.status_code == 200:
             print("   SUCCESS: PDF download endpoint works.")
        else:
             print(f"   FAILURE: PDF endpoint returned {resp.status_code}")
    else:
        print("   FAILURE: No report_id returned.")

# Run the test
# test_memory_and_report() 
