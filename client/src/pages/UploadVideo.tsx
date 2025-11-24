import { useState } from "react";
import { logError } from '@/lib/logger';
import { ArrowLeft, PlayCircle, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

export default function UploadVideo() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [videoData, setVideoData] = useState({
    title: '',
    category: '',
    musicName: '',
    videoFile: null as File | null,
    thumbnailFile: null as File | null
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const categories = [
    { value: "mobile_legends", label: "Mobile Legends" },
    { value: "pubg_mobile", label: "PUBG Mobile" },
    { value: "free_fire", label: "Free Fire" },
    { value: "valorant", label: "Valorant" },
    { value: "genshin_impact", label: "Genshin Impact" },
    { value: "cod_mobile", label: "Call of Duty Mobile" },
    { value: "honor_of_kings", label: "Honor of Kings" },
    { value: "arena_of_valor", label: "Arena of Valor" },
  ];

  const handleVideoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast({
        title: "Autentikasi diperlukan",
        description: "Silakan login untuk upload video",
        variant: "destructive",
      });
      return;
    }

    if (!videoData.videoFile) {
      toast({
        title: "Video diperlukan",
        description: "Pilih file video",
        variant: "destructive",
      });
      return;
    }

    if (!videoData.title.trim()) {
      toast({
        title: "Judul diperlukan",
        description: "Masukkan judul video",
        variant: "destructive",
      });
      return;
    }

    if (!videoData.category) {
      toast({
        title: "Kategori diperlukan",
        description: "Pilih kategori game",
        variant: "destructive",
      });
      return;
    }

    // Video size limit check (50MB)
    if (videoData.videoFile.size > 50 * 1024 * 1024) {
      toast({
        title: "File terlalu besar",
        description: "Video harus di bawah 50MB",
        variant: "destructive",
      });
      return;
    }

    // Thumbnail size limit check (5MB)
    if (videoData.thumbnailFile && videoData.thumbnailFile.size > 5 * 1024 * 1024) {
      toast({
        title: "File thumbnail terlalu besar",
        description: "Thumbnail harus di bawah 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setIsUploading(true);

    try {
      // Upload video file
      const videoFormData = new FormData();
      videoFormData.append('files', videoData.videoFile);
      
      const videoUploadResponse = await apiRequest('/api/upload/media-files', {
        method: 'POST',
        body: videoFormData
      });
      
      const videoUrl = videoUploadResponse.files[0].url;

      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (videoData.thumbnailFile) {
        const thumbnailFormData = new FormData();
        thumbnailFormData.append('files', videoData.thumbnailFile);
        
        const thumbnailUploadResponse = await apiRequest('/api/upload/media-files', {
          method: 'POST',
          body: thumbnailFormData
        });
        
        thumbnailUrl = thumbnailUploadResponse.files[0].url;
      }

      // Create permanent video content
      await apiRequest('/api/video-content', {
        method: 'POST',
        body: {
          title: videoData.title.trim(),
          videoUrl: videoUrl,
          thumbnailUrl: thumbnailUrl,
          contentType: 'video',
          category: videoData.category,
          musicName: videoData.musicName.trim() || 'Original Sound',
          isPublic: true,
          isPinned: false
        }
      });

      toast({
        title: "Video berhasil diupload! 🎉",
        description: "Video Anda sekarang tersedia di halaman Konten.",
      });

      setVideoData({ title: '', category: '', musicName: '', videoFile: null, thumbnailFile: null });
      
      // Navigate to video feed
      setLocation('/video');
    } catch (error: any) {
      logError('Video upload error', error as Error);
      toast({
        title: "Upload gagal",
        description: error.message || "Gagal upload video. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-lg border-b border-white/10 px-4 py-3 shadow-xl">
        <div className="flex items-center space-x-3">
          <Button 
            type="button"
            variant="ghost" 
            size="sm" 
            className="p-2 text-white hover:bg-white/10" 
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
            <h1 className="text-lg font-bold text-white truncate bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent" data-testid="text-page-title">Upload Video Gaming</h1>
            <p className="text-sm text-gray-400 truncate" data-testid="text-page-description">Bagikan momen epic Anda!</p>
          </div>
        </div>
      </div>

      {/* Mobile Form Content */}
      <div className="px-4 pb-6 pt-4">
        <div className="space-y-4">
          <form id="video-form" onSubmit={handleVideoUpload} className="space-y-5 pb-24">
            {/* Title Input */}
            <div className="space-y-2">
              <Label htmlFor="video-title" className="text-white text-sm font-semibold flex items-center">
                <span className="text-green-500 mr-1">*</span>
                Judul Video
              </Label>
              <Textarea
                id="video-title"
                placeholder="Contoh: Epic Savage! 1 vs 5 Clutch Moment 🔥"
                className="bg-gray-800/50 border-gray-700/50 text-white h-20 text-base resize-none focus:border-green-500 focus:ring-green-500/20"
                required
                maxLength={200}
                value={videoData.title}
                onChange={(e) => setVideoData(prev => ({ ...prev, title: e.target.value }))}
                data-testid="input-video-title"
              />
              <p className="text-xs text-gray-500">{videoData.title.length}/200 karakter</p>
            </div>

            {/* Category Select */}
            <div className="space-y-2">
              <Label htmlFor="video-category" className="text-white text-sm font-semibold flex items-center">
                <span className="text-green-500 mr-1">*</span>
                Kategori Game
              </Label>
              <Select 
                required 
                value={videoData.category} 
                onValueChange={(value) => setVideoData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-12 focus:border-green-500 focus:ring-green-500/20" data-testid="select-video-category">
                  <SelectValue placeholder="Pilih kategori game" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {categories.map((category) => (
                    <SelectItem 
                      key={category.value} 
                      value={category.value}
                      className="text-white hover:bg-gray-800 focus:bg-gray-800"
                    >
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Music Name Input */}
            <div className="space-y-2">
              <Label htmlFor="music-name" className="text-white text-sm font-semibold">
                Nama Musik/Sound
              </Label>
              <Input
                id="music-name"
                placeholder="Contoh: Epic Gaming Music (opsional)"
                className="bg-gray-800/50 border-gray-700/50 text-white h-12 text-base focus:border-green-500 focus:ring-green-500/20"
                maxLength={100}
                value={videoData.musicName}
                onChange={(e) => setVideoData(prev => ({ ...prev, musicName: e.target.value }))}
                data-testid="input-music-name"
              />
              <p className="text-xs text-gray-500">Kosongkan jika menggunakan suara asli</p>
            </div>

            {/* Video File Upload */}
            <div className="space-y-2">
              <Label htmlFor="video-file" className="text-white text-sm font-semibold flex items-center">
                <span className="text-green-500 mr-1">*</span>
                Upload Video
              </Label>
              <div className="relative">
                <Input
                  id="video-file"
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                  className="hidden"
                  required
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setVideoData(prev => ({ ...prev, videoFile: file }));
                    e.target.value = '';
                  }}
                  data-testid="input-video-file"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-16 bg-gradient-to-r from-gray-800/50 to-gray-700/50 border-gray-700/50 border-2 border-dashed text-white hover:border-green-500 hover:bg-gray-800/70 transition-all"
                  onClick={() => document.getElementById('video-file')?.click()}
                  data-testid="button-upload-video"
                >
                  <PlayCircle className="h-6 w-6 mr-3 text-green-500" />
                  <div className="text-left">
                    <div className="font-semibold">
                      {videoData.videoFile ? videoData.videoFile.name : 'Pilih File Video'}
                    </div>
                    {!videoData.videoFile && (
                      <div className="text-xs text-gray-400">MP4, MOV, AVI, WebM (Max 50MB)</div>
                    )}
                  </div>
                </Button>
              </div>
              {videoData.videoFile && (
                <div className="flex items-center justify-between px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="text-sm text-green-400 font-medium">
                    ✓ Video dipilih
                  </div>
                  <div className="text-sm text-gray-400">
                    {(videoData.videoFile.size / 1024 / 1024).toFixed(1)}MB
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail Upload (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="thumbnail-file" className="text-white text-sm font-semibold">
                Thumbnail (Opsional)
              </Label>
              <div className="relative">
                <Input
                  id="thumbnail-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setVideoData(prev => ({ ...prev, thumbnailFile: file }));
                    e.target.value = '';
                  }}
                  data-testid="input-thumbnail-file"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-16 bg-gradient-to-r from-gray-800/50 to-gray-700/50 border-gray-700/50 border-2 border-dashed text-white hover:border-green-500 hover:bg-gray-800/70 transition-all"
                  onClick={() => document.getElementById('thumbnail-file')?.click()}
                  data-testid="button-upload-thumbnail"
                >
                  <ImageIcon className="h-6 w-6 mr-3 text-green-500" />
                  <div className="text-left">
                    <div className="font-semibold">
                      {videoData.thumbnailFile ? videoData.thumbnailFile.name : 'Pilih Gambar Thumbnail'}
                    </div>
                    {!videoData.thumbnailFile && (
                      <div className="text-xs text-gray-400">JPG, PNG, WebP (Max 5MB)</div>
                    )}
                  </div>
                </Button>
              </div>
              {videoData.thumbnailFile && (
                <div className="flex items-center justify-between px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="text-sm text-green-400 font-medium">
                    ✓ Thumbnail dipilih
                  </div>
                  <div className="text-sm text-gray-400">
                    {(videoData.thumbnailFile.size / 1024 / 1024).toFixed(2)}MB
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500">Jika tidak diupload, akan menggunakan frame pertama dari video</p>
            </div>

            {/* Upload Progress Info */}
            {isUploading && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                  <p className="text-blue-400 text-sm font-medium">Mengupload video Anda...</p>
                </div>
              </div>
            )}

            {/* Bottom Action Button */}
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent p-4 border-t border-white/10">
              <Button
                type="submit"
                form="video-form"
                disabled={isSubmitting || !videoData.videoFile || !videoData.title.trim() || !videoData.category}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white h-12 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
                data-testid="button-submit-video"
              >
                {isUploading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <PlayCircle className="w-5 h-5" />
                    <span>Upload Video</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
