import { useEffect, useRef, useState } from 'react';
import { formatDateTime } from '@/lib/format';
import { Card } from './ui/card';
import { Avatar } from './ui/avatar';
import { User, Bot, Loader2, FileIcon } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';
import { getProfile } from '@/lib/auth';
import { api } from '@/lib/api';

interface ChatThreadProps {
  messages: ChatMessage[];
  isAgentTyping?: boolean;
}

function AttachmentImage({ fileId, patientId }: { fileId: string; patientId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchImage = async () => {
      try {
        const response = await api.get(`/patients/${patientId}/uploads/${fileId}`, {
          responseType: 'blob',
        });
        if (active) {
          const url = URL.createObjectURL(response.data);
          setSrc(url);
        }
      } catch (err) {
        console.error("Failed to load image", err);
        if (active) setError(true);
      }
    };
    fetchImage();
    return () => {
      active = false;
      if (src) URL.revokeObjectURL(src);
    };
  }, [fileId, patientId]);

  if (error) return <div className="text-xs text-destructive flex items-center"><FileIcon className="h-4 w-4 mr-1" /> Failed to load image</div>;
  if (!src) return <div className="h-20 w-20 bg-muted animate-pulse rounded" />;

  return (
    <img
      src={src}
      alt="Attachment"
      className="max-w-[200px] max-h-[200px] rounded-md border mt-2"
    />
  );
}

export function ChatThread({ messages, isAgentTyping }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const profile = getProfile();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentTyping]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex items-start space-x-3 ${message.role === 'patient' ? 'justify-end' : 'justify-start'
            }`}
        >
          {message.role === 'agent' && (
            <Avatar className="h-8 w-8 flex-shrink-0 bg-primary">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </Avatar>
          )}

          <div
            className={`max-w-[70%] ${message.role === 'patient' ? 'order-first' : ''
              }`}
          >
            <Card
              className={`p-3 ${message.role === 'patient'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
                }`}
            >
              <div className="text-sm whitespace-pre-wrap">
                {message.content.split(/(\*\*.*?\*\*)/g).map((part, i) =>
                  part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={i}>{part.slice(2, -2)}</strong>
                  ) : (
                    part
                  )
                )}
              </div>

              {/* Remote Attachments */}
              {message.attachments && message.attachments.length > 0 && profile?.patient_id && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.attachments.map(fileId => (
                    <AttachmentImage key={fileId} fileId={fileId} patientId={profile.patient_id!} />
                  ))}
                </div>
              )}

              {/* Local Attachments (Optimistic) */}
              {message.localAttachments && message.localAttachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.localAttachments.map((file, i) => (
                    <img
                      key={i}
                      src={URL.createObjectURL(file)}
                      alt="Uploading..."
                      className="max-w-[200px] max-h-[200px] rounded-md border mt-2 opacity-70"
                      onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                    />
                  ))}
                </div>
              )}

              {/* Report Card */}
              {message.report_id && profile?.patient_id && (
                <div className="mt-3 p-3 bg-background rounded-md border shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <FileIcon className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-sm">Medical Report Ready</span>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const response = await api.get(
                          `/patients/${profile.patient_id}/reports/${message.report_id}/pdf`,
                          { responseType: 'blob' }
                        );
                        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                        window.open(url, '_blank');
                      } catch (error) {
                        console.error("Failed to download PDF", error);
                        // Optional: Add toast here if we had access to toast hook, 
                        // but we are in a component. For now console error is enough or we could pass a handler.
                        alert("Failed to download report. Please try again.");
                      }
                    }}
                    className="text-xs text-primary hover:underline flex items-center cursor-pointer"
                  >
                    View PDF Report
                  </button>
                </div>
              )}
            </Card>
            <p className="text-xs text-muted-foreground mt-1 px-1">
              {(() => {
                try {
                  const date = new Date(message.ts);
                  if (isNaN(date.getTime())) return '';
                  return formatDateTime(date);
                } catch (e) {
                  return '';
                }
              })()}
            </p>
          </div>

          {message.role === 'patient' && (
            <Avatar className="h-8 w-8 flex-shrink-0 bg-accent">
              <User className="h-5 w-5 text-accent-foreground" />
            </Avatar>
          )}
        </div>
      ))}

      {isAgentTyping && (
        <div className="flex items-start space-x-3 justify-start">
          <Avatar className="h-8 w-8 flex-shrink-0 bg-primary">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </Avatar>
          <Card className="p-3 bg-muted">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">AI is thinking...</span>
            </div>
          </Card>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
