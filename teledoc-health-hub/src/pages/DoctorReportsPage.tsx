import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Filter } from 'lucide-react';
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
import { UrgencyBadge } from '@/components/UrgencyBadge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listDoctorReports } from '@/lib/queries';
import { formatDateTime } from '@/lib/format';

export default function DoctorReportsPage() {
  const navigate = useNavigate();
  const [reviewedFilter, setReviewedFilter] = useState<boolean | undefined>(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['doctor-reports', reviewedFilter],
    queryFn: () => listDoctorReports({ reviewed: reviewedFilter }),
  });

  if (isLoading) {
    return (
      <AuthGuard allowedRoles={['doctor', 'admin']}>
        <div className="container py-8">
          <Loading message="Loading reports..." />
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard allowedRoles={['doctor', 'admin']}>
        <div className="container py-8">
          <ErrorState message="Failed to load reports" />
        </div>
      </AuthGuard>
    );
  }

  const reports = data?.items || [];

  return (
    <AuthGuard allowedRoles={['doctor', 'admin']}>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-12">
        <div className="container max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Patient Reports</h1>
            <p className="text-muted-foreground">
              Review and approve AI-generated patient reports
            </p>
          </div>

          <div className="mb-6">
            <Tabs
              value={reviewedFilter === false ? 'pending' : reviewedFilter === true ? 'reviewed' : 'all'}
              onValueChange={(value) => {
                if (value === 'pending') setReviewedFilter(false);
                else if (value === 'reviewed') setReviewedFilter(true);
                else setReviewedFilter(undefined);
              }}
            >
              <TabsList>
                <TabsTrigger value="pending">
                  Pending Review
                  {data?.items && reviewedFilter === false && (
                    <Badge variant="secondary" className="ml-2">
                      {data.items.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
                <TabsTrigger value="all">All Reports</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {reports.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Patient ID</TableHead>
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
                        <TableCell className="font-mono text-xs">
                          {report.patient_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {report.doctor_report.chief_complaint}
                        </TableCell>
                        <TableCell>
                          <UrgencyBadge urgency={report.doctor_report.urgency} />
                        </TableCell>
                        <TableCell>
                          {report.reviewed ? (
                            <div className="space-y-1">
                              <Badge variant="outline" className="bg-success/10 text-success">
                                Reviewed
                              </Badge>
                              {report.reviewed_at && (
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTime(report.reviewed_at)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline">Pending Review</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/doctor/reports/${report.report_id}`)
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Review
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
              title={
                reviewedFilter === false
                  ? 'No pending reports'
                  : 'No reports found'
              }
              description={
                reviewedFilter === false
                  ? 'All reports have been reviewed'
                  : 'No reports match your filter criteria'
              }
            />
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
