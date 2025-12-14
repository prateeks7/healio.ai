import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Stethoscope, Upload, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { setToken, setProfile, isAuthenticated, getProfile, updateLocalProfile } from '@/lib/auth';

export default function OnboardingPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    // Get ID Token from navigation state
    const idToken = location.state?.idToken;

    const [step, setStep] = useState(1);
    const [role, setRole] = useState<'patient' | 'doctor'>('patient');
    const [loading, setLoading] = useState(false);

    // Basic Info
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [sex, setSex] = useState('');

    // Doctor Profile
    const [specialty, setSpecialty] = useState('');
    const [experience, setExperience] = useState('');
    const [bio, setBio] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [licenseFile, setLicenseFile] = useState<File | null>(null);

    useEffect(() => {
        // Allow access if we have an idToken (new signup) OR if we are already authenticated (completing profile)
        if (!idToken && !isAuthenticated()) {
            toast({
                title: "Session Expired",
                description: "Please sign in again.",
                variant: "destructive"
            });
            navigate('/login');
        }

        // Pre-fill data if authenticated
        if (isAuthenticated()) {
            const profile = getProfile();
            if (profile) {
                if (profile.name) setName(profile.name);
                if (profile.age) setAge(profile.age.toString());
                if (profile.sex) setSex(profile.sex);
                if (profile.role === 'patient' || profile.role === 'doctor') {
                    setRole(profile.role);
                }
            }
        }
    }, [idToken, navigate, toast]);

    const handleCreateAccount = async () => {
        try {
            setLoading(true);

            if (isAuthenticated()) {
                // Handle update for existing authenticated user
                const profile = getProfile();

                if (role === 'patient' && profile?.patient_id) {
                    await api.put(`/patients/${profile.patient_id}/profile`, {
                        name,
                        age: parseInt(age),
                        sex
                    });
                    updateLocalProfile({ name, age: parseInt(age), sex });
                } else if (role === 'doctor') {
                    // For doctors, we might need to update the doctor profile
                    // This assumes the user is already a doctor or we are upgrading them (which might need more backend logic)
                    // For now, we'll proceed with the doctor profile update endpoints
                    await api.put('/doctor/profile', {
                        specialty,
                        bio,
                        experience_years: experience ? parseInt(experience) : 0,
                        license_number: licenseNumber,
                        name,
                        age: parseInt(age),
                        sex
                    });
                    updateLocalProfile({ name, age: parseInt(age), sex }); // Update basic info locally too if needed
                }

                // If we are authenticated, we don't need to set token again

            } else {
                // Handle new user creation with Google Token
                // 1. Create Account
                const response = await api.post('/auth/google/verify', {
                    id_token: idToken,
                    role,
                    name,
                    age: parseInt(age),
                    sex
                });

                const { jwt, profile } = response.data;
                setToken(jwt);
                setProfile(profile);
            }

            // 2. If Doctor, upload license (common for both flows if needed)
            if (role === 'doctor') {
                // We already called put /doctor/profile above for auth'd users, 
                // but for new users we need to do it here.
                // To keep it simple, let's just do it if we just created the account.

                if (!isAuthenticated()) {
                    await api.put('/doctor/profile', {
                        specialty,
                        bio,
                        experience_years: experience ? parseInt(experience) : 0,
                        license_number: licenseNumber
                    });
                }

                // Upload License
                if (licenseFile) {
                    const formData = new FormData();
                    formData.append('file', licenseFile);
                    await api.post('/doctor/license', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }
            }

            toast({
                title: "Profile Updated",
                description: "Your account is ready.",
            });

            // Redirect
            if (role === 'doctor') {
                navigate('/doctor/dashboard');
            } else {
                navigate('/');
            }

        } catch (error: any) {
            console.error("Onboarding failed", error);
            toast({
                title: "Update Failed",
                description: error.response?.data?.detail || "Could not update account",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    // Render Steps
    const renderStep1_Role = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div
                    className={`cursor-pointer border rounded-xl p-6 flex flex-col items-center space-y-4 transition-all hover:shadow-md ${role === 'patient' ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'hover:bg-accent'}`}
                    onClick={() => setRole('patient')}
                >
                    <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                        <User className="h-8 w-8" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-semibold text-lg">Patient</h3>
                        <p className="text-sm text-muted-foreground">I want to consult with AI and doctors</p>
                    </div>
                </div>
                <div
                    className={`cursor-pointer border rounded-xl p-6 flex flex-col items-center space-y-4 transition-all hover:shadow-md ${role === 'doctor' ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'hover:bg-accent'}`}
                    onClick={() => setRole('doctor')}
                >
                    <div className="p-3 bg-green-100 rounded-full text-green-600">
                        <Stethoscope className="h-8 w-8" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-semibold text-lg">Doctor</h3>
                        <p className="text-sm text-muted-foreground">I want to review reports and help patients</p>
                    </div>
                </div>
            </div>
            <Button className="w-full" onClick={nextStep}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
    );

    const renderStep2_BasicInfo = () => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                    id="name"
                    placeholder="Your Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                        id="age"
                        type="number"
                        placeholder="e.g. 30"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="sex">Sex</Label>
                    <Select value={sex} onValueChange={setSex}>
                        <SelectTrigger id="sex">
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={prevStep} className="w-1/3">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                    className="w-2/3"
                    onClick={() => role === 'doctor' ? nextStep() : handleCreateAccount()}
                    disabled={(!name || !age || !sex) || loading}
                >
                    {role === 'doctor' ? 'Next: Professional Profile' : (loading ? 'Creating Account...' : 'Finish')}
                </Button>
            </div>
        </div>
    );

    const renderStep3_DoctorProfile = () => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                    id="specialty"
                    placeholder="e.g. Cardiologist, General Practitioner"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="experience">Experience (Years)</Label>
                    <Input
                        id="experience"
                        type="number"
                        placeholder="e.g. 10"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="license">License Number</Label>
                    <Input
                        id="license"
                        placeholder="Medical License #"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                    id="bio"
                    placeholder="Brief description of your expertise..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="min-h-[100px]"
                />
            </div>

            <div className="space-y-2">
                <Label>Upload Medical License</Label>
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                    <Input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                        accept=".pdf,.jpg,.png"
                    />
                    {licenseFile ? (
                        <div className="flex items-center text-green-600">
                            <CheckCircle className="h-6 w-6 mr-2" />
                            <span className="font-medium">{licenseFile.name}</span>
                        </div>
                    ) : (
                        <>
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm font-medium">Click to upload verification document</p>
                            <p className="text-xs text-muted-foreground">PDF, JPG, or PNG</p>
                        </>
                    )}
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={prevStep} className="w-1/3">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                    className="w-2/3"
                    onClick={handleCreateAccount}
                    disabled={loading}
                >
                    {loading ? 'Verifying & Creating...' : 'Submit (Skip if needed)'}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <Card className="w-full max-w-lg shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">
                        {step === 1 && "Choose Your Role"}
                        {step === 2 && (role === 'doctor' ? "Doctor Registration" : "Complete Profile")}
                        {step === 3 && "Professional Details"}
                    </CardTitle>
                    <CardDescription>
                        {step === 1 && "How will you use Healio.AI?"}
                        {step === 2 && "Tell us a bit about yourself"}
                        {step === 3 && "We need to verify your credentials"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 1 && renderStep1_Role()}
                    {step === 2 && renderStep2_BasicInfo()}
                    {step === 3 && renderStep3_DoctorProfile()}
                </CardContent>
                <CardFooter className="justify-center pb-6">
                    <div className="flex gap-2">
                        <div className={`h-2 w-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
                        <div className={`h-2 w-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
                        {role === 'doctor' && (
                            <div className={`h-2 w-2 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
                        )}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
