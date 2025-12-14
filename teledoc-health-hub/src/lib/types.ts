export type Role = 'patient' | 'doctor' | 'admin';

export interface Profile {
  sub: string;
  role: Role;
  patient_id?: string | null;
  email: string;
  name?: string;
  age?: number;
  sex?: string;
}

export interface AuthResponse {
  jwt: string;
  profile: Profile;
}

export interface MedicalHistory {
  demographics: {
    age: number;
    sex: 'M' | 'F' | 'Other';
    height_cm?: number;
    weight_kg?: number;
  };
  allergies: string[];
  medications: { name: string; dose?: string; schedule?: string }[];
  conditions: string[];
  surgeries: string[];
  family_history: string[];
  social_history: {
    smoking?: string;
    alcohol?: string;
    occupation?: string;
    activity_level?: string;
  };
  current_symptoms: string[];
  additional_info?: string;
  past_incidents?: {
    title: string;
    date: string;
    description: string;
    files: string[];
  }[];
}

export interface ChatMessage {
  role: 'patient' | 'agent';
  ts: string;
  content: string;
  attachments?: string[];
  localAttachments?: File[];
  report_id?: string;
}

export interface ChatSession {
  chat_id: string;
  patient_id: string;
  messages: ChatMessage[];
  title?: string;
  summary?: string;
  keywords?: string[];
}

export interface Diagnostic {
  primary_hypothesis: { name: string; confidence: number };
  differentials: { name: string; confidence: number }[];
  red_flags: string[];
  urgency: 'emergency' | 'critical' | 'routine';
  rationale: string;
}

export interface DoctorReport {
  patient_id: string;
  chief_complaint: string;
  history_of_present_illness: string;
  pertinent_history: string[];
  exam_findings?: string;
  assessment: {
    primary_diagnosis: { name: string; confidence: number };
    differentials: { name: string; confidence: number }[];
  };
  red_flags: string[];
  urgency: 'emergency' | 'critical' | 'routine';
  plan_recommendations: string[];
  keywords: string[];
  llm_rationale: string;
}

export interface ReportRunResponse {
  report_id: string;
  doctor_report: DoctorReport;
  patient_summary: string;
  keywords: string[];
}

export interface FileUpload {
  file_id: string;
  filename: string;
  size: number;
  content_type: string;
  uploaded_at: string;
}

export interface Report {
  report_id: string;
  patient_id: string;
  chat_id: string;
  chat_title?: string;
  doctor_report: DoctorReport;
  patient_summary: string;
  created_at: string;
  reviewed: boolean;
  doctor_review?: {
    status: 'approved' | 'rejected';
    comments?: string;
    reviewed_at: string;
  };
  patient_read?: boolean;
  doctor_details?: {
    name: string;
    specialty: string;
    bio: string;
    verified: boolean;
  };
}
