import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Calendar, Hash } from 'lucide-react';
import { searchChats } from '@/lib/queries';
import { getProfile } from '@/lib/auth';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { formatDate, formatTime } from '@/lib/format';

export default function ChatHistoryPage() {
  const navigate = useNavigate();
  const profile = getProfile();

  const { data: chats, isLoading, error, refetch } = useQuery({
    queryKey: ['chat-history', profile?.patient_id],
    queryFn: () => searchChats(profile?.patient_id),
    enabled: !!profile?.patient_id,
  });

  if (isLoading) {
    return (
      <AuthGuard allowedRoles={['patient']}>
        <div className="container mx-auto px-4 py-8">
          <Loading />
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard allowedRoles={['patient']}>
        <div className="container mx-auto px-4 py-8">
          <ErrorState
            title="Failed to load chat history"
            message="There was an error loading your previous conversations."
            onRetry={() => refetch()}
          />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles={['patient']}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Chat History</h1>
          <p className="text-muted-foreground">
            View and continue your previous medical consultations
          </p>
        </div>

        {!chats || chats.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No chat history yet"
            description="Start a new conversation to begin your medical consultation"
            action={
              <Button onClick={() => navigate('/chat/new')}>
                Start New Chat
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4">
            {chats.map((chat) => (
              <Card
                key={chat.chat_id}
                className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                onClick={() => navigate(`/chat/${chat.chat_id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {chat.title || chat.summary || 'Medical Consultation'}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(chat.created_at)}
                          {' at '}
                          {formatTime(chat.created_at)}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {chat.messages.length} messages
                    </Badge>
                  </div>
                </CardHeader>

                {chat.keywords && chat.keywords.length > 0 && (
                  <CardContent>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      {chat.keywords.slice(0, 5).map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
