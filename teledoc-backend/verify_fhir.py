import requests
import json

# Mock a doctor token (this would normally be obtained via login)
# Since we can't easily mock the full auth flow here without a running server and valid Google token,
# we will assume the dev login endpoint exists or we can skip auth for this test if we disable it temporarily.
# However, we implemented `require_role`.
#
# Let's try to use the `dev_login` endpoint if it exists (it was in `auth_routes.py`).

BASE_URL = "http://localhost:8000"

def test_fhir_endpoint():
    print("Testing FHIR Endpoint...")
    
    # 1. Login as Doctor (using dev login)
    # We need to make sure a doctor exists.
    # The dev login creates a user if not exists, but defaults to patient.
    # We might need to manually insert a doctor or update one.
    
    # For this verification script, we'll just print the instructions to run it manually
    # or we can try to hit the endpoint and see if it returns 401 (which means it's protected).
    
    try:
        response = requests.get(f"{BASE_URL}/doctor/fhir/DiagnosticReport")
        if response.status_code == 401:
            print("✅ Endpoint is protected (401 Unauthorized)")
        else:
            print(f"⚠️ Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    test_fhir_endpoint()
