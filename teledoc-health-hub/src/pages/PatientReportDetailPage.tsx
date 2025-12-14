import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/AuthGuard';
import { ReportView } from '@/components/ReportView';
import { Loading } from '@/components/Loading';
import { ErrorState } from '@/components/ErrorState';
import { getProfile } from '@/lib/auth';
import { getPatientReport } from '@/lib/queries';

export default function PatientReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const profile = getProfile();

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['patient-report', reportId],
    queryFn: () => getPatientReport(profile!.patient_id!, reportId!),
    enabled: !!profile?.patient_id && !!reportId,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (report) {
      queryClient.invalidateQueries({ queryKey: ['unread-reports'] });
    }
  }, [report, queryClient]);

  if (isLoading) {
    return (
      <AuthGuard allowedRoles={['patient']}>
        <div className="container py-8">
          <Loading message="Loading report..." />
        </div>
      </AuthGuard>
    );
  }

  if (error || !report) {
    return (
      <AuthGuard allowedRoles={['patient']}>
        <div className="container py-8">
          <ErrorState message="Failed to load report" />
        </div>
      </AuthGuard>
    );
  }

  const handleDownload = () => {
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${reportId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AuthGuard allowedRoles={['patient']}>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-12">
        <div className="container max-w-5xl">
          <ReportView
            report={report}
            onDownload={handleDownload}
            onPrint={handlePrint}
          />
        </div>
      </div>
    </AuthGuard>
  );
}
