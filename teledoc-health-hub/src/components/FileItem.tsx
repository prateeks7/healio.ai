import { FileText, Image as ImageIcon, Download, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { formatFileSize, getFileExtension } from '@/lib/format';

interface FileItemProps {
  file: {
    name: string;
    size: number;
    type?: string;
  };
  progress?: number;
  onDownload?: () => void;
  onView?: () => void;
}

export function FileItem({ file, progress, onDownload, onView }: FileItemProps) {
  const isImage = file.type?.startsWith('image/');
  const extension = getFileExtension(file.name);
  const isUploading = progress !== undefined && progress < 100;

  return (
    <Card className="p-4">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            {isImage ? (
              <ImageIcon className="h-6 w-6 text-primary" />
            ) : (
              <FileText className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium truncate">{file.name}</p>
            {extension && (
              <span className="ml-2 text-xs font-mono bg-muted px-2 py-0.5 rounded">
                {extension}
              </span>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mb-2">
            {formatFileSize(file.size)}
          </p>

          {isUploading ? (
            <div className="space-y-2">
              <Progress value={progress} className="h-1" />
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Uploading... {Math.round(progress)}%</span>
              </div>
            </div>
          ) : (
            <div className="flex space-x-2">
              {onView && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onView}
                  className="h-7 text-xs"
                >
                  View
                </Button>
              )}
              {onDownload && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onDownload}
                  className="h-7 text-xs"
                >
                  <Download className="mr-1 h-3 w-3" />
                  Download
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
