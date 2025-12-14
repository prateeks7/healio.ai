import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, UserCircle, Stethoscope } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getProfile } from '@/lib/auth';
import { toast } from '@/components/ui/use-toast';

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const [isSelecting, setIsSelecting] = useState(false);

  const handleRoleSelection = async (role: 'patient' | 'doctor') => {
    setIsSelecting(true);
    
    try {
      // Update profile in localStorage with selected role
      const profile = getProfile();
      if (profile) {
        const updatedProfile = { ...profile, role };
        localStorage.setItem('teledoc_profile', JSON.stringify(updatedProfile));
        
        toast({
          title: 'Role Selected',
          description: `You've been registered as a ${role}`,
        });

        // Redirect based on role
        if (role === 'patient') {
          navigate('/history', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to set role. Please try again.',
        variant: 'destructive',
      });
      setIsSelecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary mb-4">
            <Activity className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to TeleDoc</h1>
          <p className="text-muted-foreground">
            Please select your role to continue
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
            onClick={() => !isSelecting && handleRoleSelection('patient')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Patient</CardTitle>
                  <CardDescription>I'm seeking medical consultation</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                disabled={isSelecting}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRoleSelection('patient');
                }}
              >
                Continue as Patient
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
            onClick={() => !isSelecting && handleRoleSelection('doctor')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Doctor</CardTitle>
                  <CardDescription>I'm here to review patient cases</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="outline"
                disabled={isSelecting}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRoleSelection('doctor');
                }}
              >
                Continue as Doctor
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
