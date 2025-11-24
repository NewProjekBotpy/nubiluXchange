import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import CardSkeleton from "@/components/admin/CardSkeleton";
import { EmptyState } from "@/components/admin/EmptyState";
import {
  Upload,
  File,
  Image as ImageIcon,
  Video,
  FileText,
  Trash2,
  Download,
  Search,
  RefreshCw,
  HardDrive,
  Clock,
  AlertTriangle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FileManagementTabProps {
  hasAdminAccess?: boolean;
}

interface FileItem {
  id: number;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedBy: number;
  uploaderUsername: string;
  createdAt: string;
  url: string;
}

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  imageCount: number;
  videoCount: number;
  documentCount: number;
  otherCount: number;
}

export default function FileManagementTab({ hasAdminAccess = false }: FileManagementTabProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: files = [], isLoading: filesLoading, error: filesError, refetch: refetchFiles } = useQuery<FileItem[]>({
    queryKey: ['/api/admin/files'],
    enabled: hasAdminAccess,
    refetchInterval: false,
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<StorageStats>({
    queryKey: ['/api/admin/files/stats'],
    enabled: hasAdminAccess,
    refetchInterval: false,
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      return apiRequest(`/api/admin/files/${fileId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/files/stats'] });
      toast({
        title: "File deleted",
        description: "The file has been removed successfully"
      });
      setDeleteDialogOpen(false);
      setSelectedFile(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive"
      });
    }
  });

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-400" />;
    if (mimetype.startsWith('video/')) return <Video className="h-5 w-5 text-purple-400" />;
    if (mimetype.includes('pdf') || mimetype.includes('document')) return <FileText className="h-5 w-5 text-red-400" />;
    return <File className="h-5 w-5 text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(file =>
    file.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.uploaderUsername.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!hasAdminAccess) {
    return (
      <EmptyState
        icon={HardDrive}
        title="Access Denied"
        description="You don't have permission to access file management."
      />
    );
  }

  if (filesLoading || statsLoading) {
    return <CardSkeleton variant="card" count={5} />;
  }

  if (filesError || statsError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Error Loading File Data"
        description="Failed to load file management data. Please try again."
        action={{
          label: "Retry",
          onClick: () => refetchFiles()
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <HardDrive className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">File Management</h2>
            <p className="text-sm text-gray-400">Manage uploaded files and storage</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetchFiles()}
          disabled={filesLoading}
          data-testid="button-refresh-files"
        >
          <RefreshCw className={`h-4 w-4 ${filesLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Storage Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-nxe-surface border-nxe-border" data-testid="card-total-files">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <File className="h-4 w-4" />
              Total Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {statsLoading ? '...' : stats?.totalFiles || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border" data-testid="card-total-size">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Storage Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {statsLoading ? '...' : formatFileSize(stats?.totalSize || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border" data-testid="card-images">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {statsLoading ? '...' : stats?.imageCount || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border" data-testid="card-videos">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Video className="h-4 w-4" />
              Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">
              {statsLoading ? '...' : stats?.videoCount || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border" data-testid="card-documents">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {statsLoading ? '...' : stats?.documentCount || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search files by name or uploader..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-nxe-surface border-nxe-border text-white"
          data-testid="input-search-files"
        />
      </div>

      {/* Files List */}
      <Card className="bg-nxe-surface border-nxe-border">
        <CardContent className="p-0">
          {filesLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="h-4 bg-nxe-surface rounded w-3/4"></div>
                  <div className="h-3 bg-nxe-surface rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredFiles.length > 0 ? (
            <ScrollArea className="h-[500px]">
              <div className="divide-y divide-nxe-surface">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-4 hover:bg-nxe-surface/50 transition-colors"
                    data-testid={`file-item-${file.id}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {getFileIcon(file.mimetype)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{file.originalName}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>By {file.uploaderUsername}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(file.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(file.url, '_blank')}
                          data-testid={`button-download-${file.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedFile(file);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          data-testid={`button-delete-${file.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-12 text-center text-gray-400">
              <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No files found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-nxe-surface border-nxe-border">
          <DialogHeader>
            <DialogTitle className="text-white">Delete File</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedFile && (
            <div className="bg-nxe-dark p-4 rounded-lg">
              <div className="flex items-center gap-3">
                {getFileIcon(selectedFile.mimetype)}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{selectedFile.originalName}</p>
                  <p className="text-sm text-gray-400">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedFile(null);
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedFile && deleteFileMutation.mutate(selectedFile.id)}
              disabled={deleteFileMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
