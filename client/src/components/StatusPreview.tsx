import { useState, useRef, useEffect } from "react";
import { X, Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface StatusPreviewProps {
  mediaFile: File | null;
  mediaType: 'image' | 'video' | 'text';
  textContent?: string;
  onClose: () => void;
  onPost: (description: string) => void;
}

export default function StatusPreview({ 
  mediaFile, 
  mediaType, 
  textContent = '',
  onClose, 
  onPost 
}: StatusPreviewProps) {
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (mediaFile) {
      const url = URL.createObjectURL(mediaFile);
      setMediaUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [mediaFile]);

  const handlePost = () => {
    onPost(description);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
            data-testid="button-close-preview"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <Button
            onClick={handlePost}
            className="bg-nxe-primary hover:bg-nxe-primary/80 text-white"
            data-testid="button-post-status-preview"
          >
            <Send className="h-5 w-5 mr-2" />
            Post Status
          </Button>
        </div>
      </div>

      {/* Media Content */}
      <div className="flex-1 flex items-center justify-center">
        {mediaType === 'image' && mediaUrl && (
          <img
            src={mediaUrl}
            alt="Status preview"
            className="max-w-full max-h-full object-contain"
            data-testid="preview-image"
          />
        )}
        
        {mediaType === 'video' && mediaUrl && (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="max-w-full max-h-full object-contain"
            controls
            autoPlay
            loop
            data-testid="preview-video"
          />
        )}
        
        {mediaType === 'text' && (
          <div className="max-w-md w-full px-6">
            <p className="text-white text-2xl text-center font-medium leading-relaxed" data-testid="preview-text">
              {textContent}
            </p>
          </div>
        )}
      </div>

      {/* Description Input */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
        <div className="max-w-md mx-auto">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tambahkan deskripsi (opsional)..."
            className="bg-white/10 border-white/20 text-white placeholder:text-white/60 resize-none"
            rows={2}
            maxLength={200}
            data-testid="textarea-status-description"
          />
          <p className="text-xs text-white/60 mt-1 text-right">
            {description.length}/200
          </p>
        </div>
      </div>
    </div>
  );
}
