import api from './api';
import type { AuthResponse, Profile } from './types';

const JWT_KEY = 'teledoc_jwt';
const PROFILE_KEY = 'teledoc_profile';

let memoryJwt: string | null = null;
let memoryProfile: Profile | null = null;

export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/google/verify', {
    id_token: idToken,
  });

  // Store in both memory and localStorage
  memoryJwt = data.jwt;
  memoryProfile = data.profile;
  localStorage.setItem(JWT_KEY, data.jwt);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));

  return data;
}

export function logout() {
  memoryJwt = null;
  memoryProfile = null;
  localStorage.removeItem(JWT_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export const setToken = (token: string) => {
  memoryJwt = token;
  localStorage.setItem(JWT_KEY, token);
};

export const getToken = () => {
  return getJwt();
};

export const setProfile = (profile: any) => {
  memoryProfile = profile;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

// Remove duplicate getProfile if it exists below, or ensure this is the only one.
// The previous file content showed `export function getProfile` later. 
// I will remove the `export const getProfile` I added and rely on the function or unify them.
// Actually, I'll just use the function version and export the setters.

export function getJwt(): string | null {
  if (memoryJwt) return memoryJwt;

  const stored = localStorage.getItem(JWT_KEY);
  if (stored) {
    memoryJwt = stored;
    return stored;
  }

  return null;
}

export function getProfile(): Profile | null {
  if (memoryProfile) return memoryProfile;

  const stored = localStorage.getItem(PROFILE_KEY);
  if (stored) {
    try {
      memoryProfile = JSON.parse(stored);
      return memoryProfile;
    } catch {
      return null;
    }
  }

  return null;
}

export function isAuthenticated(): boolean {
  return !!getJwt();
}

export function hasRole(role: string | string[]): boolean {
  const profile = getProfile();
  if (!profile) return false;

  if (Array.isArray(role)) {
    return role.includes(profile.role);
  }

  return profile.role === role;
}

export function updateLocalProfile(updates: Partial<Profile>) {
  if (memoryProfile) {
    memoryProfile = { ...memoryProfile, ...updates };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(memoryProfile));
  }
}
