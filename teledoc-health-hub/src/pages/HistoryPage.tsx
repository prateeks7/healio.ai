import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AuthGuard } from '@/components/AuthGuard';
import { HistoryForm } from '@/components/HistoryForm';
import { Loading } from '@/components/Loading';
import { ErrorState } from '@/components/ErrorState';
import { getProfile } from '@/lib/auth';
import { getHistory, putHistory } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';
import type { MedicalHistory } from '@/lib/types';

export default function HistoryPage() {
  const profile = getProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: history, isLoading, error } = useQuery({
    queryKey: ['history', profile?.patient_id],
    queryFn: () => getHistory(profile!.patient_id!),
    enabled: !!profile?.patient_id,
  });

  const mutation = useMutation({
    mutationFn: (data: MedicalHistory) => putHistory(profile!.patient_id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history', profile?.patient_id] });
      toast({
        title: 'Success',
        description: 'Medical history saved successfully',
      });
      navigate('/');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save medical history',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <AuthGuard allowedRoles={['patient']}>
        <div className="container py-8">
          <Loading message="Loading your medical history..." />
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard allowedRoles={['patient']}>
        <div className="container py-8">
          <ErrorState
            message="Failed to load medical history"
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['history'] })}
          />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles={['patient']}>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-12">
        <div className="container max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Medical History</h1>
            <p className="text-muted-foreground">
              Please provide your medical history to help us understand your health better
            </p>
          </div>

          <HistoryForm
            initialData={history || undefined}
            onSubmit={(data) => mutation.mutateAsync(data)}
            loading={mutation.isPending}
          />
        </div>
      </div>
    </AuthGuard>
  );
}
