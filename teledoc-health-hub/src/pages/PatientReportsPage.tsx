import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, CheckCircle, XCircle, MessageSquare, User, Stethoscope, Award } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { Loading } from '@/components/Loading';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import { getProfile } from '@/lib/auth';
import { listPatientReports } from '@/lib/queries';
import { formatDateTime } from '@/lib/format';

export default function PatientReportsPage() {
  const profile = getProfile();
  const navigate = useNavigate();
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['patient-reports', profile?.patient_id],
    queryFn: () => listPatientReports(profile!.patient_id!),
    enabled: !!profile?.patient_id,
  });

  if (isLoading) {
    return (
      <AuthGuard allowedRoles={['patient']}>
        <div className="container py-8">
          <Loading message="Loading your reports..." />
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard allowedRoles={['patient']}>
        <div className="container py-8">
          <ErrorState message="Failed to load reports" />
        </div>
      </AuthGuard>
    );
  }

  const reports = data || [];

  return (
    <AuthGuard allowedRoles={['patient']}>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-12">
        <div className="container max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Medical Reports</h1>
            <p className="text-muted-foreground">
              View and download your AI-generated medical reports
            </p>
          </div>

          {reports.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Chief Complaint</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.report_id}>
                        <TableCell className="font-medium">
                          {formatDateTime(report.created_at)}
                        </TableCell>
                        <TableCell className="max-w-xs whitespace-normal" title={report.chat_title}>
                          {report.chat_title || report.doctor_report.chief_complaint}
                        </TableCell>
                        <TableCell>
                          <UrgencyBadge urgency={report.doctor_report.urgency} />
                        </TableCell>
                        <TableCell>
                          {report.reviewed ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant={report.doctor_review?.status === 'approved' ? 'default' : 'destructive'} className="w-fit flex items-center gap-1">
                                {report.doctor_review?.status === 'approved' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                {report.doctor_review?.status === 'approved' ? 'Approved' : 'Rejected'}
                              </Badge>
                              {report.doctor_review?.comments && (
                                <div className="text-xs text-muted-foreground flex items-start gap-1 mt-1 max-w-[200px]">
                                  <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                                  <span className="truncate">{report.doctor_review.comments}</span>
                                </div>
                              )}

                              {report.doctor_details && (
                                <div className="mt-2 pt-2 border-t text-xs">
                                  <div
                                    className="font-medium flex items-center gap-1 cursor-pointer hover:underline text-primary"
                                    onClick={() => setSelectedDoctor(report.doctor_details)}
                                  >
                                    {report.doctor_details.name}
                                    {report.doctor_details.verified ? (
                                      <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100">
                                        Verified
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="h-4 px-1 text-[10px] text-muted-foreground">
                                        Unverified
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-muted-foreground">{report.doctor_details.specialty}</div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending Review</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/reports/${report.report_id}`)
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={FileText}
              title="No reports yet"
              description="Complete a consultation and generate a report to see it here"
              action={
                <Button onClick={() => navigate('/chat/new')}>
                  Start Consultation
                </Button>
              }
            />
          )}
        </div>

        {/* Doctor Profile Dialog */}
        <Dialog open={!!selectedDoctor} onOpenChange={(open) => !open && setSelectedDoctor(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Doctor Profile</DialogTitle>
              <DialogDescription>Reviewer Information</DialogDescription>
            </DialogHeader>
            {selectedDoctor && (
              <div className="space-y-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {selectedDoctor.name}
                      {selectedDoctor.verified && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">Verified</Badge>
                      )}
                    </h3>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Stethoscope className="h-3 w-3" /> {selectedDoctor.specialty}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Experience</p>
                      <p className="font-medium flex items-center gap-1">
                        <Award className="h-4 w-4 text-amber-500" />
                        {selectedDoctor.experience_years || 0} Years
                      </p>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <p className="font-medium text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> Active
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">About</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedDoctor.bio || "No biography provided."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
