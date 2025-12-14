import { useEffect, useState } from 'react';
import { Download, Printer, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import type { Report } from '@/lib/types';
import { api } from '@/lib/api';

interface ReportViewProps {
  report: Report;
  patientSummary?: string;
  keywords?: string[];
  onDownload?: () => void;
  onPrint?: () => void;
}

export function ReportView({ report, patientSummary, keywords, onDownload, onPrint }: ReportViewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        setLoading(true);
        const response = await api.get(
          `/patients/${report.patient_id}/reports/${report.report_id}/pdf`,
          { responseType: 'blob' }
        );
        const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        setPdfUrl(url);
      } catch (err) {
        console.error("Failed to load PDF", err);
        setError("Failed to load PDF report.");
      } finally {
        setLoading(false);
      }
    };

    if (report.patient_id && report.report_id) {
      fetchPdf();
    }
  }, [report.patient_id, report.report_id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Generating PDF Report...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6 text-center text-destructive">
          <p>{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 h-full min-h-[133.35vh] flex flex-col ">
      {/* 1. PDF Display */}
      {pdfUrl && (
        <iframe
          src={pdfUrl}
          className="w-full h-[100vh] border shadow-sm bg-white"
          title="Medical Report PDF"
        />
      )}

      {/* 2. Download Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => {
            if (pdfUrl) {
              const link = document.createElement('a');
              link.href = pdfUrl;
              link.download = `Healio_Report_${report.report_id}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          }}
          className="w-full"
          disabled={!pdfUrl}
        >
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </div>

      {/* 3. Summary */}
      {patientSummary && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2 text-sm">Summary</h4>
            <div className="text-sm text-muted-foreground leading-relaxed">
              {patientSummary.split(/(\*\*.*?\*\*)/g).map((part, i) =>
                part.startsWith('**') && part.endsWith('**') ? (
                  <strong key={i} className="text-foreground">{part.slice(2, -2)}</strong>
                ) : (
                  part
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Keywords */}
      {keywords && keywords.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2 text-sm">Keywords</h4>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <span key={index} className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs">
                  {keyword}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
