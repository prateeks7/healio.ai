import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AuthGuard } from '@/components/AuthGuard';
import { Loading } from '@/components/Loading';
import { ErrorState } from '@/components/ErrorState';
import { startChat } from '@/lib/queries';

export default function NewChatPage() {
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: startChat,
    onSuccess: (data) => {
      navigate(`/chat/${data.chat_id}`);
    },
  });

  useEffect(() => {
    mutation.mutate();
  }, []);

  if (mutation.isError) {
    return (
      <AuthGuard allowedRoles={['patient']}>
        <div className="container py-8">
          <ErrorState
            message="Failed to start chat session"
            onRetry={() => mutation.mutate()}
          />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles={['patient']}>
      <div className="container py-8">
        <Loading message="Starting consultation..." />
      </div>
    </AuthGuard>
  );
}
