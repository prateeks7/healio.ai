import api from './api';
import type {
  MedicalHistory,
  ChatSession,
  Diagnostic,
  ReportRunResponse,
  Report,
  FileUpload,
} from './types';

// Auth
export async function verifyGoogleToken(idToken: string) {
  const { data } = await api.post('/auth/google/verify', { id_token: idToken });
  return data;
}

// Medical History
export async function getHistory(patientId: string): Promise<MedicalHistory | null> {
  try {
    const { data } = await api.get(`/patients/${patientId}/history`);
    return data;
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    throw error;
  }
}

export async function putHistory(patientId: string, history: MedicalHistory): Promise<void> {
  await api.put(`/patients/${patientId}/history`, history);
}

// File Uploads
export async function uploadFile(
  patientId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ file_id: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post(`/patients/${patientId}/uploads`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = (progressEvent.loaded / progressEvent.total) * 100;
        onProgress(progress);
      }
    },
  });

  return data;
}

export async function getUploads(patientId: string): Promise<FileUpload[]> {
  const { data } = await api.get(`/patients/${patientId}/uploads`);
  return data;
}

export function getDownloadUrl(patientId: string, fileId: string): string {
  return `${api.defaults.baseURL}/patients/${patientId}/uploads/${fileId}`;
}

// Chat
export async function startChat(): Promise<{ chat_id: string }> {
  const { data } = await api.post('/agents/interaction/start');
  return data;
}

export async function sendMessage(
  chatId: string,
  content: string,
  files?: File[]
): Promise<{ reply: any; summary: string; keywords: string[] }> {
  let fileIds: string[] = [];

  // Upload files first if provided
  if (files && files.length > 0) {
    const profile = JSON.parse(
      localStorage.getItem('healio_profile') ||
      localStorage.getItem('teledoc_profile') ||
      '{}'
    );
    if (profile.patient_id) {
      fileIds = await Promise.all(
        files.map(async (file) => {
          const result = await uploadFile(profile.patient_id, file);
          return result.file_id;
        })
      );
    }
  }

  const { data } = await api.post(`/agents/interaction/${chatId}/message`, {
    message: content,
    attachments: fileIds,  // Send file IDs, not File objects
  });
  return data;
}

export async function getChat(chatId: string): Promise<ChatSession> {
  const { data } = await api.get(`/chats/${chatId}`);
  return data;
}

// Diagnosis & Report
export async function runDiagnosis(chatId: string): Promise<Diagnostic> {
  const { data } = await api.post('/agents/diagnosis/run', { chat_id: chatId });
  return data;
}

export async function runReport(
  chatId: string,
  diagnostic?: Diagnostic
): Promise<ReportRunResponse> {
  const { data } = await api.post('/agents/report/run', {
    chat_id: chatId,
    diagnostic,
  });
  return data;
}

// Patient Profile
export async function updateProfile(
  patientId: string,
  profile: { name: string; age: number; sex: string }
): Promise<void> {
  await api.put(`/patients/${patientId}/profile`, profile);
}

// Patient Reports
export async function listPatientReports(
  patientId: string,
  params?: { limit?: number; cursor?: string }
): Promise<Report[]> {
  const { data } = await api.get(`/patients/${patientId}/reports`, { params });
  return data;
}

export async function getPatientReport(
  patientId: string,
  reportId: string
): Promise<Report> {
  const { data } = await api.get(`/patients/${patientId}/reports/${reportId}`);
  return data;
}

// Doctor Reports
export async function listDoctorReports(params?: {
  reviewed?: boolean;
  limit?: number;
  cursor?: string;
}): Promise<{ items: Report[]; cursor?: string }> {
  const { data } = await api.get('/doctor/reports', { params });
  return data;
}

export async function getDoctorReport(reportId: string): Promise<Report> {
  const { data } = await api.get(`/doctor/reports/${reportId}`);
  return data;
}

export async function markReviewed(
  reportId: string,
  payload: { reviewed: boolean; comments?: string }
): Promise<void> {
  await api.patch(`/doctor/reports/${reportId}/review`, payload);
}

// Search
export async function searchChats(
  patientId?: string,
  q?: string
): Promise<ChatSession[]> {
  const { data } = await api.get('/search/chats', {
    params: { patient_id: patientId, q },
  });
  return data;
}

// Health check
export async function healthCheck(): Promise<{ status: string }> {
  const { data } = await api.get('/healthz');
  return data;
}
