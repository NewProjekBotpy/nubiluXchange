import { useState, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  File,
  FileText,
  Image,
  Video,
  X,
  Check,
  AlertCircle,
  Download,
  Eye,
  Trash2,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  category: 'fraud_evidence' | 'document' | 'screenshot' | 'other';
  uploadedBy: number;
  uploadedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  relatedId?: number;
  relatedType?: 'alert' | 'transaction' | 'user';
  url: string;
}

interface FileUploadCenterProps {
  category?: 'fraud_evidence' | 'document' | 'screenshot' | 'other';
  relatedId?: number;
  relatedType?: 'alert' | 'transaction' | 'user';
  maxFileSize?: number; // in MB
  acceptedFileTypes?: string[];
}

export default function FileUploadCenter({
  category = 'fraud_evidence',
  relatedId,
  relatedType,
  maxFileSize = 10,
  acceptedFileTypes = ['image/*', 'application/pdf', 'video/*', '.doc', '.docx']
}: FileUploadCenterProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isDragging, setIsDragging] = useState(false);

  // Fetch uploaded files
  const { data: uploadedFiles = [], isLoading } = useQuery<UploadedFile[]>({
    queryKey: ['/api/admin/files', category, relatedId],
    queryFn: () => {
      const params = new URLSearchParams({ category });
      if (relatedId) params.append('relatedId', relatedId.toString());
      if (relatedType) params.append('relatedType', relatedType);
      return apiRequest(`/api/admin/files?${params}`);
    }
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest('/api/admin/files/upload', {
        method: 'POST',
        body: formData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/files'] });
      setSelectedFiles([]);
      setUploadProgress({});
      toast({
        title: "Upload successful",
        description: "Files have been uploaded successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload files",
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest(`/api/admin/files/${fileId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/files'] });
      toast({
        title: "File deleted",
        description: "File has been deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete file",
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    validateAndAddFiles(files);
  };

  const validateAndAddFiles = (files: File[]) => {
    const maxSize = maxFileSize * 1024 * 1024; // Convert MB to bytes
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      if (file.size > maxSize) {
        errors.push(`${file.name} exceeds ${maxFileSize}MB limit`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      toast({
        title: "Some files were skipped",
        description: errors.join(', '),
        variant: "destructive"
      });
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    validateAndAddFiles(files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('category', category);
    if (relatedId) formData.append('relatedId', relatedId.toString());
    if (relatedType) formData.append('relatedType', relatedType);

    // Simulate progress (in real implementation, use XMLHttpRequest for progress tracking)
    selectedFiles.forEach((file, index) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 100);
    });

    uploadMutation.mutate(formData);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (fileType.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const getFileTypeColor = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'text-blue-400';
    if (fileType.startsWith('video/')) return 'text-purple-400';
    if (fileType.includes('pdf')) return 'text-red-400';
    return 'text-gray-400';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="bg-nxe-surface border-nxe-border">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-400" />
            Upload Files
          </CardTitle>
          <CardDescription className="text-gray-400">
            Upload fraud evidence, documents, screenshots, or other files (Max {maxFileSize}MB per file)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop Zone */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-all
              ${isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-nxe-border bg-nxe-dark hover:border-blue-500/50'
              }
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-blue-400' : 'text-gray-400'}`} />
            <p className="text-white font-medium mb-2">
              {isDragging ? 'Drop files here' : 'Drag and drop files here'}
            </p>
            <p className="text-sm text-gray-400 mb-4">or</p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              data-testid="button-browse-files"
            >
              Browse Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedFileTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-4">
              Accepted: Images, PDF, Videos, Word Documents
            </p>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white">Selected Files ({selectedFiles.length})</h3>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between p-3 bg-nxe-dark rounded-lg border border-nxe-border"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={getFileTypeColor(file.type)}>
                        {getFileIcon(file.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{file.name}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                        {uploadProgress[file.name] !== undefined && (
                          <Progress value={uploadProgress[file.name]} className="mt-2 h-1" />
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeSelectedFile(index)}
                      data-testid={`button-remove-file-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="w-full"
                data-testid="button-upload-files"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadMutation.isPending ? 'Uploading...' : `Upload ${selectedFiles.length} file(s)`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      <Card className="bg-nxe-surface border-nxe-border">
        <CardHeader>
          <CardTitle className="text-white">Uploaded Files</CardTitle>
          <CardDescription className="text-gray-400">
            {uploadedFiles.length} file(s) uploaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading files...</div>
          ) : uploadedFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No files uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 bg-nxe-dark rounded-lg border border-nxe-border hover:border-nxe-border/60 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={getFileTypeColor(file.fileType)}>
                      {getFileIcon(file.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{file.originalName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-400">{formatFileSize(file.fileSize)}</p>
                        <span className="text-gray-600">•</span>
                        <p className="text-xs text-gray-400">
                          {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                        {file.relatedType && (
                          <>
                            <span className="text-gray-600">•</span>
                            <Badge variant="outline" className="text-xs">
                              {file.relatedType} #{file.relatedId}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(file.status)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(file.url, '_blank')}
                      data-testid={`button-view-file-${file.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = file.url;
                        link.download = file.originalName;
                        link.click();
                      }}
                      data-testid={`button-download-file-${file.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(file.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-file-${file.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
