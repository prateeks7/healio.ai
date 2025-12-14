import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, MessageSquare } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { ReportView } from '@/components/ReportView';
import { Loading } from '@/components/Loading';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getDoctorReport, markReviewed } from '@/lib/queries';
import { formatDateTime } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';

export default function DoctorReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comments, setComments] = useState('');

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['doctor-report', reportId],
    queryFn: () => getDoctorReport(reportId!),
    enabled: !!reportId,
  });

  const reviewMutation = useMutation({
    mutationFn: () => markReviewed(reportId!, { reviewed: true, comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-report', reportId] });
      queryClient.invalidateQueries({ queryKey: ['doctor-reports'] });
      toast({
        title: 'Success',
        description: 'Report marked as reviewed',
      });
      navigate('/doctor/reports');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark report as reviewed',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <AuthGuard allowedRoles={['doctor', 'admin']}>
        <div className="container py-8">
          <Loading message="Loading report..." />
        </div>
      </AuthGuard>
    );
  }

  if (error || !report) {
    return (
      <AuthGuard allowedRoles={['doctor', 'admin']}>
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
    <AuthGuard allowedRoles={['doctor', 'admin']}>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-12">
        <div className="container max-w-5xl">
          {/* Report Info */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Report Details</CardTitle>
                  <CardDescription>
                    Patient ID: {report.patient_id}
                  </CardDescription>
                </div>
                {report.reviewed ? (
                  <Badge className="bg-success text-success-foreground">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Reviewed
                  </Badge>
                ) : (
                  <Badge variant="outline">Pending Review</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDateTime(report.created_at)}</p>
                </div>
                {report.reviewed && report.reviewed_at && (
                  <div>
                    <p className="text-muted-foreground">Reviewed</p>
                    <p className="font-medium">{formatDateTime(report.reviewed_at)}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Chat ID</p>
                  <p className="font-mono text-xs">{report.chat_id}</p>
                </div>
              </div>

              {report.comments && (
                <div>
                  <p className="text-sm font-semibold mb-2">Review Comments</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{report.comments}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Form */}
          {!report.reviewed && (
            <Card className="mb-6 border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Review Report</span>
                </CardTitle>
                <CardDescription>
                  Add comments and mark this report as reviewed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="comments">Comments (Optional)</Label>
                  <Textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Add any additional notes or recommendations..."
                    rows={4}
                  />
                </div>
                <Button
                  onClick={() => reviewMutation.mutate()}
                  disabled={reviewMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  {reviewMutation.isPending ? 'Marking as Reviewed...' : 'Mark as Reviewed'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Report View */}
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
