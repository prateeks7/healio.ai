# TeleDoc Backend

A multi-agent medical intake and report system backend built with FastAPI, MongoDB, and CrewAI (via Gemini).

## Overview

TeleDoc simulates a telemedicine workflow where:
1.  **Patient** logs in via Google.
2.  **Patient** fills out medical history and uploads documents (OCR enabled).
3.  **Interaction Agent** interviews the patient about their symptoms.
4.  **Diagnosis Agent** analyzes the chat and history to propose a diagnosis.
5.  **Report Agent** generates a doctor-ready report.
6.  **Doctor** reviews and approves the report.

## Tech Stack

-   **Language**: Python 3.11
-   **API**: FastAPI
-   **Database**: MongoDB (Motor async client) + GridFS for files
-   **Auth**: Google Sign-In (ID Token verification) + JWT
-   **Agents**: Custom agent loop using Gemini Pro
-   **OCR**: Tesseract (via `pytesseract`)

## Setup

### Prerequisites

-   Python 3.11+
-   MongoDB Instance (Atlas or local)
-   Google Cloud Project (for OAuth Client ID)
-   Google Gemini API Key

### Installation

1.  **Clone & Enter Directory**
    ```bash
    cd teledoc-backend
    ```

2.  **Create Virtual Environment**
    ```bash
    python -m venv .venv
    source .venv/bin/activate  # Windows: .venv\Scripts\activate
    ```

3.  **Install Dependencies**
    ```bashconda 
    pip install -r requirements.txt
    ```

4.  **Environment Variables**
    Create a `.env` file or export these variables:
    ```bash
    export MONGODB_URI="mongodb+srv://<user>:<pass>@cluster.mongodb.net/?retryWrites=true&w=majority"
    export JWT_SECRET="super-secret-key-change-me"
    export GOOGLE_OAUTH_AUDIENCE="<your-google-client-id>"
    export GEMINI_API_KEY="<your-gemini-api-key>"
    ```

5.  **Run the Server**
    ```bash
    uvicorn src.app:app --reload
    ```

## Usage Guide (HTTPie Examples)

### 1. Authentication
Exchange a Google ID Token for a JWT.
```bash
http POST :8000/auth/google/verify id_token="<GOOGLE_ID_TOKEN>"
# Response: { "jwt": "eyJ...", "profile": { ... } }
```
*Save the JWT for subsequent requests:* `export TOKEN="eyJ..."`

### 2. Medical History
Upsert patient history.
```bash
http PUT :8000/patients/<PATIENT_ID>/history \
    Authorization:"Bearer $TOKEN" \
    demographics:='{"age":30, "sex":"M", "height_cm":180, "weight_kg":75}' \
    allergies:='["penicillin"]' \
    medications:='[]' \
    conditions:='[]' \
    surgeries:='[]' \
    family_history:='[]' \
    social_history:='{"smoking":"no", "alcohol":"rare", "occupation":"dev", "activity_level":"moderate"}' \
    current_symptoms:='["headache"]' \
    additional_info="None"
```

### 3. Upload File
Upload a PDF or Image (OCR will run in background).
```bash
http --form POST :8000/patients/<PATIENT_ID>/uploads \
    Authorization:"Bearer $TOKEN" \
    file@/path/to/lab_result.png
```

### 4. Start Chat
Initialize a new interaction session.
```bash
http POST :8000/agents/interaction/start Authorization:"Bearer $TOKEN"
# Response: { "chat_id": "<CHAT_ID>" }
```

### 5. Send Message
Chat with the Interaction Agent.
```bash
http POST :8000/agents/interaction/<CHAT_ID>/message \
    Authorization:"Bearer $TOKEN" \
    message="I have a severe headache since morning."
```

### 6. Run Diagnosis
Trigger the diagnosis process.
```bash
http POST :8000/agents/diagnosis/run \
    Authorization:"Bearer $TOKEN" \
    chat_id="<CHAT_ID>"
```

### 7. Generate Report
Generate the final report.
```bash
http POST :8000/agents/report/run \
    Authorization:"Bearer $TOKEN" \
    chat_id="<CHAT_ID>" \
    diagnostic:='{...}' # Optional, usually passed from previous step or inferred
```

### 8. Doctor Review (Doctor Role Only)
List unreviewed reports.
```bash
http GET :8000/doctor/reports?reviewed=false Authorization:"Bearer $DOCTOR_TOKEN"
```

Mark as reviewed.
```bash
http PATCH :8000/doctor/reports/<REPORT_ID>/review \
    Authorization:"Bearer $DOCTOR_TOKEN" \
    reviewed:=true \
    comments="Looks accurate. Proceed with Tylenol."
```

## Safety Disclaimer
**This system is for educational and demonstration purposes only.**
It does not provide real medical advice. The "Diagnosis Agent" is an AI simulation and can hallucinate. In a real emergency, call emergency services immediately.
