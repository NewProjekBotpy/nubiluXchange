import { useState, useEffect } from "react";
import { logError } from '@/lib/logger';
import { ArrowLeft, Plus, Clock, Eye, MoreVertical, PlayCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import WhatsAppStatusEditor from "@/components/WhatsAppStatusEditor";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BolderAvatar } from "@/components/ui/bolder-avatar";

interface MyStatusUpdate {
  id: number;
  userId: number;
  content: string | null;
  description: string | null;
  media: string | null;
  mediaType: string | null;
  duration: number | null;
  backgroundColor: string | null;
  viewCount: number;
  createdAt: string;
  expiresAt: string | null;
  username: string;
}

export default function UploadStatus() {
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState<number | null>(null);
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [statusProgress, setStatusProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();

  // Fetch user's own status updates
  const { data: myStatusesRaw = [], isLoading: isLoadingMyStatuses } = useQuery<MyStatusUpdate[]>({
    queryKey: ['/api/status/mine'],
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Sort statuses - newest first (most recent at the top) for display
  const myStatuses = [...myStatusesRaw].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Reversed array for viewer (oldest first)
  const reversedStatuses = [...myStatuses].reverse();

  // Delete status mutation
  const deleteStatusMutation = useMutation({
    mutationFn: async (statusId: number) => {
      return await apiRequest(`/api/status/${statusId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/status/mine'] });
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      toast({
        title: "Status dihapus",
        description: "Status Anda telah dihapus",
      });
      setStatusToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Gagal menghapus status",
        description: error.message || "Silakan coba lagi",
        variant: "destructive",
      });
      setStatusToDelete(null);
    }
  });

  const handleDeleteStatus = (statusId: number) => {
    setStatusToDelete(statusId);
  };

  const confirmDeleteStatus = () => {
    if (statusToDelete) {
      deleteStatusMutation.mutate(statusToDelete);
    }
  };

  const handleOpenStatus = (index: number) => {
    // Reverse index so oldest status shows first
    const reversedIndex = myStatuses.length - 1 - index;
    setCurrentStatusIndex(reversedIndex);
    setShowStatusViewer(true);
    setStatusProgress(0);
  };

  // Auto-progress status viewer (using reversed array - oldest to newest)
  useEffect(() => {
    if (!showStatusViewer || isPaused) return;
    
    const timer = setInterval(() => {
      setStatusProgress(prev => {
        if (prev >= 100) {
          if (currentStatusIndex < reversedStatuses.length - 1) {
            setCurrentStatusIndex(currentStatusIndex + 1);
            return 0;
          } else {
            setShowStatusViewer(false);
            return 100;
          }
        }
        return prev + 2;
      });
    }, 100);
    
    return () => clearInterval(timer);
  }, [showStatusViewer, isPaused, currentStatusIndex, reversedStatuses.length]);

  // Handle pause/resume
  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleWhatsAppStatusPost = async (
    content: string,
    mediaFile: File | null,
    mediaType: 'text' | 'image' | 'video',
    caption: string,
    backgroundColor?: string,
    stickers?: Array<{id: string, emoji: string, x: number, y: number}>,
    textOverlays?: Array<{id: string, text: string, x: number, y: number, color: string}>,
    trimStart?: number,
    trimEnd?: number,
    musicFile?: File | null,
    drawingData?: string | null,
    musicUrlParam?: string
  ) => {
    if (!isAuthenticated) {
      toast({
        title: "Login diperlukan",
        description: "Silakan login untuk memposting status",
        variant: "destructive",
      });
      setLocation('/auth');
      return;
    }

    // Close editor immediately
    setShowStatusEditor(false);
    
    // Show uploading state
    setIsSubmitting(true);
    setIsUploading(true);

    try {
      let mediaUrl = '';
      let musicUrl = musicUrlParam || ''; // Use URL from Deezer API if provided
      
      // Upload media if exists - use correct endpoint based on media type
      if (mediaFile) {
        const formData = new FormData();
        
        // Use /api/upload/media-files for all status media (images and videos)
        formData.append('files', mediaFile);
        
        const uploadResponse = await apiRequest('/api/upload/media-files', {
          method: 'POST',
          body: formData
        });
        
        mediaUrl = uploadResponse.files[0].url;
      }

      // Upload music file if exists (only if musicUrlParam not provided)
      if (musicFile && !musicUrlParam) {
        const musicFormData = new FormData();
        musicFormData.append('files', musicFile);
        
        const musicUploadResponse = await apiRequest('/api/upload/media-files', {
          method: 'POST',
          body: musicFormData
        });
        
        musicUrl = musicUploadResponse.files[0].url;
      }

      // Determine duration based on media type and trim
      let duration = 15;
      if (mediaFile && mediaType === 'video') {
        if (trimStart !== undefined && trimEnd !== undefined) {
          duration = Math.min(Math.ceil(trimEnd - trimStart), 30);
        } else {
          const video = document.createElement('video');
          video.src = URL.createObjectURL(mediaFile);
          await new Promise((resolve) => {
            video.onloadedmetadata = () => {
              duration = Math.min(Math.ceil(video.duration), 30);
              URL.revokeObjectURL(video.src);
              resolve(null);
            };
          });
        }
      }

      // Create status with stickers, textOverlays, trim data, music, and drawing
      await apiRequest('/api/status', {
        method: 'POST',
        body: {
          content: content || null,
          description: caption || null,
          media: mediaUrl || null,
          mediaType: mediaType,
          duration: duration,
          isPublic: true,
          backgroundColor: backgroundColor,
          stickers: stickers || [],
          textOverlays: textOverlays || [],
          trimStart: trimStart,
          trimEnd: trimEnd,
          musicUrl: musicUrl || null,
          drawingData: drawingData || null
        }
      });

      // Wait for refetch to complete and get the new data before hiding loading
      await queryClient.refetchQueries({ 
        queryKey: ['/api/status/mine'],
        type: 'active'
      });
      
      // Also invalidate the general status list
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });

      toast({
        title: "Status diposting!",
        description: "Status Anda akan hilang dalam 24 jam",
      });

      // Stay on this page to show the new status in "Status Saya" section
    } catch (error: any) {
      logError('Status creation error', error as Error);
      toast({
        title: "Gagal memposting status",
        description: error.message || "Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nxe-dark">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-nxe-dark border-b border-nxe-surface px-4 py-3">
        <div className="flex items-center space-x-3">
          <Button 
            type="button"
            variant="ghost" 
            size="sm" 
            className="p-2 text-white hover:bg-gray-800 rounded-xl" 
            data-testid="button-back"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLocation('/upload');
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-white truncate" data-testid="text-page-title">Status Update</h1>
            <p className="text-sm text-gray-400 truncate" data-testid="text-page-description">Bagikan momen Anda</p>
          </div>
        </div>
      </div>

      {/* Mobile Form Content */}
      <div className="pb-6">
        <div className="space-y-4 pb-6">
          {/* Status Section - Horizontal Scrollable */}
          <div className="px-0 py-4">
            <h2 className="text-lg font-semibold text-white mb-4 px-4">Status Saya</h2>
            {isLoadingMyStatuses ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nxe-primary"></div>
              </div>
            ) : (
              <div className={`pb-2 px-4 gap-3 ${
                myStatuses.length >= 4 
                  ? 'grid grid-cols-4 justify-items-center' 
                  : 'flex overflow-x-auto scrollbar-hide'
              }`}>
                {/* Add Status Button */}
                <div className="flex flex-col items-center min-w-max" data-testid="add-status-container">
                  <div className="relative">
                    <div className="bg-gradient-to-br from-gray-900/60 via-gray-800/40 to-gray-900/60 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden shadow-2xl border border-white/10 relative group" style={{borderRadius: '18px', width: '70px', height: '115px'}}>
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 rounded-3xl opacity-60 group-hover:opacity-100 transition-all duration-500"></div>
                      <div className="absolute inset-2 border border-emerald-500/20 animate-pulse group-hover:border-emerald-400/40 transition-colors duration-500 rounded-3xl"></div>
                      
                      <button
                        onClick={() => setShowStatusEditor(true)}
                        className="absolute inset-0 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 z-10"
                        data-testid="button-add-status"
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30 relative overflow-hidden transition-all duration-300 group-hover:scale-110"
                          style={{
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.2) 50%, rgba(255, 255, 255, 0.3) 100%)',
                            boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.3), inset 0 2px 0 0 rgba(255, 255, 255, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          <Plus className="h-5 w-5 text-black relative z-10 transition-transform duration-300 group-hover:rotate-90" style={{ mixBlendMode: 'multiply', opacity: 0.7 }} />
                        </div>
                      </button>
                    </div>
                    <p className="text-xs text-white/90 mt-1 text-center max-w-[70px] truncate font-medium">Tambah</p>
                  </div>
                </div>

                {/* Uploading Status Card */}
                {isUploading && (
                  <div className="flex flex-col items-center min-w-max" data-testid="uploading-status-container">
                    <div className="relative">
                      <div className="relative overflow-hidden shadow-2xl backdrop-blur-xl transition-all duration-500" style={{borderRadius: '18px', width: '70px', height: '115px'}}>
                        {/* Background gradient */}
                        <div 
                          className="absolute inset-0 backdrop-blur-xl"
                          style={{
                            borderRadius: '18px',
                            background: 'radial-gradient(circle at 30% 20%, rgba(59,130,246,0.6) 0%, rgba(59,130,246,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(59,130,246,0.4) 0%, rgba(59,130,246,0.1) 40%, transparent 80%)'
                          }}
                        />
                        
                        {/* Loading spinner */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                          <div className="animate-spin rounded-full h-7 w-7 border-2 border-white border-t-transparent"></div>
                          <p className="text-[10px] text-white/90 mt-2 text-center px-1 font-medium" data-testid="text-uploading">
                            Upload...
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-white/90 mt-1 text-center max-w-[70px] truncate font-medium">Status Baru</p>
                    </div>
                  </div>
                )}

                {/* Status Updates */}
                {myStatuses.length === 0 && !isUploading ? (
                  <div className="flex-1 flex items-center justify-center py-8 px-4">
                    <div className="text-center">
                      <Clock className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">
                        Belum ada status. Buat status pertama Anda!
                      </p>
                    </div>
                  </div>
                ) : (
                  myStatuses.map((status, index) => {
                    const avatarColors = ["orange", "blue", "green", "pink", "purple", "cyan", "gold", "red"];
                    const selectedColor = avatarColors[index % avatarColors.length] as "orange" | "blue" | "green" | "pink" | "purple" | "cyan" | "gold" | "red";
                    const previewImage = status.media;
                    
                    return (
                      <div key={status.id} className="flex flex-col items-center min-w-max relative" data-testid={`card-status-${status.id}`}>
                        <div className="relative">
                          <div className="relative overflow-hidden shadow-2xl backdrop-blur-xl group hover:shadow-3xl transition-all duration-500" style={{borderRadius: '18px', width: '70px', height: '115px'}}>
                            {/* Background with image or gradient */}
                            <div 
                              className="absolute inset-0 backdrop-blur-xl transition-all duration-500 group-hover:scale-105"
                              data-testid={`background-oval-${status.id}`}
                              style={{
                                borderRadius: '18px',
                                background: previewImage 
                                  ? `linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%), url(${previewImage}) center/cover`
                                  : selectedColor === 'orange' 
                                  ? 'radial-gradient(circle at 30% 20%, rgba(255,140,66,0.6) 0%, rgba(255,140,66,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(249,115,22,0.4) 0%, rgba(255,140,66,0.1) 40%, transparent 80%)'
                                  : selectedColor === 'blue'
                                  ? 'radial-gradient(circle at 30% 20%, rgba(59,130,246,0.6) 0%, rgba(59,130,246,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(59,130,246,0.4) 0%, rgba(59,130,246,0.1) 40%, transparent 80%)'
                                  : selectedColor === 'green'
                                  ? 'radial-gradient(circle at 30% 20%, rgba(34,197,94,0.6) 0%, rgba(34,197,94,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(34,197,94,0.4) 0%, rgba(34,197,94,0.1) 40%, transparent 80%)'
                                  : selectedColor === 'pink'
                                  ? 'radial-gradient(circle at 30% 20%, rgba(236,72,153,0.6) 0%, rgba(236,72,153,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(236,72,153,0.4) 0%, rgba(236,72,153,0.1) 40%, transparent 80%)'
                                  : selectedColor === 'purple'
                                  ? 'radial-gradient(circle at 30% 20%, rgba(147,51,234,0.6) 0%, rgba(147,51,234,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(147,51,234,0.4) 0%, rgba(147,51,234,0.1) 40%, transparent 80%)'
                                  : selectedColor === 'cyan'
                                  ? 'radial-gradient(circle at 30% 20%, rgba(6,182,212,0.6) 0%, rgba(6,182,212,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(6,182,212,0.4) 0%, rgba(6,182,212,0.1) 40%, transparent 80%)'
                                  : selectedColor === 'gold'
                                  ? 'radial-gradient(circle at 30% 20%, rgba(245,158,11,0.6) 0%, rgba(245,158,11,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(245,158,11,0.4) 0%, rgba(245,158,11,0.1) 40%, transparent 80%)'
                                  : 'radial-gradient(circle at 30% 20%, rgba(239,68,68,0.6) 0%, rgba(239,68,68,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(239,68,68,0.4) 0%, rgba(239,68,68,0.1) 40%, transparent 80%)'
                              }}
                            />
                            
                            {/* View count at bottom */}
                            <div className="absolute bottom-2 left-0 right-0 flex flex-col items-center z-10">
                              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                                <Eye className="h-2.5 w-2.5 text-white" />
                                <span className="text-[10px] text-white" data-testid={`text-view-count-${status.id}`}>
                                  {status.viewCount || 0}
                                </span>
                              </div>
                            </div>
                            
                            {/* Clickable overlay */}
                            <button 
                              onClick={() => handleOpenStatus(index)}
                              className="absolute inset-0 hover:scale-105 transition-all duration-300"
                              data-testid={`button-open-status-${status.id}`}
                            />
                          </div>
                        </div>
                        
                        {/* Delete button */}
                        <div className="mt-0.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-0.5 h-auto text-gray-400 hover:text-white"
                                data-testid={`button-more-${status.id}`}
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-nxe-surface border-nxe-accent/20">
                              <DropdownMenuItem 
                                onClick={() => handleDeleteStatus(status.id)}
                                className="text-red-400 hover:text-red-300 focus:text-red-300 cursor-pointer"
                                data-testid={`button-delete-status-${status.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hapus Status
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="bg-nxe-surface/50 p-4 mx-4 rounded-lg border border-nxe-accent/20">
            <div className="flex items-center space-x-2 text-nxe-accent mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Status Sementara</span>
            </div>
            <p className="text-sm text-gray-400">
              Status Anda akan otomatis hilang dalam 24 jam
            </p>
          </div>
        </div>
      </div>

      {/* WhatsApp Status Editor */}
      {showStatusEditor && (
        <WhatsAppStatusEditor
          onClose={() => setShowStatusEditor(false)}
          onPost={handleWhatsAppStatusPost}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={statusToDelete !== null} onOpenChange={() => setStatusToDelete(null)}>
        <AlertDialogContent className="bg-nxe-surface border-nxe-accent/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Hapus Status?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Status ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-nxe-dark text-white border-nxe-accent/20 hover:bg-nxe-dark/80"
              data-testid="button-cancel-delete"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteStatus}
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={deleteStatusMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteStatusMutation.isPending ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Viewer - Using same style as StatusBanner */}
      <AnimatePresence>
        {showStatusViewer && reversedStatuses[currentStatusIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black"
          >
            <div className="relative w-full h-full">
              {/* Header with Progress Bars */}
              <div className="absolute top-0 left-0 right-0 z-20 p-4">
                {/* Progress bars */}
                <div className="flex space-x-1 mb-3">
                  {reversedStatuses.map((_, idx) => (
                    <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-white"
                        initial={{ width: '0%' }}
                        animate={{ 
                          width: idx === currentStatusIndex ? `${statusProgress}%` : idx < currentStatusIndex ? '100%' : '0%' 
                        }}
                        transition={{ duration: 0.1, ease: 'linear' }}
                      />
                    </div>
                  ))}
                </div>

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BolderAvatar
                      src={user?.profilePicture}
                      alt={user?.username || 'User'}
                      fallback={(user?.username || 'U').charAt(0).toUpperCase()}
                      size="sm"
                      className="w-10 h-10 border-2 border-white/20"
                    />
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {user?.username || 'Anda'}
                      </p>
                      <p className="text-white/70 text-xs">
                        {formatDistanceToNow(new Date(reversedStatuses[currentStatusIndex].createdAt), { 
                          addSuffix: false, 
                          locale: localeId 
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowStatusViewer(false)}
                    className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                    data-testid="button-close-status-viewer"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Navigation Areas */}
              <button 
                onClick={() => {
                  if (currentStatusIndex > 0) {
                    setCurrentStatusIndex(currentStatusIndex - 1);
                    setStatusProgress(0);
                  }
                }}
                onTouchStart={handlePause}
                onTouchEnd={handleResume}
                onMouseDown={handlePause}
                onMouseUp={handleResume}
                onMouseLeave={handleResume}
                className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
                data-testid="button-prev-status"
              />
              <button 
                onClick={() => {
                  if (currentStatusIndex < reversedStatuses.length - 1) {
                    setCurrentStatusIndex(currentStatusIndex + 1);
                    setStatusProgress(0);
                  } else {
                    setShowStatusViewer(false);
                  }
                }}
                onTouchStart={handlePause}
                onTouchEnd={handleResume}
                onMouseDown={handlePause}
                onMouseUp={handleResume}
                onMouseLeave={handleResume}
                className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
                data-testid="button-next-status"
              />

              {/* Content with fade animation */}
              <AnimatePresence mode="wait">
                <motion.div 
                  key={reversedStatuses[currentStatusIndex].id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="flex items-center justify-center h-full px-4"
                >
                  <div className="text-center max-w-lg">
                    {reversedStatuses[currentStatusIndex].media ? (
                      <>
                        {reversedStatuses[currentStatusIndex].mediaType === 'image' ? (
                          <motion.img
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                            src={reversedStatuses[currentStatusIndex].media!}
                            alt="Status media"
                            className="max-w-full max-h-[60vh] mx-auto mb-4 rounded-lg"
                            data-testid="img-status-media"
                          />
                        ) : reversedStatuses[currentStatusIndex].mediaType === 'video' ? (
                          <video
                            src={reversedStatuses[currentStatusIndex].media!}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="max-w-full max-h-[60vh] mx-auto mb-4 rounded-lg"
                            data-testid="video-status-media"
                          />
                        ) : null}
                        {reversedStatuses[currentStatusIndex].description && (
                          <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className="text-white text-lg leading-relaxed"
                            data-testid="text-status-description"
                          >
                            {reversedStatuses[currentStatusIndex].description}
                          </motion.p>
                        )}
                      </>
                    ) : reversedStatuses[currentStatusIndex].content ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                        className="w-full h-full flex items-center justify-center p-8"
                        style={{ backgroundColor: reversedStatuses[currentStatusIndex].backgroundColor || '#1a1a1a' }}
                      >
                        <p className="text-white text-center text-2xl font-medium whitespace-pre-wrap" data-testid="text-status-content">
                          {reversedStatuses[currentStatusIndex].content}
                        </p>
                      </motion.div>
                    ) : null}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Footer - View Count */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4"
              >
                <div className="flex items-center justify-center">
                  <div className="bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-white" />
                    <span className="text-white text-sm">
                      {reversedStatuses[currentStatusIndex].viewCount || 0} dilihat
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
