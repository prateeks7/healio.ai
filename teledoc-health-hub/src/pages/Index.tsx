import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, MessageSquare, FileText, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthGuard } from '@/components/AuthGuard';
import { getProfile, isAuthenticated, logout } from '@/lib/auth';

const Index = () => {
  const navigate = useNavigate();
  const profile = getProfile();

  useEffect(() => {
    // If authenticated but no profile, force logout to fix inconsistent state
    if (isAuthenticated() && !profile) {
      logout();
      navigate('/login', { replace: true });
    }
  }, [navigate, profile]);

  // AuthGuard handles the redirect if not authenticated
  // We don't need to return null here, as AuthGuard will prevent rendering children


  const patientFeatures = [
    {
      title: 'Start a Consultation',
      description: 'Chat with our AI agent about your symptoms',
      icon: MessageSquare,
      action: () => navigate('/chat/new'),
      color: 'from-primary to-accent',
    },
    {
      title: 'Medical History',
      description: 'Update your medical history and profile',
      icon: FileText,
      action: () => navigate('/history'),
      color: 'from-accent to-success',
    },
    {
      title: 'View Reports',
      description: 'Access your medical reports and diagnoses',
      icon: FileText,
      action: () => navigate('/reports'),
      color: 'from-success to-primary',
    },
  ];

  const doctorFeatures = [
    {
      title: 'Review Reports',
      description: 'Review and approve patient reports',
      icon: FileText,
      action: () => navigate('/doctor/reports'),
      color: 'from-primary to-accent',
    },
    {
      title: 'Approved Reports',
      description: 'View history of approved reports',
      icon: CheckCircle,
      action: () => navigate('/doctor/approved'),
      color: 'from-success to-primary',
    },
    {
      title: 'Patient Search',
      description: 'Search and view patient histories',
      icon: Users,
      action: () => navigate('/doctor/search'),
      color: 'from-accent to-success',
    },
  ];

  const features = profile?.role === 'patient' ? patientFeatures : doctorFeatures;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container py-12">
          <div className="max-w-6xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-primary mb-6 shadow-xl">
                <Activity className="h-12 w-12 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-4">
                Welcome back, {profile?.name || profile?.email?.split('@')[0] || 'User'}
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {profile?.role === 'patient'
                  ? 'Get AI-powered medical insights and manage your health records'
                  : 'Review patient reports and provide expert medical guidance'}
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={index}
                    className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                    onClick={feature.action}
                  >
                    <CardHeader>
                      <div
                        className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} mb-4 shadow-lg`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="ghost" className="w-full group-hover:bg-accent transition-smooth">
                        Get Started →
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Info Banner */}
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                      <Activity className="h-5 w-5 text-warning" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold mb-1">
                      Important Medical Disclaimer
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Healio.AI provides AI-assisted medical information for educational purposes
                      only. This is not a substitute for professional medical advice, diagnosis,
                      or treatment. Always seek the advice of your physician or other qualified
                      health provider with any questions regarding a medical condition.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default Index;
