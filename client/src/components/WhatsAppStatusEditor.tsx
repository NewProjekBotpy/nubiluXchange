import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { logDebug, logWarning, logError } from '@/lib/logger';
import { X, Type, Smile, Music, Pen, Video as VideoIcon, Camera, Send, ChevronUp, Volume2, Scissors, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import StickerPicker from '@/components/status/StickerPicker';
import MusicSelector from '@/components/status/MusicSelector';

interface WhatsAppStatusEditorProps {
  onClose: () => void;
  onPost: (
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
    musicUrl?: string
  ) => void;
}

const BACKGROUND_COLORS = [
  '#F59E0B', // orange/yellow (default)
  '#EF4444', // red
  '#8B5CF6', // purple
  '#3B82F6', // blue
  '#10B981', // green
  '#EC4899', // pink
  '#6366F1', // indigo
  '#14B8A6', // teal
];

export default function WhatsAppStatusEditor({ onClose, onPost }: WhatsAppStatusEditorProps) {
  const [textContent, setTextContent] = useState('');
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'text' | 'image' | 'video'>('text');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCaptionEmojiPicker, setShowCaptionEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [stickers, setStickers] = useState<Array<{id: string, emoji: string, x: number, y: number}>>([]);
  const [showTextOverlay, setShowTextOverlay] = useState(false);
  const [textOverlays, setTextOverlays] = useState<Array<{id: string, text: string, x: number, y: number, color: string}>>([]);
  const [currentOverlayText, setCurrentOverlayText] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [videoFrames, setVideoFrames] = useState<string[]>([]);
  const [isGeneratingFrames, setIsGeneratingFrames] = useState(false);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicUrl, setMusicUrl] = useState<string>('');
  const [musicInfo, setMusicInfo] = useState<{ title: string; artist: string } | null>(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingData, setDrawingData] = useState<string | null>(null);
  const [drawingColor, setDrawingColor] = useState('#FFFFFF');
  const [drawingSize, setDrawingSize] = useState(5);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const captionInputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isDraggingRef = useRef(false);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Initialize video and prevent race conditions
  useEffect(() => {
    if (mediaFile) {
      const url = URL.createObjectURL(mediaFile);
      setMediaUrl(url);
      
      if (mediaType === 'video' && videoRef.current) {
        const video = videoRef.current;
        
        const handleLoadedMetadata = () => {
          const duration = video.duration;
          logDebug('Video metadata loaded', { duration });
          setVideoDuration(duration);
          setTrimStart(0);
          setTrimEnd(duration);
          setIsVideoPlaying(false);
          setShowPlayButton(true);
          // Generate frames after metadata is loaded
          generateVideoFrames(video);
        };
        
        const handlePlay = () => {
          setIsVideoPlaying(true);
          setShowPlayButton(false);
        };
        
        const handlePause = () => {
          setIsVideoPlaying(false);
          setShowPlayButton(true);
        };
        
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        
        return () => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
          }
          
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('play', handlePlay);
          video.removeEventListener('pause', handlePause);
          URL.revokeObjectURL(url);
        };
      }
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [mediaFile, mediaType]);

  // Improved frame generation with better visibility and error handling
  const generateVideoFrames = useCallback(async (video: HTMLVideoElement) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    // Clear stale frames immediately to show loading state
    setVideoFrames([]);
    setIsGeneratingFrames(true);
    logDebug('Starting frame generation for video', { duration: video.duration });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      logError('Failed to get canvas context', new Error('Canvas context unavailable'));
      setIsGeneratingFrames(false);
      return;
    }

    const frameCount = 10; // Increased frame count for better preview
    const frames: string[] = [];
    
    canvas.width = 100;
    canvas.height = 140;

    // Pause video for frame generation
    const wasPlaying = !video.paused;
    if (!video.paused) {
      video.pause();
    }

    try {
      for (let i = 0; i < frameCount; i++) {
        if (signal.aborted) {
          logDebug('Frame generation aborted');
          setIsGeneratingFrames(false);
          return;
        }
        
        const time = (video.duration / frameCount) * i;
        
        await new Promise<void>((resolve, reject) => {
          if (signal.aborted) {
            reject(new Error('Aborted'));
            return;
          }
          
          const seekHandler = () => {
            try {
              if (!signal.aborted) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                frames.push(canvas.toDataURL('image/jpeg', 0.7));
                logDebug(`Frame ${i + 1}/${frameCount} generated`);
              }
              resolve();
            } catch (err) {
              reject(err);
            }
          };
          
          const abortHandler = () => {
            video.removeEventListener('seeked', seekHandler);
            reject(new Error('Aborted'));
          };
          
          signal.addEventListener('abort', abortHandler, { once: true });
          video.addEventListener('seeked', seekHandler, { once: true });
          video.currentTime = time;
        });
      }

      if (!signal.aborted) {
        logDebug('Generated frames successfully', { frameCount: frames.length });
        setVideoFrames(frames);
        video.currentTime = 0;
        
        // Restore playing state if video was playing before frame generation
        if (wasPlaying) {
          video.play().catch((error) => {
            logWarning('Video playback failed', { error });
            setIsVideoPlaying(false);
            setShowPlayButton(true);
          });
        }
      }
    } catch (error) {
      if (!signal.aborted) {
        logError('Error generating frames', error as Error);
      }
    } finally {
      setIsGeneratingFrames(false);
      canvas.width = 0;
      canvas.height = 0;
    }
  }, []);

  // Clean up video frames on unmount
  useEffect(() => {
    return () => {
      setVideoFrames([]);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Drawing canvas setup and event handlers
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas || !isDrawing) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
    }

    // Restore previous drawing if exists
    if (drawingData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = drawingData;
    }

    ctx.strokeStyle = drawingColor;
    ctx.lineWidth = drawingSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const handleStart = (e: MouseEvent | TouchEvent) => {
      isDrawingRef.current = true;
      const rect = canvas.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
      const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
      const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
      
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const handleEnd = () => {
      isDrawingRef.current = false;
      ctx.closePath();
      
      // Save drawing data
      const dataUrl = canvas.toDataURL();
      setDrawingData(dataUrl);
    };

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);
    canvas.addEventListener('touchstart', handleStart);
    canvas.addEventListener('touchmove', handleMove);
    canvas.addEventListener('touchend', handleEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('mouseleave', handleEnd);
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('touchend', handleEnd);
    };
  }, [isDrawing, drawingColor, drawingSize, drawingData]);

  // Video time update handler
  useEffect(() => {
    const video = videoRef.current;
    if (mediaType === 'video' && video) {
      const handleTimeUpdate = () => {
        setCurrentVideoTime(video.currentTime);
        // Loop video within trim range
        if (video.currentTime >= trimEnd && trimEnd > 0 && trimStart < trimEnd) {
          video.currentTime = trimStart;
        }
      };
      
      video.addEventListener('timeupdate', handleTimeUpdate);
      
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [mediaType, trimStart, trimEnd]);

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setValidationError('File harus berupa gambar atau video');
      return;
    }

    if (isImage) {
      setMediaFile(file);
      setMediaType('image');
    } else if (isVideo) {
      setMediaFile(file);
      setMediaType('video');
    }
  };

  const handlePost = () => {
    setValidationError('');

    if (mediaType === 'text' && !textContent.trim()) {
      setValidationError('Ketik sesuatu untuk status teks');
      return;
    }

    if (mediaType !== 'text' && !mediaFile) {
      setValidationError('Pilih gambar atau video');
      return;
    }

    onPost(
      textContent, 
      mediaFile, 
      mediaType, 
      caption, 
      backgroundColor, 
      stickers, 
      textOverlays,
      mediaType === 'video' ? trimStart : undefined,
      mediaType === 'video' ? trimEnd : undefined,
      musicFile,
      drawingData,
      musicUrl || undefined
    );
  };

  const handleMusicSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setValidationError('File harus berupa audio/musik');
      return;
    }

    setMusicFile(file);
    setShowMusicPicker(false);
  };

  const handleMusicSelection = (url: string, trackInfo: { title: string; artist: string }) => {
    setMusicUrl(url);
    setMusicInfo(trackInfo);
    setMusicFile(null); // Clear file-based music if any
    setShowMusicPicker(false);
  };

  const removeMusicFile = () => {
    setMusicFile(null);
    setMusicUrl('');
    setMusicInfo(null);
  };

  const handleDrawingStart = () => {
    setIsDrawing(true);
  };

  const handleDrawingEnd = () => {
    setIsDrawing(false);
    if (drawingCanvasRef.current) {
      const dataUrl = drawingCanvasRef.current.toDataURL();
      setDrawingData(dataUrl);
    }
  };

  const clearDrawing = () => {
    setDrawingData(null);
    if (drawingCanvasRef.current) {
      const ctx = drawingCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
      }
    }
  };

  const handleVideoSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current || !videoRef.current) return;
    
    const video = videoRef.current;
    if (video.readyState < 2) return;
    
    const timeline = e.currentTarget;
    const rect = timeline.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * videoDuration;
    
    video.currentTime = newTime;
  }, [videoDuration]);

  const toggleVideoPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused) {
      video.play().catch(() => {
        setShowPlayButton(true);
      });
      setShowPlayButton(false);
    } else {
      video.pause();
      setShowPlayButton(true);
    }
  }, []);

  const handleVideoContainerClick = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused && !showPlayButton) {
      setShowPlayButton(true);
      return;
    }
    
    toggleVideoPlay();
  }, [showPlayButton, toggleVideoPlay]);

  const handleTrimHandleDrag = useCallback((e: React.MouseEvent | React.TouchEvent, isLeft: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    isDraggingRef.current = true;
    
    if (isLeft) {
      setIsDraggingLeft(true);
    } else {
      setIsDraggingRight(true);
    }
  }, []);

  // Handle trim drag with better UX
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!timelineRef.current || (!isDraggingLeft && !isDraggingRight)) return;
      
      if ('touches' in e) {
        e.preventDefault();
      }
      
      const rect = timelineRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clickX = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      let newTime = percentage * videoDuration;
      
      newTime = Math.round(newTime * 10) / 10;
      
      const video = videoRef.current;
      if (isDraggingLeft) {
        const minGap = 0.1;
        const maxTrimStart = Math.max(0, trimEnd - minGap);
        const finalTrimStart = Math.min(newTime, maxTrimStart);
        setTrimStart(finalTrimStart);
        if (video && video.readyState >= 2) {
          video.currentTime = finalTrimStart;
        }
      } else if (isDraggingRight) {
        const minGap = 0.1;
        const minTrimEnd = Math.min(videoDuration, trimStart + minGap);
        const finalTrimEnd = Math.max(newTime, minTrimEnd);
        setTrimEnd(finalTrimEnd);
        if (video && video.readyState >= 2) {
          video.currentTime = finalTrimEnd;
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingLeft, isDraggingRight, videoDuration, trimStart, trimEnd]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = (bytes / (1024 * 1024)).toFixed(1);
    return `${mb.replace('.', ',')} MB`;
  };

  const formatCurrentTime = (seconds: number) => {
    if (seconds < 60) {
      return seconds.toFixed(2).replace('.', ',');
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setTextContent(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleCaptionEmojiClick = (emojiData: EmojiClickData) => {
    setCaption(prev => prev + emojiData.emoji);
    setShowCaptionEmojiPicker(false);
  };

  const handleStickerSelect = (sticker: string) => {
    const newSticker = {
      id: `sticker-${Date.now()}`,
      emoji: sticker,
      x: 50,
      y: 50
    };
    setStickers(prev => [...prev, newSticker]);
  };

  const handleAddTextOverlay = () => {
    if (!currentOverlayText.trim()) return;
    
    const newOverlay = {
      id: `text-${Date.now()}`,
      text: currentOverlayText,
      x: 50,
      y: 50,
      color: '#FFFFFF'
    };
    setTextOverlays(prev => [...prev, newOverlay]);
    setCurrentOverlayText('');
    setShowTextOverlay(false);
  };

  const isDisabled = (mediaType === 'text' && !textContent.trim()) || 
                     (mediaType !== 'text' && !mediaFile);

  // Memoized style calculations
  const trimStartPercentage = useMemo(() => 
    videoDuration > 0 ? (trimStart / videoDuration) * 100 : 0
  , [trimStart, videoDuration]);
  
  const trimEndPercentage = useMemo(() => 
    videoDuration > 0 ? (trimEnd / videoDuration) * 100 : 0
  , [trimEnd, videoDuration]);
  
  const trimRangeWidth = useMemo(() => 
    videoDuration > 0 ? ((trimEnd - trimStart) / videoDuration) * 100 : 0
  , [trimStart, trimEnd, videoDuration]);
  
  const currentTimePercentage = useMemo(() => 
    videoDuration > 0 ? (currentVideoTime / videoDuration) * 100 : 0
  , [currentVideoTime, videoDuration]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={mediaType === 'text' ? { backgroundColor } : {}}
      >
        {mediaType === 'image' && mediaUrl && (
          <img
            src={mediaUrl}
            alt="Status"
            className="w-full h-full object-contain"
            data-testid="preview-status-image"
          />
        )}

        {mediaType === 'video' && mediaUrl && (
          <>
            <div className="relative w-full h-full z-0">
              <video
                ref={videoRef}
                src={mediaUrl}
                className="w-full h-full object-contain"
                controls={false}
                loop
                muted
                playsInline
                data-testid="preview-status-video"
                onClick={handleVideoContainerClick}
              />
              
              {!isVideoPlaying && showPlayButton && (
                <button
                  onClick={toggleVideoPlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 z-10"
                  data-testid="button-video-play"
                >
                  <div className="bg-white/30 backdrop-blur-sm rounded-full p-6">
                    <Play className="w-12 h-12 text-white fill-white" />
                  </div>
                </button>
              )}
            </div>
            
            {/* Redesigned Video Timeline - Always visible with better layout */}
            {videoDuration > 0 && (
              <div className="absolute bottom-32 left-0 right-0 px-4 z-30">
                <div className="bg-black/60 backdrop-blur-md rounded-2xl p-4 space-y-3">
                  {/* Timeline Header with Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Scissors className="h-4 w-4 text-white" />
                      <span className="text-white text-sm font-medium">Potong Video</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-white/10 rounded-full px-3 py-1">
                      <Volume2 className="h-3.5 w-3.5 text-white" />
                      <span className="text-white text-xs font-medium">
                        {formatTime(trimEnd - trimStart)}
                      </span>
                    </div>
                  </div>

                  {/* Video Frames Timeline */}
                  <div 
                    ref={timelineRef}
                    className="relative h-24 cursor-pointer rounded-lg overflow-hidden"
                    onClick={handleVideoSeek}
                    data-testid="video-timeline"
                  >
                    {/* Frame Preview */}
                    <div className="absolute inset-0 rounded-lg border-2 border-white/20 overflow-hidden bg-gray-900">
                      {videoFrames.length > 0 ? (
                        <div className="relative h-full flex">
                          {videoFrames.map((frame, index) => (
                            <img
                              key={index}
                              src={frame}
                              alt={`frame-${index}`}
                              className="flex-1 object-cover"
                              style={{ width: `${100 / videoFrames.length}%` }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="h-full bg-gray-800 flex items-center justify-center">
                          <div className="text-center">
                            {isGeneratingFrames ? (
                              <>
                                <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
                                <span className="text-white/60 text-xs">Memuat preview...</span>
                              </>
                            ) : (
                              <span className="text-white/40 text-xs">Loading frames...</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Trim Overlay Indicators */}
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Dimmed left area */}
                      <div 
                        className="absolute top-0 bottom-0 left-0 bg-black/60"
                        style={{ width: `${trimStartPercentage}%` }}
                      />
                      
                      {/* Dimmed right area */}
                      <div 
                        className="absolute top-0 bottom-0 right-0 bg-black/60"
                        style={{ width: `${100 - trimEndPercentage}%` }}
                      />
                      
                      {/* Active range border */}
                      <div 
                        className="absolute top-0 bottom-0 border-2 border-[#25D366]"
                        style={{ 
                          left: `${trimStartPercentage}%`,
                          width: `${trimRangeWidth}%`
                        }}
                      />
                    </div>
                    
                    {/* Current Time Indicator */}
                    <div 
                      className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none transition-all duration-100"
                      style={{ left: `${currentTimePercentage}%` }}
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg"></div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg"></div>
                    </div>
                    
                    {/* Trim Handles - Redesigned for better visibility */}
                    <div
                      className="absolute top-0 bottom-0 -translate-x-1/2 z-20 cursor-ew-resize flex items-center"
                      style={{ left: `${trimStartPercentage}%` }}
                      onMouseDown={(e) => handleTrimHandleDrag(e, true)}
                      onTouchStart={(e) => handleTrimHandleDrag(e, true)}
                      data-testid="trim-handle-left"
                    >
                      <div className="w-8 h-full bg-[#25D366] rounded-l-lg shadow-xl flex items-center justify-center border-2 border-white/20 relative">
                        <div className="absolute inset-y-0 left-0 right-0 flex flex-col justify-center items-center space-y-1">
                          <div className="w-1 h-3 bg-white/80 rounded-full" />
                          <div className="w-1 h-3 bg-white/80 rounded-full" />
                          <div className="w-1 h-3 bg-white/80 rounded-full" />
                        </div>
                      </div>
                    </div>
                    
                    <div
                      className="absolute top-0 bottom-0 -translate-x-1/2 z-20 cursor-ew-resize flex items-center"
                      style={{ left: `${trimEndPercentage}%` }}
                      onMouseDown={(e) => handleTrimHandleDrag(e, false)}
                      onTouchStart={(e) => handleTrimHandleDrag(e, false)}
                      data-testid="trim-handle-right"
                    >
                      <div className="w-8 h-full bg-[#25D366] rounded-r-lg shadow-xl flex items-center justify-center border-2 border-white/20 relative">
                        <div className="absolute inset-y-0 left-0 right-0 flex flex-col justify-center items-center space-y-1">
                          <div className="w-1 h-3 bg-white/80 rounded-full" />
                          <div className="w-1 h-3 bg-white/80 rounded-full" />
                          <div className="w-1 h-3 bg-white/80 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={toggleVideoPlay}
                        className="bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition-colors"
                        data-testid="button-timeline-play-pause"
                      >
                        {isVideoPlaying ? (
                          <Pause className="h-4 w-4 text-white" />
                        ) : (
                          <Play className="h-4 w-4 text-white fill-white" />
                        )}
                      </button>
                      <span className="text-white text-xs">
                        {formatTime(currentVideoTime)} / {formatTime(videoDuration)}
                      </span>
                    </div>
                    <div className="text-white text-xs bg-white/10 rounded-full px-3 py-1">
                      {mediaFile && formatFileSize(mediaFile.size)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {mediaType === 'text' && (
          <div className="px-8 max-w-md w-full">
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Ketik sesuatu..."
              className="w-full bg-transparent text-white text-2xl text-center font-medium leading-relaxed resize-none outline-none placeholder:text-white/60"
              style={{ minHeight: '200px' }}
              maxLength={500}
              autoFocus
              data-testid="textarea-status-text"
            />
          </div>
        )}

        {mediaType !== 'text' && stickers.map((sticker) => (
          <div
            key={sticker.id}
            className="absolute pointer-events-none"
            style={{
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <span className="text-6xl drop-shadow-2xl">{sticker.emoji}</span>
          </div>
        ))}

        {mediaType !== 'text' && textOverlays.map((overlay) => (
          <div
            key={overlay.id}
            className="absolute pointer-events-none"
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <p 
              className="text-3xl font-bold px-4 py-2 rounded-lg" 
              style={{ 
                color: overlay.color,
                textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
                backgroundColor: 'rgba(0,0,0,0.3)'
              }}
            >
              {overlay.text}
            </p>
          </div>
        ))}
      </div>

      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full bg-black/30 backdrop-blur-sm"
            data-testid="button-close-editor"
          >
            <X className="h-6 w-6" />
          </Button>

          <div className="flex items-center space-x-2">
            {mediaType === 'text' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="text-white hover:bg-white/20 rounded-full bg-black/30 backdrop-blur-sm relative"
                  data-testid="button-color-picker"
                >
                  <Type className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-white hover:bg-white/20 rounded-full bg-black/30 backdrop-blur-sm"
                  data-testid="button-emoji"
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </>
            )}

            {mediaType !== 'text' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMusicPicker(true)}
                  className="text-white hover:bg-white/20 rounded-full bg-black/30 backdrop-blur-sm"
                  data-testid="button-music"
                >
                  <Music className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowStickerPicker(!showStickerPicker)}
                  className="text-white hover:bg-white/20 rounded-full bg-black/30 backdrop-blur-sm"
                  data-testid="button-sticker"
                >
                  <Smile className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowTextOverlay(!showTextOverlay)}
                  className="text-white hover:bg-white/20 rounded-full bg-black/30 backdrop-blur-sm"
                  data-testid="button-text-overlay"
                >
                  <Type className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDrawingStart}
                  className={`text-white hover:bg-white/20 rounded-full ${isDrawing ? 'bg-[#25D366]' : 'bg-black/30'} backdrop-blur-sm`}
                  data-testid="button-draw"
                >
                  <Pen className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {showColorPicker && mediaType === 'text' && (
          <div className="mt-4 bg-black/50 backdrop-blur-md rounded-lg p-3">
            <div className="flex flex-wrap gap-2">
              {BACKGROUND_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setBackgroundColor(color);
                    setShowColorPicker(false);
                  }}
                  className={`w-10 h-10 rounded-full border-2 ${
                    backgroundColor === color ? 'border-white scale-110' : 'border-transparent'
                  } transition-all`}
                  style={{ backgroundColor: color }}
                  data-testid={`button-color-${color}`}
                />
              ))}
            </div>
          </div>
        )}

        {showEmojiPicker && mediaType === 'text' && (
          <div className="mt-4 relative">
            <EmojiPicker 
              onEmojiClick={handleEmojiClick}
              theme={Theme.DARK}
              width="100%"
              height="350px"
              searchPlaceHolder="Cari emoji..."
              data-testid="emoji-picker-text"
            />
          </div>
        )}

        {showStickerPicker && mediaType !== 'text' && (
          <div className="mt-4 relative">
            <StickerPicker 
              onStickerSelect={handleStickerSelect}
              onClose={() => setShowStickerPicker(false)}
            />
          </div>
        )}

        {showTextOverlay && mediaType !== 'text' && (
          <div className="mt-4 bg-black/50 backdrop-blur-md rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Input
                value={currentOverlayText}
                onChange={(e) => setCurrentOverlayText(e.target.value)}
                placeholder="Ketik teks..."
                className="flex-1 bg-white/10 border-0 text-white placeholder:text-white/60 focus-visible:ring-1 focus-visible:ring-white/40"
                maxLength={50}
                data-testid="input-text-overlay"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleAddTextOverlay();
                }}
              />
              <Button
                onClick={handleAddTextOverlay}
                disabled={!currentOverlayText.trim()}
                className="bg-[#25D366] hover:bg-[#20BD5A] text-white"
                data-testid="button-add-text-overlay"
              >
                Tambah
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 to-transparent">
        {validationError && (
          <div className="px-4 pb-2">
            <div className="bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm text-center">
              {validationError}
            </div>
          </div>
        )}

        {mediaType !== 'text' && (
          <div className="px-4 pb-3">
            <div className="flex items-center space-x-2">
              <ChevronUp className="h-5 w-5 text-white/60" />
              <span className="text-white/60 text-sm">Gesek ke atas untuk membuka filter</span>
            </div>
            
            <div className="flex items-center space-x-2 mt-3 bg-black/50 backdrop-blur-md rounded-full px-4 py-2">
              {mediaFile && (
                <div className="flex-shrink-0">
                  {mediaType === 'image' ? (
                    <img
                      src={mediaUrl}
                      alt="thumb"
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-nxe-surface rounded flex items-center justify-center">
                      <VideoIcon className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              )}
              <Input
                ref={captionInputRef}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={mediaFile ? caption || "Tambah keterangan..." : ""}
                className="flex-1 bg-transparent border-0 text-white placeholder:text-white/60 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 px-0"
                maxLength={200}
                data-testid="input-status-caption"
              />
              <button 
                onClick={() => setShowCaptionEmojiPicker(!showCaptionEmojiPicker)}
                className="text-white/80 hover:text-white" 
                data-testid="button-caption-emoji"
              >
                <Smile className="h-5 w-5" />
              </button>
              <button className="text-white/80 hover:text-white text-xl" data-testid="button-mention">
                @
              </button>
            </div>

            {showCaptionEmojiPicker && (
              <div className="mt-3 relative">
                <EmojiPicker 
                  onEmojiClick={handleCaptionEmojiClick}
                  theme={Theme.DARK}
                  width="100%"
                  height="300px"
                  searchPlaceHolder="Cari emoji..."
                  data-testid="emoji-picker-caption"
                />
              </div>
            )}
          </div>
        )}

        <div className="px-4 pb-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-black/50 backdrop-blur-md rounded-full px-4 py-2 flex items-center space-x-2">
                <Camera className="h-4 w-4 text-white" />
                <span className="text-white text-sm">Status {mediaType !== 'text' && mediaFile ? '(Kontak)' : '(Kontak)'}</span>
              </div>
              
              {!mediaFile && mediaType === 'text' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-white hover:bg-white/20 rounded-full bg-black/30 backdrop-blur-sm"
                  data-testid="button-add-media"
                >
                  <Camera className="h-5 w-5" />
                </Button>
              )}
            </div>

            <Button
              onClick={handlePost}
              disabled={isDisabled}
              className="bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-full w-12 h-12 p-0 disabled:opacity-50 disabled:bg-gray-500"
              data-testid="button-send-status"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleMediaSelect}
        data-testid="input-media-file"
      />
      
      <input
        ref={musicInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleMusicSelect}
        data-testid="input-music-file"
      />

      {/* Drawing Canvas Overlay */}
      {isDrawing && mediaType !== 'text' && (
        <div className="absolute inset-0 z-40">
          <canvas
            ref={drawingCanvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            data-testid="drawing-canvas"
          />
          
          {/* Drawing Controls */}
          <div className="absolute top-20 left-0 right-0 z-50 px-4">
            <div className="bg-black/70 backdrop-blur-md rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">Mode Menggambar</span>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={clearDrawing}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    data-testid="button-clear-drawing"
                  >
                    Hapus
                  </Button>
                  <Button
                    onClick={handleDrawingEnd}
                    size="sm"
                    className="bg-[#25D366] hover:bg-[#20BD5A] text-white"
                    data-testid="button-done-drawing"
                  >
                    Selesai
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white text-xs">Warna</span>
                  <div className="flex items-center space-x-1">
                    {['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setDrawingColor(color)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          drawingColor === color ? 'border-white scale-110' : 'border-transparent'
                        } transition-all`}
                        style={{ backgroundColor: color }}
                        data-testid={`button-drawing-color-${color}`}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-white text-xs">Ukuran</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={drawingSize}
                      onChange={(e) => setDrawingSize(Number(e.target.value))}
                      className="w-24"
                      data-testid="input-drawing-size"
                    />
                    <span className="text-white text-xs w-6">{drawingSize}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Music File Display */}
      {(musicFile || musicInfo) && mediaType !== 'text' && (
        <div className="absolute bottom-36 left-4 right-4 z-30">
          <div className="bg-black/70 backdrop-blur-md rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Music className="h-4 w-4 text-white" />
              <div className="flex flex-col">
                {musicInfo ? (
                  <>
                    <span className="text-white text-sm truncate max-w-[200px]">{musicInfo.title}</span>
                    <span className="text-gray-400 text-xs truncate max-w-[200px]">{musicInfo.artist}</span>
                  </>
                ) : (
                  <span className="text-white text-sm truncate max-w-[200px]">{musicFile?.name}</span>
                )}
              </div>
            </div>
            <Button
              onClick={removeMusicFile}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              data-testid="button-remove-music"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Music Selector Modal */}
      {showMusicPicker && (
        <MusicSelector
          onClose={() => setShowMusicPicker(false)}
          onSelect={handleMusicSelection}
        />
      )}
    </div>
  );
}
