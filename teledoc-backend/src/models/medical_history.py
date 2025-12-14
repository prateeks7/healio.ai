from pydantic import BaseModel
from typing import List, Optional

class Demographics(BaseModel):
    age: int
    sex: str
    height_cm: float
    weight_kg: float

class Medication(BaseModel):
    name: str
    dose: str
    schedule: str

class SocialHistory(BaseModel):
    smoking: str
    alcohol: str
    occupation: str
    activity_level: str

class PastIncident(BaseModel):
    title: str
    date: str
    description: str
    files: List[str] = []

class MedicalHistory(BaseModel):
    demographics: Demographics
    allergies: List[str]
    medications: List[Medication]
    conditions: List[str]
    surgeries: List[str]
    family_history: List[str]
    social_history: SocialHistory
    current_symptoms: List[str]
    additional_info: str
    past_incidents: Optional[List[PastIncident]] = []
