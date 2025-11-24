import { useState, useEffect } from "react";
import { logDebug } from '@/lib/logger';
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus,
  Image as ImageIcon,
  Video,
  Eye,
  Clock,
  User,
  Heart,
  MessageCircle,
  Share,
  Camera,
  X,
  Search,
  Repeat2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BolderAvatar } from "@/components/ui/bolder-avatar";

interface StatusUpdate {
  id: number;
  userId: number;
  content: string;
  media: string | null;
  mediaType: 'image' | 'video' | null;
  isPublic: boolean;
  viewCount: number;
  expiresAt: string;
  createdAt: string;
  user: {
    username: string;
    displayName?: string;
    profilePicture?: string;
    isVerified: boolean;
  };
}

export default function StatusUpdates() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showRepostDialog, setShowRepostDialog] = useState(false);
  const [repostComment, setRepostComment] = useState("");
  const [selectedStatusForRepost, setSelectedStatusForRepost] = useState<StatusUpdate | null>(null);
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [statusProgress, setStatusProgress] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  // Sample status updates for demonstration
  const sampleStatusUpdates: StatusUpdate[] = [
    {
      id: 999,
      userId: 999,
      content: "Akhirnya dapet Mythic rank di Mobile Legends! 🔥 Thanks buat semua yang udah support journey aku dari Epic! 💪",
      media: "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
      mediaType: 'image',
      isPublic: true,
      viewCount: 124,
      expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      user: {
        username: "warungtechJB",
        displayName: "WarungTech JB",
        profilePicture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        isVerified: true
      }
    },
    {
      id: 998,
      userId: 998,
      content: "Squad PUBG kita menang Chicken Dinner! 🐔 Gameplay seru banget tadi, clutch 1v4 di final circle 😎",
      media: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
      mediaType: 'image',
      isPublic: true,
      viewCount: 87,
      expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      user: {
        username: "gamingstoreJB",
        displayName: "GamingStore JB",
        profilePicture: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        isVerified: false
      }
    },
    {
      id: 997,
      userId: 997,
      content: "Setup gaming baru udah ready! RTX 4070 + Ryzen 7 7700X = perfect combo untuk streaming 🎮✨",
      media: null,
      mediaType: null,
      isPublic: true,
      viewCount: 156,
      expiresAt: new Date(Date.now() + 15 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      user: {
        username: "tokoaccJB",
        displayName: "TokoACC JB",
        profilePicture: "https://images.unsplash.com/photo-1494790108755-2616b612b634?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        isVerified: false
      }
    },
    {
      id: 996,
      userId: 996,
      content: "Jual akun Mobile Legends Mythic 100⭐ lengkap dengan 200+ skin rare! Harga nego, serious buyer only 💎",
      media: "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
      mediaType: 'image',
      isPublic: true,
      viewCount: 203,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      user: {
        username: "shopproJB",
        displayName: "ShopPro JB",
        profilePicture: undefined,
        isVerified: false
      }
    }
  ];

  // Fetch active status updates
  const { data: apiStatusUpdates = [], isLoading } = useQuery<StatusUpdate[]>({
    queryKey: ['/api/status'],
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: false, // Disable automatic polling
  });

  // Always show sample data for demo purposes (user can see oval backgrounds)
  const statusUpdates = sampleStatusUpdates;

  // Create status mutation
  const createStatusMutation = useMutation({
    mutationFn: async (data: { content: string; media?: string; mediaType?: string }) => {
      return apiRequest('/api/status', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      setShowCreateForm(false);
      setContent("");
      setSelectedFile(null);
      setPreviewUrl(null);
      toast({
        title: "Status berhasil dibuat!",
        description: "Status Anda akan hilang dalam 24 jam."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal membuat status",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const recordViewMutation = useMutation({
    mutationFn: async (statusId: number) => {
      return apiRequest(`/api/status/${statusId}/view`, {
        method: 'POST'
      });
    },
    onError: (error: any) => {
      // Silently fail - view tracking shouldn't interrupt user experience
      logDebug('View tracking error', { error });
    }
  });

  // Create repost mutation
  const createRepostMutation = useMutation({
    mutationFn: async (data: { statusId: number; comment?: string }) => {
      return apiRequest('/api/reposts', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reposts'] });
      setShowRepostDialog(false);
      setRepostComment("");
      setSelectedStatusForRepost(null);
      toast({
        title: "Berhasil repost!",
        description: "Status telah ditambahkan ke profil Anda.",
      });
    },
    onError: () => {
      toast({
        title: "Gagal melakukan repost",
        description: "Silakan coba lagi.",
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setShowCamera(false);
    // Automatically show the create form when camera capture is done
    setShowCreateForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !selectedFile) return;

    // For now, we'll just send the content
    // File upload would need additional implementation
    createStatusMutation.mutate({
      content: content.trim(),
      mediaType: selectedFile?.type.startsWith('image/') ? 'image' : selectedFile?.type.startsWith('video/') ? 'video' : undefined
    });
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffInHours = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours <= 0) return 'Kedaluwarsa';
    if (diffInHours < 24) return `${diffInHours} jam tersisa`;
    return `${Math.floor(diffInHours / 24)} hari tersisa`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Baru saja';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}j`;
    return `${Math.floor(diffInHours / 24)}h`;
  };

  const handleRepost = (status: StatusUpdate) => {
    if (!user) {
      toast({
        title: "Login diperlukan",
        description: "Silakan login untuk melakukan repost.",
        variant: "destructive",
      });
      return;
    }
    setSelectedStatusForRepost(status);
    setShowRepostDialog(true);
  };

  const handleRepostSubmit = () => {
    if (!selectedStatusForRepost) return;
    
    createRepostMutation.mutate({
      statusId: selectedStatusForRepost.id,
      comment: repostComment.trim() || undefined
    });
  };

  // Auto-progress timer for status viewer
  useEffect(() => {
    if (!showStatusViewer) return;
    
    const timer = setInterval(() => {
      setStatusProgress(prev => {
        if (prev >= 100) {
          if (currentStatusIndex < statusUpdates.length - 1) {
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
  }, [showStatusViewer, currentStatusIndex, statusUpdates.length]);

  // Track status view when viewer opens or status changes
  useEffect(() => {
    if (showStatusViewer && statusUpdates[currentStatusIndex]) {
      const status = statusUpdates[currentStatusIndex];
      // Only track if viewing someone else's status
      if (status.userId !== user?.id) {
        recordViewMutation.mutate(status.id);
      }
    }
  }, [showStatusViewer, currentStatusIndex]);

  return (
    <div className="min-h-screen bg-nxe-dark overscroll-contain">
      {/* Header - Mobile style */}
      <div className="px-4 py-3 border-b border-nxe-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Pembaruan</h1>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-nxe-surface/50 rounded-full p-2"
              data-testid="button-search"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-nxe-surface/50 rounded-full p-2"
              data-testid="button-message"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Status Section - Horizontal Scrollable */}
      <div className="px-0 py-4 border-b border-nxe-border/30">
        <h2 className="text-lg font-semibold text-white mb-4 px-4">Status</h2>
        <div className="flex overflow-x-auto pb-2 px-4 scrollbar-hide mobile-scroll" style={{gap: '2px !important'}}>
          {/* Add Status Button */}
          <div className="flex flex-col items-center min-w-max" data-testid="add-status-container">
            <div className="relative">
              {/* Premium glass-morphism oval container with enhanced interactions */}
              <div className="scroll-optimized bg-gradient-to-br from-gray-900/60 via-gray-800/40 to-gray-900/60 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden shadow-2xl border border-white/10 relative group animate-float-gentle" style={{borderRadius: 'var(--status-radius)', width: '48px !important', height: '112px !important'}}>
                {/* Elegant glow effect with hover enhancement */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 rounded-xl opacity-60 group-hover:opacity-100 transition-all duration-500 group-hover:shadow-emerald-500/25 group-hover:shadow-2xl"></div>
                
                {/* Enhanced subtle noise texture overlay */}
                <div className="absolute inset-0 opacity-[0.02] bg-noise rounded-xl group-hover:opacity-[0.04] transition-opacity duration-500"></div>
                
                {/* Breathing ring effect */}
                <div className="absolute inset-2 border border-emerald-500/20 animate-pulse group-hover:border-emerald-400/40 transition-colors duration-500" style={{borderRadius: 'var(--status-radius)'}}></div>
                
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="absolute inset-0 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 z-10"
                  data-testid="button-add-status"
                >
                  {/* Enhanced circular add button with depth and premium effects */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl relative overflow-hidden group animate-glow">
                    {/* Inner glow with pulse effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-full group-hover:from-white/40 transition-all duration-300"></div>
                    
                    {/* Rotating highlight */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full rotate-45 group-hover:rotate-90 transition-transform duration-1000"></div>
                    
                    {/* Enhanced particle system with drift animation */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-1 left-2 w-1.5 h-1.5 bg-emerald-200 rounded-full animate-particle-drift" style={{animationDelay: '0s', animationDuration: '6s'}}></div>
                      <div className="absolute top-4 right-1 w-1 h-1 bg-emerald-100 rounded-full animate-particle-drift" style={{animationDelay: '1s', animationDuration: '7s'}}></div>
                      <div className="absolute bottom-3 left-1 w-0.5 h-0.5 bg-emerald-300 rounded-full animate-particle-drift" style={{animationDelay: '2s', animationDuration: '5s'}}></div>
                      <div className="absolute bottom-1 right-3 w-1.5 h-1.5 bg-emerald-200 rounded-full animate-particle-drift" style={{animationDelay: '3s', animationDuration: '8s'}}></div>
                      <div className="absolute top-6 left-4 w-0.5 h-0.5 bg-emerald-100 rounded-full animate-particle-drift" style={{animationDelay: '4s', animationDuration: '6s'}}></div>
                      <div className="absolute top-2 right-4 w-1 h-1 bg-emerald-300 rounded-full animate-particle-drift" style={{animationDelay: '5s', animationDuration: '7s'}}></div>
                    </div>
                    
                    <Plus className="h-7 w-7 text-white relative z-10 drop-shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90" />
                  </div>
                </button>
              </div>
              <p className="text-xs text-white/90 mt-1 text-center max-w-12 truncate font-medium tracking-wide">Tambah Status</p>
            </div>
          </div>
          
          {/* Status Updates */}
          {(statusUpdates as StatusUpdate[]).map((status, index) => {
            // Dynamic colors for oval backgrounds to match the design
            const avatarColors = ["orange", "blue", "green", "pink", "purple", "cyan", "gold", "red"];
            const avatarBorderStyles = ["energy", "geometric", "neon", "crystal"];
            const selectedColor = avatarColors[index % avatarColors.length] as "orange" | "blue" | "green" | "pink" | "purple" | "cyan" | "gold" | "red";
            const selectedBorderStyle = avatarBorderStyles[index % avatarBorderStyles.length] as "energy" | "geometric" | "neon" | "crystal";
            
            // Use status media
            const previewImage = status.media;
            
            return (
              <div key={status.id} className="flex flex-col items-center min-w-max" data-testid={`card-status-${status.id}`}>
                <div className="relative">
                  {/* Premium oval container with dynamic backgrounds */}
                  <div className="scroll-optimized relative overflow-hidden shadow-2xl backdrop-blur-xl group hover:shadow-3xl transition-all duration-500" style={{borderRadius: 'var(--status-radius)', width: '48px !important', height: '112px !important'}}>
                    {/* Dynamic gradient background with enhanced vibrancy */}
                    <div 
                      className="absolute inset-0 backdrop-blur-xl transition-all duration-500 group-hover:scale-105"
                      data-testid={`background-oval-${status.id}`}
                      style={{
                        borderRadius: 'var(--status-radius)',
                        background: selectedColor === 'orange' 
                          ? 'radial-gradient(circle at 30% 20%, rgba(255,140,66,0.6) 0%, rgba(255,140,66,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(249,115,22,0.4) 0%, rgba(255,140,66,0.1) 40%, transparent 80%), linear-gradient(225deg, rgba(249,115,22,0.3) 0%, transparent 60%)' 
                          : selectedColor === 'blue'
                          ? 'radial-gradient(circle at 30% 20%, rgba(59,130,246,0.6) 0%, rgba(59,130,246,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(59,130,246,0.4) 0%, rgba(59,130,246,0.1) 40%, transparent 80%), linear-gradient(225deg, rgba(37,99,235,0.3) 0%, transparent 60%)'
                          : selectedColor === 'green'
                          ? 'radial-gradient(circle at 30% 20%, rgba(34,197,94,0.6) 0%, rgba(34,197,94,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(34,197,94,0.4) 0%, rgba(34,197,94,0.1) 40%, transparent 80%), linear-gradient(225deg, rgba(22,163,74,0.3) 0%, transparent 60%)'
                          : selectedColor === 'pink' 
                          ? 'radial-gradient(circle at 30% 20%, rgba(236,72,153,0.6) 0%, rgba(236,72,153,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(236,72,153,0.4) 0%, rgba(236,72,153,0.1) 40%, transparent 80%), linear-gradient(225deg, rgba(219,39,119,0.3) 0%, transparent 60%)'
                          : selectedColor === 'purple'
                          ? 'radial-gradient(circle at 30% 20%, rgba(147,51,234,0.6) 0%, rgba(147,51,234,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(147,51,234,0.4) 0%, rgba(147,51,234,0.1) 40%, transparent 80%), linear-gradient(225deg, rgba(124,58,237,0.3) 0%, transparent 60%)'
                          : selectedColor === 'cyan'
                          ? 'radial-gradient(circle at 30% 20%, rgba(6,182,212,0.6) 0%, rgba(6,182,212,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(6,182,212,0.4) 0%, rgba(6,182,212,0.1) 40%, transparent 80%), linear-gradient(225deg, rgba(8,145,178,0.3) 0%, transparent 60%)'
                          : selectedColor === 'gold'
                          ? 'radial-gradient(circle at 30% 20%, rgba(245,158,11,0.6) 0%, rgba(245,158,11,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(245,158,11,0.4) 0%, rgba(245,158,11,0.1) 40%, transparent 80%), linear-gradient(225deg, rgba(217,119,6,0.3) 0%, transparent 60%)'
                          : 'radial-gradient(circle at 30% 20%, rgba(239,68,68,0.6) 0%, rgba(239,68,68,0.2) 35%, transparent 70%), linear-gradient(135deg, rgba(239,68,68,0.4) 0%, rgba(239,68,68,0.1) 40%, transparent 80%), linear-gradient(225deg, rgba(220,38,38,0.3) 0%, transparent 60%)'
                      }}
                    />
                    
                    {/* Simplified particle system with reduced animations for better performance */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{borderRadius: 'var(--status-radius)'}}>
                      {/* Reduced to 2 particles for better scroll performance */}
                      <div 
                        className="absolute w-1.5 h-1.5 rounded-full animate-particle-drift"
                        style={{
                          backgroundColor: selectedColor === 'orange' ? 'rgba(249,115,22,0.6)' 
                                        : selectedColor === 'blue' ? 'rgba(59,130,246,0.6)'
                                        : selectedColor === 'green' ? 'rgba(34,197,94,0.6)'
                                        : selectedColor === 'pink' ? 'rgba(236,72,153,0.6)'
                                        : selectedColor === 'purple' ? 'rgba(147,51,234,0.6)'
                                        : selectedColor === 'cyan' ? 'rgba(6,182,212,0.6)'
                                        : selectedColor === 'gold' ? 'rgba(245,158,11,0.6)'
                                        : 'rgba(239,68,68,0.6)',
                          top: '15%',
                          left: '15%',
                          animationDelay: '0s',
                          animationDuration: '8s'
                        }}
                      ></div>
                      <div 
                        className="absolute w-1 h-1 rounded-full animate-particle-drift"
                        style={{
                          backgroundColor: selectedColor === 'orange' ? 'rgba(255,140,66,0.5)' 
                                        : selectedColor === 'blue' ? 'rgba(37,99,235,0.5)'
                                        : selectedColor === 'green' ? 'rgba(22,163,74,0.5)'
                                        : selectedColor === 'pink' ? 'rgba(219,39,119,0.5)'
                                        : selectedColor === 'purple' ? 'rgba(124,58,237,0.5)'
                                        : selectedColor === 'cyan' ? 'rgba(8,145,178,0.5)'
                                        : selectedColor === 'gold' ? 'rgba(217,119,6,0.5)'
                                        : 'rgba(220,38,38,0.5)',
                          bottom: '20%',
                          right: '15%',
                          animationDelay: '4s',
                          animationDuration: '9s'
                        }}
                      ></div>
                    </div>
                    
                    {/* Enhanced preview image overlay with depth */}
                    {previewImage && (
                      <div className="absolute inset-0 overflow-hidden shadow-inner" style={{borderRadius: 'var(--status-radius)'}}>
                        <img 
                          src={previewImage} 
                          alt="Preview" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          data-testid={`img-preview-${status.id}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20"></div>
                        {/* Shimmer effect overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 animate-shimmer"></div>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => {
                        setCurrentStatusIndex(index);
                        setShowStatusViewer(true);
                        setStatusProgress(0);
                      }}
                      className="absolute inset-0 flex items-start justify-start pt-2 pl-2 hover:scale-105 active:scale-95 transition-all duration-300 z-20"
                      data-testid={`button-open-status-${status.id}`}
                    >
                      <div className="relative">
                        {/* Enhanced avatar with dynamic border */}
                        <div 
                          className="w-11 h-11 rounded-full p-0.5 shadow-xl"
                          style={{
                            background: selectedColor === 'orange' 
                              ? 'linear-gradient(135deg, #FF8C42, #F97316)' 
                              : selectedColor === 'blue'
                              ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                              : selectedColor === 'green'
                              ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                              : selectedColor === 'pink' 
                              ? 'linear-gradient(135deg, #EC4899, #DB2777)'
                              : selectedColor === 'purple'
                              ? 'linear-gradient(135deg, #9333EA, #7C3AED)'
                              : selectedColor === 'cyan'
                              ? 'linear-gradient(135deg, #06B6D4, #0891B2)'
                              : selectedColor === 'gold'
                              ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                              : 'linear-gradient(135deg, #EF4444, #DC2626)'
                          }}
                        >
                          <BolderAvatar
                            src={status.user.profilePicture || undefined}
                            alt={`${status.user.displayName || status.user.username}`}
                            fallback={(status.user.displayName || status.user.username).charAt(0).toUpperCase()}
                            size="sm"
                            interactive={true}
                            className="w-full h-full shadow-lg border-2 border-black/20"
                            data-testid={`img-avatar-${status.id}`}
                          />
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-center mt-3">
                  <p 
                    className="text-xs text-white/90 text-center max-w-12 truncate font-medium tracking-wide"
                    data-testid={`text-status-name-${status.id}`}
                  >
                    {status.user.displayName || status.user.username}
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    {formatTimeRemaining(status.expiresAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full-Screen Status Viewer */}
      {showStatusViewer && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          {/* Status Content */}
          <div className="relative w-full h-full flex items-center justify-center">
            {statusUpdates[currentStatusIndex] && (
              <div className="relative w-full max-w-md h-full flex flex-col">
                {/* Header with Progress Bar */}
                <div className="absolute top-4 left-4 right-4 z-20">
                  {/* Status Progress Bar */}
                  <div className="flex space-x-1 mb-3">
                    {statusUpdates.map((_, idx) => (
                      <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white transition-all duration-100 ease-linear"
                          style={{
                            width: idx === currentStatusIndex ? `${statusProgress}%` : idx < currentStatusIndex ? '100%' : '0%'
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Profile Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <BolderAvatar
                        src={statusUpdates[currentStatusIndex].user.profilePicture || undefined}
                        alt={statusUpdates[currentStatusIndex].user.displayName || statusUpdates[currentStatusIndex].user.username}
                        fallback={(statusUpdates[currentStatusIndex].user.displayName || statusUpdates[currentStatusIndex].user.username).charAt(0).toUpperCase()}
                        size="sm"
                        className="w-12 h-12 border-2 border-white/20"
                      />
                      <div>
                        <p className="text-white font-semibold">
                          {statusUpdates[currentStatusIndex].user.displayName || statusUpdates[currentStatusIndex].user.username}
                        </p>
                        <p className="text-white/70 text-sm">
                          {formatTimeAgo(statusUpdates[currentStatusIndex].createdAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowStatusViewer(false)}
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 rounded-full p-2"
                      data-testid="button-close-status-viewer"
                    >
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                </div>

                {/* Media Content */}
                <div className="flex-1 flex items-center justify-center px-4">
                  {statusUpdates[currentStatusIndex].media ? (
                    <img
                      src={statusUpdates[currentStatusIndex].media || ''}
                      alt="Status content"
                      className="max-w-full max-h-full object-contain rounded-xl"
                      data-testid="img-status-viewer-content"
                    />
                  ) : (
                    <div className="text-center p-8">
                      <p className="text-white text-lg leading-relaxed">
                        {statusUpdates[currentStatusIndex].content}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Content */}
                <div className="absolute bottom-20 left-4 right-4 z-20">
                  <p className="text-white text-base leading-relaxed mb-4">
                    {statusUpdates[currentStatusIndex].content}
                  </p>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 p-2">
                        <Heart className="h-6 w-6" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 p-2">
                        <MessageCircle className="h-6 w-6" />
                      </Button>
                      <Button 
                        onClick={() => handleRepost(statusUpdates[currentStatusIndex])}
                        variant="ghost" 
                        size="sm" 
                        className="text-white hover:bg-white/20 p-2"
                      >
                        <Repeat2 className="h-6 w-6" />
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-white/70" />
                      <span className="text-white/70 text-sm">{statusUpdates[currentStatusIndex].viewCount}</span>
                    </div>
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
                  className="absolute left-0 top-0 w-1/3 h-full z-10"
                  data-testid="button-prev-status"
                />
                <button
                  onClick={() => {
                    if (currentStatusIndex < statusUpdates.length - 1) {
                      setCurrentStatusIndex(currentStatusIndex + 1);
                      setStatusProgress(0);
                    } else {
                      setShowStatusViewer(false);
                    }
                  }}
                  className="absolute right-0 top-0 w-1/3 h-full z-10"
                  data-testid="button-next-status"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Status Form */}
      {showCreateForm && (
        <div className="p-4 border-b border-nxe-border bg-nxe-surface/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Buat Status Baru</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-white"
                data-testid="button-close-create-form"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Textarea
              placeholder="Apa yang terjadi di game Anda hari ini?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-nxe-surface border-nxe-border text-white placeholder-gray-400 resize-none"
              rows={3}
              data-testid="textarea-status-content"
            />

            {/* Preview media jika ada */}
            {previewUrl && (
              <div className="relative">
                {selectedFile?.type.startsWith('image/') ? (
                  <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-cover rounded-lg" />
                ) : (
                  <video src={previewUrl} controls className="w-full max-h-64 rounded-lg" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                  data-testid="button-remove-preview"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-status-media"
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="text-nxe-primary"
                    data-testid="button-media"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Media
                  </Button>
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-white"
                  data-testid="button-cancel"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={!content.trim() && !selectedFile || createStatusMutation.isPending}
                  className="bg-nxe-primary hover:bg-nxe-primary/80 text-white"
                  data-testid="button-publish-status"
                >
                  {createStatusMutation.isPending ? 'Posting...' : 'Posting'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* News of the Day Section */}
      <div className="px-4 py-6 border-b border-nxe-border/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Berita Gaming Hari Ini</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-nxe-primary hover:text-nxe-primary/80"
            data-testid="button-view-all-news"
          >
            Lihat Semua
          </Button>
        </div>
        
        <div className="grid grid-cols-1 gap-4 mb-4">
          {/* Featured News */}
          <Card className="bg-gradient-to-r from-nxe-surface to-nxe-card border-nxe-border overflow-hidden">
            <CardContent className="p-0">
              <div className="flex">
                <div className="w-24 h-24 flex-shrink-0">
                  <img 
                    src="https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200" 
                    alt="Gaming news"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 p-4">
                  <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2">
                    🔥 Update Terbesar Mobile Legends 2025: Hero Cecilion Revamp
                  </h3>
                  <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                    Moonton merilis revamp besar-besaran untuk Hero Cecilion dengan skill ultimate baru yang dapat mengubah alur pertandingan dalam sekali cast...
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-nxe-primary">Gaming Indonesia</span>
                    <span className="text-xs text-gray-500">2 jam lalu</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* News Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-nxe-surface border-nxe-border/30">
              <CardContent className="p-3">
                <div className="aspect-video mb-2 rounded overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
                    alt="PUBG update"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="text-sm font-medium text-white mb-1 line-clamp-2">
                  🎮 PUBG Season 31: Map Sanhok 2.0 Hadir!
                </h4>
                <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                  Map favorit dengan visual yang lebih realistis dan weapon baru yang overpowered
                </p>
                <span className="text-xs text-gray-500">4 jam lalu</span>
              </CardContent>
            </Card>
            
            <Card className="bg-nxe-surface border-nxe-border/30">
              <CardContent className="p-3">
                <div className="aspect-video mb-2 rounded overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
                    alt="Valorant tournament"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="text-sm font-medium text-white mb-1 line-clamp-2">
                  🏆 VCT Indonesia: RRQ vs BOOM Esports
                </h4>
                <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                  Grand Final yang dinanti-nanti! Siapa yang akan mewakili Indonesia?
                </p>
                <span className="text-xs text-gray-500">6 jam lalu</span>
              </CardContent>
            </Card>

            <Card className="bg-nxe-surface border-nxe-border/30">
              <CardContent className="p-3">
                <div className="aspect-video mb-2 rounded overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
                    alt="Free Fire news"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="text-sm font-medium text-white mb-1 line-clamp-2">
                  ⚡ Free Fire: Event Tahun Baru Cina 2025
                </h4>
                <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                  Bundle skin eksklusif dan diamond gratis! Jangan sampai kelewatan
                </p>
                <span className="text-xs text-gray-500">8 jam lalu</span>
              </CardContent>
            </Card>

            <Card className="bg-nxe-surface border-nxe-border/30">
              <CardContent className="p-3">
                <div className="aspect-video mb-2 rounded overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
                    alt="Genshin Impact news"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="text-sm font-medium text-white mb-1 line-clamp-2">
                  🌟 Genshin Impact: Karakter 5-Star Terbaru
                </h4>
                <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                  Xianyun debut sebagai karakter Anemo dengan kemampuan support terbaik
                </p>
                <span className="text-xs text-gray-500">12 jam lalu</span>
              </CardContent>
            </Card>

            <Card className="bg-nxe-surface border-nxe-border/30">
              <CardContent className="p-3">
                <div className="aspect-video mb-2 rounded overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1574227567175-ad9ea3cf8b16?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
                    alt="COD Mobile news"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="text-sm font-medium text-white mb-1 line-clamp-2">
                  🎯 COD Mobile: Ranked Season 11 Dimulai
                </h4>
                <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                  Map baru Blackout 2.0 dan senjata Mythic CR-56 AMAX tersedia
                </p>
                <span className="text-xs text-gray-500">1 hari lalu</span>
              </CardContent>
            </Card>

            <Card className="bg-nxe-surface border-nxe-border/30">
              <CardContent className="p-3">
                <div className="aspect-video mb-2 rounded overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
                    alt="Gaming peripherals"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="text-sm font-medium text-white mb-1 line-clamp-2">
                  💻 Rekomendasi HP Gaming Terbaik 2025
                </h4>
                <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                  Budget 3-15 juta untuk performa maksimal di semua game mobile
                </p>
                <span className="text-xs text-gray-500">2 hari lalu</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Trending Gaming Topics */}
      <div className="px-4 py-4 border-b border-nxe-border/30">
        <h3 className="text-sm font-semibold text-white mb-3">Topik Trending</h3>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-nxe-surface border border-nxe-border text-gray-300 hover:bg-nxe-primary hover:text-white cursor-pointer">
            #MobileLegendsUpdate
          </Badge>
          <Badge className="bg-nxe-surface border border-nxe-border text-gray-300 hover:bg-nxe-primary hover:text-white cursor-pointer">
            #PUBGSeason31
          </Badge>
          <Badge className="bg-nxe-surface border border-nxe-border text-gray-300 hover:bg-nxe-primary hover:text-white cursor-pointer">
            #VCTIndonesia
          </Badge>
          <Badge className="bg-nxe-surface border border-nxe-border text-gray-300 hover:bg-nxe-primary hover:text-white cursor-pointer">
            #FreeFire2025
          </Badge>
          <Badge className="bg-nxe-surface border border-nxe-border text-gray-300 hover:bg-nxe-primary hover:text-white cursor-pointer">
            #GenshinImpact
          </Badge>
          <Badge className="bg-nxe-surface border border-nxe-border text-gray-300 hover:bg-nxe-primary hover:text-white cursor-pointer">
            #CODMobile
          </Badge>
          <Badge className="bg-nxe-surface border border-nxe-border text-gray-300 hover:bg-nxe-primary hover:text-white cursor-pointer">
            #GamingSetup2025
          </Badge>
          <Badge className="bg-nxe-surface border border-nxe-border text-gray-300 hover:bg-nxe-primary hover:text-white cursor-pointer">
            #ESportsIndonesia
          </Badge>
          <Badge className="bg-nxe-surface border border-nxe-border text-gray-300 hover:bg-nxe-primary hover:text-white cursor-pointer">
            #MythicAccount
          </Badge>
          <Badge className="bg-nxe-surface border border-nxe-border text-gray-300 hover:bg-nxe-primary hover:text-white cursor-pointer">
            #JualAkun
          </Badge>
        </div>
      </div>

      {/* Status Updates Feed */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Feed Status Update</h2>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center min-h-32" data-testid="status-updates-loading">
            <Loading variant="pulse" />
          </div>
        ) : (statusUpdates as StatusUpdate[]).length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Belum ada status update
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Jadilah yang pertama membagikan momen gaming Anda!
            </p>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-nxe-primary hover:bg-nxe-primary/80 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Buat Status Pertama
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {(statusUpdates as StatusUpdate[]).map((status: StatusUpdate) => (
              <Card
                key={status.id}
                className="bg-nxe-surface border-nxe-border hover:border-nxe-primary/30 transition-colors"
                data-testid={`status-${status.id}`}
              >
                <CardContent className="p-4">
                  {/* User Info */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-nxe-primary/20 flex items-center justify-center">
                        {status.user.profilePicture ? (
                          <img
                            src={status.user.profilePicture}
                            alt={status.user.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-nxe-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-white">
                            {status.user.displayName || status.user.username}
                          </span>
                          {status.user.isVerified && (
                            <Badge className="bg-blue-600 text-white text-xs px-1 py-0">
                              ✓
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-nxe-text">
                          <span>@{status.user.username}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(status.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTimeRemaining(status.expiresAt)}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="mb-3">
                    <p className="text-white whitespace-pre-wrap">{status.content}</p>
                    
                    {/* Media */}
                    {status.media && (
                      <div className="mt-3">
                        {status.mediaType === 'image' ? (
                          <img
                            src={status.media}
                            alt="Status media"
                            className="w-full max-h-96 object-cover rounded-lg"
                          />
                        ) : status.mediaType === 'video' ? (
                          <video
                            src={status.media}
                            controls
                            className="w-full max-h-96 rounded-lg"
                          />
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-nxe-border">
                    <div className="flex items-center space-x-4">
                      <Button variant="ghost" size="sm" className="text-nxe-text hover:text-red-500">
                        <Heart className="h-4 w-4 mr-1" />
                        <span className="text-sm">{Math.floor(Math.random() * 20) + 1}</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="text-nxe-text hover:text-blue-500">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm">{Math.floor(Math.random() * 5)}</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-nxe-text hover:text-green-500"
                        onClick={() => handleRepost(status)}
                        data-testid={`button-repost-${status.id}`}
                      >
                        <Repeat2 className="h-4 w-4 mr-1" />
                        <span className="text-sm">Repost</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="text-nxe-text hover:text-nxe-primary">
                        <Share className="h-4 w-4 mr-1" />
                        <span className="text-sm">Bagikan</span>
                      </Button>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-xs text-nxe-text">
                      <Eye className="h-3 w-3" />
                      <span>{status.viewCount} views</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Repost Dialog */}
      <Dialog open={showRepostDialog} onOpenChange={setShowRepostDialog}>
        <DialogContent className="bg-nxe-surface border-nxe-border text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Repost Status</DialogTitle>
          </DialogHeader>
          
          {selectedStatusForRepost && (
            <div className="space-y-4">
              {/* Original Status Preview */}
              <div className="bg-nxe-card/30 rounded-lg p-3 border border-nxe-border/50">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-nxe-primary/20 flex items-center justify-center">
                    {selectedStatusForRepost.user.profilePicture ? (
                      <img
                        src={selectedStatusForRepost.user.profilePicture}
                        alt={selectedStatusForRepost.user.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-3 w-3 text-nxe-primary" />
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    {selectedStatusForRepost.user.displayName || selectedStatusForRepost.user.username}
                  </span>
                  <span className="text-xs text-gray-400">@{selectedStatusForRepost.user.username}</span>
                </div>
                <p className="text-sm text-gray-300 mb-2">
                  {selectedStatusForRepost.content}
                </p>
                {selectedStatusForRepost.media && (
                  <div className="rounded overflow-hidden">
                    {selectedStatusForRepost.mediaType === 'image' ? (
                      <img
                        src={selectedStatusForRepost.media}
                        alt="Media"
                        className="w-full max-h-32 object-cover"
                      />
                    ) : selectedStatusForRepost.mediaType === 'video' ? (
                      <video
                        src={selectedStatusForRepost.media}
                        className="w-full max-h-32 object-cover"
                        muted
                      />
                    ) : null}
                  </div>
                )}
              </div>

              {/* Comment Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Tambahkan komentar (opsional)
                </label>
                <Textarea
                  value={repostComment}
                  onChange={(e) => setRepostComment(e.target.value)}
                  placeholder="Tulis komentar Anda tentang post ini..."
                  className="bg-nxe-card border-nxe-border text-white placeholder:text-gray-400 resize-none"
                  rows={3}
                  maxLength={280}
                  data-testid="textarea-repost-comment"
                />
                <div className="text-xs text-gray-400 text-right">
                  {repostComment.length}/280
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowRepostDialog(false)}
                  className="text-gray-400 hover:text-white"
                  data-testid="button-cancel-repost"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleRepostSubmit}
                  disabled={createRepostMutation.isPending}
                  className="bg-nxe-primary hover:bg-nxe-primary/80 text-white"
                  data-testid="button-confirm-repost"
                >
                  {createRepostMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Reposting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Repeat2 className="h-4 w-4" />
                      <span>Repost</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}