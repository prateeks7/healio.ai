from src.services.pdf_service import generate_report_pdf
import os

def test_pdf_gen():
    mock_report = {
        "report_id": "REP-12345",
        "patient_summary": "Patient presented with **severe headache** starting 2 days ago. No history of trauma.",
        "doctor_report": {
            "urgency": "Routine",
            "analyzed_files": ["MRI_Scan_Head.pdf - Normal", "Blood_Test.pdf - High WBC"],
            "assessment": {
                "primary_diagnosis": {"name": "Migraine", "confidence": 0.85},
                "differentials": [{"name": "Tension Headache", "confidence": 0.4}]
            },
            "llm_rationale": "Symptoms are unilateral, pulsating, and accompanied by photophobia, which is classic for migraine.",
            "treatment_plan": "1. Rest in a dark room.\n2. Take Ibuprofen 400mg.\n3. Hydrate well.",
            "plan_recommendations": ["Avoid caffeine", "Keep a headache diary"],
            "pertinent_history": ["History of migraines in mother", "No allergies"],
            "red_flags": ["Sudden onset (ruled out)"]
        }
    }
    
    print("Generating PDF...")
    pdf_buffer = generate_report_pdf(mock_report, "John Doe")
    
    with open("test_report_v4.pdf", "wb") as f:
        f.write(pdf_buffer.getvalue())
    
    print("PDF generated: test_report_v4.pdf")

if __name__ == "__main__":
    test_pdf_gen()
