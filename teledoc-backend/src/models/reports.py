from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

class Diagnosis(BaseModel):
    name: str
    confidence: float

class Assessment(BaseModel):
    primary_diagnosis: Diagnosis
    differentials: List[Diagnosis]

class DoctorReportContent(BaseModel):
    patient_id: str
    chief_complaint: str
    history_of_present_illness: str
    pertinent_history: List[str]
    exam_findings: str
    assessment: Assessment
    red_flags: List[str]
    urgency: str # "emergency" | "critical" | "routine"
    plan_recommendations: List[str]
    keywords: List[str]
    llm_rationale: str

class Report(BaseModel):
    report_id: str
    patient_id: str
    chat_id: str
    doctor_report: DoctorReportContent
    patient_summary: str
    keywords: List[str]
    reviewed: bool = False
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime = datetime.utcnow()
