import { getProfile } from './auth';
import type { Role } from './types';

export function canAccess(allowedRoles: Role[]): boolean {
  const profile = getProfile();
  if (!profile) return false;
  return allowedRoles.includes(profile.role);
}

export function canAccessPatientRoutes(): boolean {
  return canAccess(['patient']);
}

export function canAccessDoctorRoutes(): boolean {
  return canAccess(['doctor', 'admin']);
}

export function isAdmin(): boolean {
  return canAccess(['admin']);
}
