import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload as UploadIcon } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { FileDropzone } from '@/components/FileDropzone';
import { FileItem } from '@/components/FileItem';
import { Loading } from '@/components/Loading';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { getProfile } from '@/lib/auth';
import { uploadFile, getUploads, getDownloadUrl } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';
import type { FileUpload } from '@/lib/types';

interface UploadProgress {
  file: File;
  progress: number;
  fileId?: string;
}

export default function UploadsPage() {
  const profile = getProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadingFiles, setUploadingFiles] = useState<UploadProgress[]>([]);

  const { data: uploads, isLoading, error } = useQuery({
    queryKey: ['uploads', profile?.patient_id],
    queryFn: () => getUploads(profile!.patient_id!),
    enabled: !!profile?.patient_id,
  });

  const mutation = useMutation({
    mutationFn: ({
      file,
      index,
    }: {
      file: File;
      index: number;
    }) =>
      uploadFile(profile!.patient_id!, file, (progress) => {
        setUploadingFiles((prev) =>
          prev.map((item, i) =>
            i === index ? { ...item, progress } : item
          )
        );
      }),
    onSuccess: (data, variables) => {
      setUploadingFiles((prev) =>
        prev.map((item, i) =>
          i === variables.index ? { ...item, fileId: data.file_id, progress: 100 } : item
        )
      );
      queryClient.invalidateQueries({ queryKey: ['uploads', profile?.patient_id] });
      toast({
        title: 'Success',
        description: `${variables.file.name} uploaded successfully`,
      });
      // Remove from uploading list after a delay
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((_, i) => i !== variables.index));
      }, 2000);
    },
    onError: (error: any, variables) => {
      toast({
        title: 'Upload Failed',
        description: `Failed to upload ${variables.file.name}`,
        variant: 'destructive',
      });
      setUploadingFiles((prev) => prev.filter((_, i) => i !== variables.index));
    },
  });

  const handleDrop = (files: File[]) => {
    const newUploads: UploadProgress[] = files.map((file) => ({
      file,
      progress: 0,
    }));
    
    setUploadingFiles((prev) => [...prev, ...newUploads]);
    
    newUploads.forEach((upload, i) => {
      const index = uploadingFiles.length + i;
      mutation.mutate({ file: upload.file, index });
    });
  };

  const handleDownload = (upload: FileUpload) => {
    const url = getDownloadUrl(profile!.patient_id!, upload.file_id);
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <AuthGuard allowedRoles={['patient']}>
        <div className="container py-8">
          <Loading message="Loading your uploads..." />
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard allowedRoles={['patient']}>
        <div className="container py-8">
          <ErrorState
            message="Failed to load uploads"
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['uploads'] })}
          />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles={['patient']}>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-12">
        <div className="container max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Medical Documents</h1>
            <p className="text-muted-foreground">
              Upload lab results, prescriptions, imaging, and other medical documents
            </p>
          </div>

          <div className="mb-8">
            <FileDropzone onDrop={handleDrop} disabled={mutation.isPending} />
          </div>

          {uploadingFiles.length > 0 && (
            <div className="mb-8 space-y-4">
              <h2 className="text-lg font-semibold">Uploading</h2>
              {uploadingFiles.map((upload, index) => (
                <FileItem
                  key={index}
                  file={{
                    name: upload.file.name,
                    size: upload.file.size,
                    type: upload.file.type,
                  }}
                  progress={upload.progress}
                />
              ))}
            </div>
          )}

          {uploads && uploads.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Your Files</h2>
              {uploads.map((upload) => (
                <FileItem
                  key={upload.file_id}
                  file={{
                    name: upload.filename,
                    size: upload.size,
                    type: upload.content_type,
                  }}
                  onDownload={() => handleDownload(upload)}
                  onView={() => handleDownload(upload)}
                />
              ))}
            </div>
          ) : (
            !isLoading &&
            uploadingFiles.length === 0 && (
              <EmptyState
                icon={UploadIcon}
                title="No files uploaded yet"
                description="Upload your medical documents to keep them organized and accessible"
              />
            )
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
