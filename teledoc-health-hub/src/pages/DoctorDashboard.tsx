import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, CheckCircle, XCircle, Clock, Code } from 'lucide-react';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/format';
import { DatePickerWithRange } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

interface Report {
    report_id: string;
    patient_id: string;
    patient_name: string;
    chat_title?: string;
    created_at: string;
    reviewed: boolean;
    doctor_review?: {
        status: 'approved' | 'rejected';
        comments?: string;
        reviewed_at: string;
    };
    doctor_report: {
        urgency: string;
        assessment: {
            primary_diagnosis: {
                name: string;
                confidence: number;
            };
        };
    };
}

interface DoctorDashboardProps {
    view?: 'pending' | 'approved' | 'search';
}

export default function DoctorDashboard({ view = 'pending' }: DoctorDashboardProps) {
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
    const [reviewComments, setReviewComments] = useState('');
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [isFHIROpen, setIsFHIROpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const { data: allReports, isLoading } = useQuery({
        queryKey: ['doctor-reports'],
        queryFn: async () => {
            const { data } = await api.get<Report[]>('/doctor/reports');
            return data;
        }
    });

    // Filter reports based on view and search/filter criteria
    const reports = allReports?.filter(report => {
        // 1. View Filter
        if (view === 'approved' && !report.reviewed) return false;
        if (view === 'pending' && report.reviewed) return false;

        // 2. Search Filter (Patient Name or ID)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = report.patient_name?.toLowerCase().includes(query);
            const matchesId = report.patient_id?.toLowerCase().includes(query);
            if (!matchesName && !matchesId) return false;
        } else if (view === 'search') {
            // For search view, show nothing if no query
            return false;
        }

        // 3. Urgency Filter
        if (urgencyFilter !== 'all') {
            const urgency = (report.doctor_report?.urgency || 'Routine').toLowerCase();
            const filter = urgencyFilter.toLowerCase();

            if (filter === 'critical') {
                // Critical includes Urgent, Emergency, High, Critical
                if (!['urgent', 'emergency', 'high', 'critical'].includes(urgency)) return false;
            } else if (filter === 'routine') {
                // Routine includes Routine, Low, Normal
                if (!['routine', 'low', 'normal'].includes(urgency)) return false;
            } else {
                // Exact match fallback
                if (urgency !== filter) return false;
            }
        }

        // 4. Date Range Filter
        if (dateRange?.from) {
            if (!report.created_at) return false;
            try {
                const reportDate = parseISO(report.created_at);
                const start = startOfDay(dateRange.from);
                const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

                if (!isWithinInterval(reportDate, { start, end })) {
                    return false;
                }
            } catch (e) {
                console.error("Date parsing error", e);
                return false;
            }
        }

        return true;
    });

    const getTitle = () => {
        switch (view) {
            case 'approved': return 'Approved Reports';
            case 'search': return 'Patient Search';
            default: return 'Pending Reviews';
        }
    };

    const reviewMutation = useMutation({
        mutationFn: async () => {
            if (!selectedReport) return;
            await api.post(`/doctor/reports/${selectedReport.report_id}/review`, {
                status: reviewStatus,
                comments: reviewComments
            });
        },
        onSuccess: () => {
            toast({
                title: "Review Submitted",
                description: "The report has been updated."
            });
            setIsReviewOpen(false);
            setSelectedReport(null);
            setReviewComments('');
            queryClient.invalidateQueries({ queryKey: ['doctor-reports'] });
        },
        onError: (error: any) => {
            toast({
                title: "Review Failed",
                description: error.message || "Could not submit review",
                variant: "destructive"
            });
        }
    });

    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);

    // Fetch PDF when report is selected
    useEffect(() => {
        if (selectedReport) {
            const fetchPdf = async () => {
                try {
                    setPdfLoading(true);
                    const response = await api.get(
                        `/patients/${selectedReport.patient_id}/reports/${selectedReport.report_id}/pdf`,
                        { responseType: 'blob' }
                    );
                    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                    setPdfUrl(url);
                } catch (error) {
                    console.error("Failed to load PDF", error);
                    toast({
                        title: "Error",
                        description: "Failed to load report PDF",
                        variant: "destructive"
                    });
                } finally {
                    setPdfLoading(false);
                }
            };
            fetchPdf();
        } else {
            setPdfUrl(null);
        }
    }, [selectedReport, toast]);

    const handleReviewClick = (report: Report) => {
        setSelectedReport(report);
        setReviewStatus(report.doctor_review?.status || 'approved');
        setReviewComments(report.doctor_review?.comments || '');
        setIsReviewOpen(true);
    };

    const generateFHIRJSON = (report: Report) => {
        const timestamp = new Date(report.created_at).toISOString();

        return JSON.stringify({
            "resourceType": "DiagnosticReport",
            "id": report.report_id,
            "text": {
                "status": "generated",
                "div": `<div xmlns="http://www.w3.org/1999/xhtml">
                    <h2>Medical Consultation Report</h2>
                    <p><strong>Patient:</strong> ${report.patient_name}</p>
                    <p><strong>Diagnosis:</strong> ${report.doctor_report?.assessment?.primary_diagnosis?.name || "Unknown"}</p>
                    <p><strong>Status:</strong> ${report.doctor_review?.status || "pending"}</p>
                </div>`
            },
            "status": "final",
            "code": {
                "coding": [{
                    "system": "http://loinc.org",
                    "code": "11488-4",
                    "display": "Consult note"
                }]
            },
            "subject": {
                "reference": `Patient/${report.patient_id}`,
                "display": report.patient_name
            },
            "effectiveDateTime": timestamp,
            "issued": timestamp,
            "performer": [{
                "display": "Healio AI Assistant"
            }],
            "conclusion": report.doctor_report?.assessment?.primary_diagnosis?.name || "Unknown",
            "extension": [
                {
                    "url": "http://healio.ai/fhir/StructureDefinition/review-status",
                    "valueString": report.doctor_review?.status || "pending"
                },
                {
                    "url": "http://healio.ai/fhir/StructureDefinition/urgency",
                    "valueString": report.doctor_report?.urgency
                }
            ]
        }, null, 2);
    };

    return (
        <AuthGuard allowedRoles={['doctor']}>
            <div className="container py-8 space-y-8">
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Doctor Dashboard</h1>
                            <p className="text-muted-foreground">Review and manage patient reports</p>
                        </div>
                    </div>

                    {/* Search and Filter Bar */}
                    <div className="flex gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
                        <div className="flex-1">
                            <Label htmlFor="search" className="sr-only">Search Patients</Label>
                            <div className="relative">
                                <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    id="search"
                                    type="text"
                                    placeholder="Search by patient name or ID..."
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="w-[200px]">
                            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by Urgency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Reports</SelectItem>
                                    <SelectItem value="Routine">Routine</SelectItem>
                                    <SelectItem value="Critical">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{getTitle()}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Patient</TableHead>
                                    <TableHead>Chief Complaint</TableHead>
                                    <TableHead>Diagnosis</TableHead>
                                    <TableHead>Urgency</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">Loading reports...</TableCell>
                                    </TableRow>
                                ) : reports?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">No reports found.</TableCell>
                                    </TableRow>
                                ) : (
                                    reports?.map((report) => (
                                        <TableRow key={report.report_id}>
                                            <TableCell>{formatDateTime(report.created_at)}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{report.patient_name}</div>
                                            </TableCell>
                                            <TableCell className="max-w-[200px] whitespace-normal" title={report.chat_title}>
                                                {report.chat_title || "Medical Consultation"}
                                            </TableCell>
                                            <TableCell>
                                                {report.doctor_report?.assessment?.primary_diagnosis?.name || "Unknown"}
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    ({Math.round((report.doctor_report?.assessment?.primary_diagnosis?.confidence || 0) * 100)}%)
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={['Emergency', 'Critical', 'Urgent'].includes(report.doctor_report?.urgency) ? 'destructive' : 'secondary'}>
                                                    {report.doctor_report?.urgency}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {report.reviewed ? (
                                                    <Badge variant={report.doctor_review?.status === 'approved' ? 'default' : 'destructive'} className="flex w-fit items-center gap-1">
                                                        {report.doctor_review?.status === 'approved' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                        {report.doctor_review?.status === 'approved' ? 'Approved' : 'Rejected'}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="flex w-fit items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">
                                                        <Clock className="h-3 w-3" /> Pending
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => handleReviewClick(report)}>
                                                    <FileText className="h-4 w-4 mr-2" />
                                                    Review
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                    <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Review Report - {selectedReport?.patient_name}</DialogTitle>
                        </DialogHeader>

                        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                            {/* PDF Viewer */}
                            <div className="border rounded-md bg-muted/10 overflow-hidden relative">
                                {pdfLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                )}
                                {pdfUrl ? (
                                    <iframe
                                        src={pdfUrl}
                                        className="w-full h-full"
                                        title="Report PDF"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        {pdfLoading ? "Loading PDF..." : "No PDF available"}
                                    </div>
                                )}
                            </div>

                            {/* Review Form */}
                            <div className="space-y-6 overflow-y-auto pr-2">
                                <div className="space-y-2">
                                    <Label>Review Decision</Label>
                                    <Select
                                        value={reviewStatus}
                                        onValueChange={(v: 'approved' | 'rejected') => setReviewStatus(v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="approved">Approve Report</SelectItem>
                                            <SelectItem value="rejected">Reject Report</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Additional Comments</Label>
                                    <Textarea
                                        placeholder="Add notes for the patient..."
                                        value={reviewComments}
                                        onChange={(e) => setReviewComments(e.target.value)}
                                        className="min-h-[150px]"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        These comments will be visible to the patient.
                                    </p>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <Button
                                        className="w-full"
                                        onClick={() => reviewMutation.mutate()}
                                        disabled={reviewMutation.isPending}
                                    >
                                        {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="w-full border-dashed"
                                        onClick={() => setIsFHIROpen(true)}
                                    >
                                        <Code className="h-4 w-4 mr-2" />
                                        View FHIR Data (Interoperability)
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={isFHIROpen} onOpenChange={setIsFHIROpen}>
                    <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Code className="h-5 w-5 text-primary" />
                                FHIR R4 DiagnosticReport
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 min-h-0 bg-slate-950 rounded-md p-4 overflow-auto">
                            <pre className="text-xs font-mono text-green-400">
                                {selectedReport && generateFHIRJSON(selectedReport)}
                            </pre>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AuthGuard>
    );
}
