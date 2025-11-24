import { useState, useRef, useEffect } from "react";
import { logError } from '@/lib/logger';
import { Camera, X, RotateCcw, Square, Aperture, Image as ImageIcon, Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const { toast } = useToast();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [recentPhotos, setRecentPhotos] = useState<string[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  useEffect(() => {
    startCamera();
    loadRecentPhotos();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      logError('Error accessing camera', error as Error);
      toast({
        title: "Tidak dapat mengakses kamera",
        description: "Pastikan izin kamera telah diberikan.",
        variant: "destructive"
      });
    }
  };

  const loadRecentPhotos = () => {
    // Load recent photos from localStorage or leave empty until proper gallery API implemented
    const storedPhotos = localStorage.getItem('recentCapturedPhotos');
    if (storedPhotos) {
      try {
        const photos = JSON.parse(storedPhotos);
        setRecentPhotos(photos.slice(0, 4)); // Show max 4 recent photos
      } catch (error) {
        logError('Error loading recent photos', error as Error);
        setRecentPhotos([]);
      }
    } else {
      setRecentPhotos([]);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `status-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      }
    }, 'image/jpeg', 0.8);
  };

  const startVideoRecording = () => {
    if (!stream) return;

    try {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      setRecordedChunks([]);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const file = new File([blob], `status-video-${Date.now()}.webm`, { type: 'video/webm' });
        onCapture(file);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      logError('Error starting recording', error as Error);
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handlePhotoSelect = async (photoUrl: string) => {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const file = new File([blob], `gallery-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
    } catch (error) {
      logError('Error loading photo', error as Error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/20"
          data-testid="button-close-camera"
        >
          <X className="h-6 w-6" />
        </Button>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFlashEnabled(!flashEnabled)}
            className={`text-white hover:bg-white/20 ${flashEnabled ? 'bg-white/20' : ''}`}
            data-testid="button-toggle-flash"
          >
            {flashEnabled ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={switchCamera}
            className="text-white hover:bg-white/20"
            data-testid="button-switch-camera"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-white text-sm font-medium">REC</span>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-6 text-white">
        {/* Recent Photos Gallery */}
        {showGallery && (
          <div className="mb-4 bg-black/50 rounded-lg p-4">
            <div className="flex space-x-3 overflow-x-auto">
              {recentPhotos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => handlePhotoSelect(photo)}
                  className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-600 hover:border-nxe-primary transition-colors"
                  data-testid={`button-select-photo-${index}`}
                >
                  <img src={photo} alt={`Recent photo ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setShowGallery(!showGallery)}
            className="text-white hover:bg-white/20"
            data-testid="button-toggle-gallery"
          >
            <ImageIcon className="h-8 w-8" />
          </Button>

          <div className="flex items-center space-x-6">
            {/* Photo capture button */}
            <Button
              variant="ghost"
              size="lg"
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/30"
              data-testid="button-capture-photo"
            >
              <Aperture className="h-10 w-10 text-white" />
            </Button>

            {/* Video record button */}
            <Button
              variant="ghost"
              size="lg"
              onClick={isRecording ? stopVideoRecording : startVideoRecording}
              className={`w-16 h-16 rounded-full border-4 ${
                isRecording 
                  ? 'border-red-500 bg-red-500 hover:bg-red-600' 
                  : 'border-white bg-white/20 hover:bg-white/30'
              }`}
              data-testid="button-record-video"
            >
              <Square className={`h-8 w-8 ${isRecording ? 'text-white' : 'text-red-500'}`} />
            </Button>
          </div>

          <div className="w-16"></div> {/* Spacer for alignment */}
        </div>
      </div>
    </div>
  );
}