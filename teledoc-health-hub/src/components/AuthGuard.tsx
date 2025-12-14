import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getProfile } from '@/lib/auth';
import type { Role } from '@/lib/types';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true });
      return;
    }

    if (allowedRoles) {
      const profile = getProfile();
      if (!profile || !allowedRoles.includes(profile.role)) {
        navigate('/', { replace: true });
      }
    }

    // Check for incomplete profile (Onboarding)
    const profile = getProfile();
    if (profile?.role === 'patient' && (!profile.age || !profile.sex)) {
      // Prevent redirect loop if already on onboarding
      if (location.pathname !== '/onboarding') {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [navigate, allowedRoles, location]);

  if (!isAuthenticated()) {
    return null;
  }

  if (allowedRoles) {
    const profile = getProfile();
    if (!profile || !allowedRoles.includes(profile.role)) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
            <p className="text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
