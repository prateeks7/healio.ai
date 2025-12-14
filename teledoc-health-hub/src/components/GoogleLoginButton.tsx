import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { Button } from './ui/button';
import { loginWithGoogle } from '@/lib/auth';
import { getHistory } from '@/lib/queries';
import { getProfile } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLoginSuccess = (response: any) => {
    toast({
      title: 'Login Successful',
      description: `Welcome, ${response.profile.email}`,
    });

    if (response.profile.role === 'patient') {
      getHistory(response.profile.patient_id!).then(history => {
        if (!history) navigate('/history');
        else navigate('/');
      });
    } else if (response.profile.role === 'doctor') {
      navigate('/doctor/dashboard');
    } else {
      navigate('/');
    }
  };

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // We use the access_token to authenticate with our backend
        // The backend will verify it (assuming we updated backend to verify access_token or we use it as id_token)
        // For now, we are passing access_token as id_token to backend.

        const response = await loginWithGoogle(tokenResponse.access_token);

        if (response.jwt) {
          handleLoginSuccess(response);
        }
      } catch (error: any) {
        console.error(error);

        // Check for 404 (User not found / Onboarding required)
        if (error.response && error.response.status === 404) {
          // Redirect to Onboarding Page with token
          navigate('/onboarding', { state: { idToken: tokenResponse.access_token } });
          return;
        }

        toast({
          title: 'Login Failed',
          description: 'Failed to authenticate with server',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setLoading(false);
      toast({
        title: 'Login Failed',
        description: 'Google Sign-In was unsuccessful',
        variant: 'destructive',
      });
    },
    flow: 'implicit',
  });

  const handleGoogleLogin = () => {
    login();
  };

  return (
    <Button
      onClick={handleGoogleLogin}
      disabled={loading}
      className="w-full"
      variant="outline"
      size="lg"
    >
      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {loading ? 'Signing in...' : 'Continue with Google'}
    </Button>
  );
}
