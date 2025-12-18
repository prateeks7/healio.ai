import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Send, AlertCircle } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { ChatThread } from '@/components/ChatThread';
import { MessageInput } from '@/components/MessageInput';
import { Loading } from '@/components/Loading';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getChat, sendMessage, runDiagnosis, runReport } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';
import { ReportView } from '@/components/ReportView';
import { getProfile } from '@/lib/auth';
import { api } from '@/lib/api';
import type { ChatMessage, Diagnostic } from '@/lib/types';

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => getChat(chatId!),
    enabled: !!chatId,
  });

  // Update local state when data changes
  useEffect(() => {
    if (data) {
      // Map backend 'user' role to frontend 'patient' role
      const mappedMessages = data.messages.map((msg: any) => ({
        ...msg,
        role: msg.role === 'user' ? 'patient' : msg.role,
      }));
      setMessages(mappedMessages);
      setSummary(data.summary || '');
      setKeywords(data.keywords || []);
    }
  }, [data]);

  const sendMutation = useMutation({
    mutationFn: ({ content, files }: { content: string; files?: File[] }) => {
      setIsAgentTyping(true);
      return sendMessage(chatId!, content, files);
    },
    onSuccess: (data) => {
      setIsAgentTyping(false);

      setMessages((prev) => [
        ...prev,
        { role: 'agent', content: data.reply, ts: new Date().toISOString() },
      ]);
      setSummary(data.summary);
      setKeywords(data.keywords);

      if (data.reply.includes('Please wait while Healio diagnoses your problem')) {
        toast({
          title: 'Interview Complete',
          description: 'Generating your medical report...',
        });
        // Trigger report generation flow
        diagnosisMutation.mutate();
      }
    },
    onError: (error: any) => {
      setIsAgentTyping(false);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    },
  });

  const diagnosisMutation = useMutation({
    mutationFn: () => api.post('/agents/diagnosis/run', { chat_id: chatId! }),
    onSuccess: (response) => {
      const data = response.data;
      setDiagnostic(data.diagnostic);
      setReportId(data.report_id);
      setSummary(data.patient_summary);
      setKeywords(data.keywords);

      toast({
        title: 'Diagnosis Complete',
        description: 'Your report has been generated.',
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: "**Diagnosis Complete.**\n\nI have generated a detailed report for you.",
          ts: new Date().toISOString(),
          report_id: data.report_id
        },
      ]);
    },
    onError: (error: any) => {
      toast({
        title: 'Diagnosis Failed',
        description: error.response?.data?.detail || 'Failed to generate diagnosis',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <AuthGuard allowedRoles={['patient']}>
        <div className="container py-8">
          <Loading message="Loading chat..." />
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard allowedRoles={['patient']}>
        <div className="container py-8">
          <ErrorState
            message="Failed to load chat"
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['chat', chatId] })}
          />
        </div>
      </AuthGuard>
    );
  }

  const quickPrompts = [
    'When did the symptoms start?',
    'Where exactly is the pain/discomfort?',
    'How severe is it on a scale of 1-10?',
    'What makes it better or worse?',
    'Any other symptoms?',
  ];

  return (
    <AuthGuard allowedRoles={['patient']}>
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="border-b bg-background p-4">
            <h2 className="text-xl font-bold">AI Medical Consultation</h2>
            <p className="text-sm text-muted-foreground">
              Describe your symptoms in detail
            </p>
          </div>

          <ChatThread
            messages={messages}
            isAgentTyping={isAgentTyping || diagnosisMutation.isPending}
          />

          <MessageInput
            onSend={(message, files) => {
              // Add user message immediately
              if (message.trim() || files?.length) {
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'patient',
                    content: message || 'Sent files',
                    ts: new Date().toISOString(),
                    localAttachments: files
                  },
                ]);
              }
              sendMutation.mutate({ content: message, files });
            }}
            disabled={sendMutation.isPending || diagnosisMutation.isPending}
          />
        </div>

        {/* Side Panel */}
        <div className="w-96 border-l bg-white p-4 overflow-y-auto space-y-4">
          {messages.some(m => m.report_id) ? (
            <ReportView
              report={{
                report_id: messages.find(m => m.report_id)?.report_id!,
                patient_id: getProfile()?.patient_id!,
                // Mock other fields as they are fetched inside ReportView or not needed for display
                chat_id: chatId!,
                doctor_report: {} as any,
                patient_summary: summary,
                created_at: new Date().toISOString(),
                reviewed: false
              }}
              patientSummary={summary}
              keywords={keywords}
            />
          ) : (
            <>
              {/* Summary */}
              {summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Session Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Keywords */}
              {keywords.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Keywords</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Diagnostic Preview */}
              {diagnostic && (
                <Card className="border-primary/50">
                  <CardHeader>
                    <CardTitle className="text-base">Diagnostic Result</CardTitle>
                    <CardDescription>
                      Urgency: <Badge className="ml-1">{diagnostic.urgency}</Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold mb-1">Primary Hypothesis:</p>
                      <p className="text-sm">{diagnostic.primary_hypothesis.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(diagnostic.primary_hypothesis.confidence * 100)}% confidence
                      </p>
                    </div>

                    {diagnostic.red_flags.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-1 text-destructive">Red Flags:</p>
                        <ul className="space-y-1">
                          {diagnostic.red_flags.map((flag, index) => (
                            <li key={index} className="text-xs flex items-start">
                              <span className="text-destructive mr-1">•</span>
                              {flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
