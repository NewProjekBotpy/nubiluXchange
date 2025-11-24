import { Heart, MessageCircle, Share2, Bookmark, Music2, VolumeX, Volume2, Play, Plus, Check, Disc3, Loader2, AlertCircle, Video as VideoIcon, RotateCcw, ArrowLeft } from "lucide-react";
import { useState, useRef, useEffect, useMemo, useReducer, useCallback } from "react";
import { logError } from '@/lib/logger';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { PageTransition } from "@/components/PageTransition";
import { formatTikTokNumber, sanitizeUrl } from "@/lib/utils";

interface VideoData {
  id: number;
  title: string;
  username: string;
  displayName: string;
  thumbnail: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  videoUrl?: string;
  musicName?: string;
  profilePicture?: string;
}

interface VideoComment {
  id: number;
  statusId: number;
  userId: number;
  comment: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    profilePicture?: string;
  };
}

interface VideoState {
  isMuted: boolean;
  likedVideos: Set<number>;
  savedVideos: Set<number>;
  followedUsers: Set<string>;
  showComments: boolean;
  newComment: string;
  doubleTapHeart: boolean;
  isPaused: boolean;
  touchStartY: number;
  likeAnimation: boolean;
  shareAnimation: boolean;
  commentAnimation: boolean;
  expandedCaptions: Set<number>;
  followingAnimation: Set<string>;
  videoErrors: Set<number>;
  videoBuffering: Set<number>;
  isDragging: boolean;
  dragOffset: number;
  isTransitioning: boolean;
}

type VideoAction =
  | { type: 'TOGGLE_MUTE' }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'SET_TOUCH_Y'; payload: number }
  | { type: 'LIKE_VIDEO'; payload: number }
  | { type: 'UNLIKE_VIDEO'; payload: number }
  | { type: 'SAVE_VIDEO'; payload: number }
  | { type: 'UNSAVE_VIDEO'; payload: number }
  | { type: 'FOLLOW_USER'; payload: string }
  | { type: 'UNFOLLOW_USER'; payload: string }
  | { type: 'SET_COMMENTS_VISIBLE'; payload: boolean }
  | { type: 'SET_NEW_COMMENT'; payload: string }
  | { type: 'SHOW_DOUBLE_TAP_HEART' }
  | { type: 'HIDE_DOUBLE_TAP_HEART' }
  | { type: 'START_LIKE_ANIMATION' }
  | { type: 'END_LIKE_ANIMATION' }
  | { type: 'START_SHARE_ANIMATION' }
  | { type: 'END_SHARE_ANIMATION' }
  | { type: 'START_COMMENT_ANIMATION' }
  | { type: 'END_COMMENT_ANIMATION' }
  | { type: 'TOGGLE_CAPTION'; payload: number }
  | { type: 'START_FOLLOWING_ANIMATION'; payload: string }
  | { type: 'END_FOLLOWING_ANIMATION' }
  | { type: 'VIDEO_ERROR'; payload: number }
  | { type: 'VIDEO_BUFFERING'; payload: number }
  | { type: 'VIDEO_PLAYING'; payload: number }
  | { type: 'CLEAR_ERROR'; payload: number }
  | { type: 'SET_DRAGGING'; payload: boolean }
  | { type: 'SET_DRAG_OFFSET'; payload: number }
  | { type: 'SET_TRANSITIONING'; payload: boolean };

const initialState: VideoState = {
  isMuted: true,
  likedVideos: new Set(),
  savedVideos: new Set(),
  followedUsers: new Set(),
  showComments: false,
  newComment: "",
  doubleTapHeart: false,
  isPaused: false,
  touchStartY: 0,
  likeAnimation: false,
  shareAnimation: false,
  commentAnimation: false,
  expandedCaptions: new Set(),
  followingAnimation: new Set(),
  videoErrors: new Set(),
  videoBuffering: new Set(),
  isDragging: false,
  dragOffset: 0,
  isTransitioning: false,
};

function videoReducer(state: VideoState, action: VideoAction): VideoState {
  switch (action.type) {
    case 'TOGGLE_MUTE':
      return { ...state, isMuted: !state.isMuted };
    case 'TOGGLE_PAUSE':
      return { ...state, isPaused: !state.isPaused };
    case 'SET_TOUCH_Y':
      return { ...state, touchStartY: action.payload };
    case 'LIKE_VIDEO': {
      const newLiked = new Set(state.likedVideos);
      newLiked.add(action.payload);
      return { ...state, likedVideos: newLiked };
    }
    case 'UNLIKE_VIDEO': {
      const newLiked = new Set(state.likedVideos);
      newLiked.delete(action.payload);
      return { ...state, likedVideos: newLiked };
    }
    case 'SAVE_VIDEO': {
      const newSaved = new Set(state.savedVideos);
      newSaved.add(action.payload);
      return { ...state, savedVideos: newSaved };
    }
    case 'UNSAVE_VIDEO': {
      const newSaved = new Set(state.savedVideos);
      newSaved.delete(action.payload);
      return { ...state, savedVideos: newSaved };
    }
    case 'FOLLOW_USER': {
      const newFollowed = new Set(state.followedUsers);
      newFollowed.add(action.payload);
      return { ...state, followedUsers: newFollowed };
    }
    case 'UNFOLLOW_USER': {
      const newFollowed = new Set(state.followedUsers);
      newFollowed.delete(action.payload);
      return { ...state, followedUsers: newFollowed };
    }
    case 'SET_COMMENTS_VISIBLE':
      return { ...state, showComments: action.payload };
    case 'SET_NEW_COMMENT':
      return { ...state, newComment: action.payload };
    case 'SHOW_DOUBLE_TAP_HEART':
      return { ...state, doubleTapHeart: true };
    case 'HIDE_DOUBLE_TAP_HEART':
      return { ...state, doubleTapHeart: false };
    case 'START_LIKE_ANIMATION':
      return { ...state, likeAnimation: true };
    case 'END_LIKE_ANIMATION':
      return { ...state, likeAnimation: false };
    case 'START_SHARE_ANIMATION':
      return { ...state, shareAnimation: true };
    case 'END_SHARE_ANIMATION':
      return { ...state, shareAnimation: false };
    case 'START_COMMENT_ANIMATION':
      return { ...state, commentAnimation: true };
    case 'END_COMMENT_ANIMATION':
      return { ...state, commentAnimation: false };
    case 'TOGGLE_CAPTION': {
      const newExpanded = new Set(state.expandedCaptions);
      if (newExpanded.has(action.payload)) {
        newExpanded.delete(action.payload);
      } else {
        newExpanded.add(action.payload);
      }
      return { ...state, expandedCaptions: newExpanded };
    }
    case 'START_FOLLOWING_ANIMATION': {
      const newFollowing = new Set(state.followingAnimation);
      newFollowing.add(action.payload);
      return { ...state, followingAnimation: newFollowing };
    }
    case 'END_FOLLOWING_ANIMATION':
      return { ...state, followingAnimation: new Set() };
    case 'VIDEO_ERROR': {
      const newErrors = new Set(state.videoErrors);
      newErrors.add(action.payload);
      const newBuffering = new Set(state.videoBuffering);
      newBuffering.delete(action.payload);
      return { ...state, videoErrors: newErrors, videoBuffering: newBuffering };
    }
    case 'VIDEO_BUFFERING': {
      const newBuffering = new Set(state.videoBuffering);
      newBuffering.add(action.payload);
      return { ...state, videoBuffering: newBuffering };
    }
    case 'VIDEO_PLAYING': {
      const newBuffering = new Set(state.videoBuffering);
      newBuffering.delete(action.payload);
      return { ...state, videoBuffering: newBuffering };
    }
    case 'CLEAR_ERROR': {
      const newErrors = new Set(state.videoErrors);
      newErrors.delete(action.payload);
      return { ...state, videoErrors: newErrors };
    }
    case 'SET_DRAGGING':
      return { ...state, isDragging: action.payload };
    case 'SET_DRAG_OFFSET':
      return { ...state, dragOffset: action.payload };
    case 'SET_TRANSITIONING':
      return { ...state, isTransitioning: action.payload };
    default:
      return state;
  }
}

const VIDEO_PRELOAD_RANGE = 2;
const SWIPE_THRESHOLD = 80;
const DRAG_THRESHOLD = 5;

export default function Sound() {
  const [, params] = useRoute("/sound/:musicName");
  const musicName = params?.musicName || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [state, dispatch] = useReducer(videoReducer, initialState);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [videoProgress, setVideoProgress] = useState(new Map<number, number>());
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<number>>(new Set());

  const { data: videosResponse, isLoading, error, refetch } = useQuery<{ videos: VideoData[], total: number }>({
    queryKey: ['/api/video-content/by-music', musicName],
    enabled: !!musicName,
    staleTime: 30000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const videos = useMemo(() => videosResponse?.videos || [], [videosResponse]);

  useEffect(() => {
    if (videos.length > 0) {
      const playCurrentVideo = async () => {
        const currentVideo = videoRefs.current[currentVideoIndex];
        if (currentVideo && !state.isPaused) {
          try {
            await currentVideo.play();
          } catch (error) {
            logError('Error playing video', error as Error);
          }
        }
      };

      const pauseOtherVideos = () => {
        videoRefs.current.forEach((video, index) => {
          if (video && index !== currentVideoIndex) {
            video.pause();
            video.currentTime = 0;
          }
        });
      };

      pauseOtherVideos();
      playCurrentVideo();
    }
  }, [currentVideoIndex, videos, state.isPaused]);

  useEffect(() => {
    if (!state.isPaused) {
      videoRefs.current.forEach((video) => {
        if (video) {
          video.play().catch(err => logError('Error resuming video', err as Error));
        }
      });
    } else {
      videoRefs.current.forEach((video) => {
        if (video) {
          video.pause();
        }
      });
    }
  }, [state.isPaused]);

  useEffect(() => {
    videoRefs.current.forEach((video) => {
      if (video) {
        video.muted = state.isMuted;
      }
    });
  }, [state.isMuted]);

  const vibrate = useCallback((duration: number = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  }, []);

  const goToPreviousVideo = useCallback(() => {
    if (currentVideoIndex > 0) {
      dispatch({ type: 'SET_TRANSITIONING', payload: true });
      setCurrentVideoIndex(prev => prev - 1);
      vibrate(5);
      setTimeout(() => dispatch({ type: 'SET_TRANSITIONING', payload: false }), 300);
    }
  }, [currentVideoIndex, vibrate]);

  const goToNextVideo = useCallback(() => {
    if (currentVideoIndex < videos.length - 1) {
      dispatch({ type: 'SET_TRANSITIONING', payload: true });
      setCurrentVideoIndex(prev => prev + 1);
      vibrate(5);
      setTimeout(() => dispatch({ type: 'SET_TRANSITIONING', payload: false }), 300);
    }
  }, [currentVideoIndex, videos.length, vibrate]);

  const handleDoubleTap = useCallback(() => {
    const video = videos[currentVideoIndex];
    if (!state.likedVideos.has(video.id)) {
      dispatch({ type: 'LIKE_VIDEO', payload: video.id });
      dispatch({ type: 'SHOW_DOUBLE_TAP_HEART' });
      vibrate(15);
      setTimeout(() => dispatch({ type: 'HIDE_DOUBLE_TAP_HEART' }), 1000);
    }
    dispatch({ type: 'TOGGLE_PAUSE' });
  }, [currentVideoIndex, videos, state.likedVideos, vibrate]);

  const handleLike = useCallback(() => {
    const video = videos[currentVideoIndex];
    if (state.likedVideos.has(video.id)) {
      dispatch({ type: 'UNLIKE_VIDEO', payload: video.id });
    } else {
      dispatch({ type: 'LIKE_VIDEO', payload: video.id });
      dispatch({ type: 'START_LIKE_ANIMATION' });
      vibrate(10);
      setTimeout(() => dispatch({ type: 'END_LIKE_ANIMATION' }), 300);
    }
  }, [currentVideoIndex, videos, state.likedVideos, vibrate]);

  const handleSave = useCallback(() => {
    const video = videos[currentVideoIndex];
    if (state.savedVideos.has(video.id)) {
      dispatch({ type: 'UNSAVE_VIDEO', payload: video.id });
    } else {
      dispatch({ type: 'SAVE_VIDEO', payload: video.id });
      vibrate(10);
      toast({
        title: "Video disimpan",
        description: "Video telah ditambahkan ke koleksi Anda"
      });
    }
  }, [currentVideoIndex, videos, state.savedVideos, vibrate, toast]);

  const handleShare = useCallback(() => {
    dispatch({ type: 'START_SHARE_ANIMATION' });
    vibrate(10);
    setTimeout(() => dispatch({ type: 'END_SHARE_ANIMATION' }), 300);
    toast({
      title: "Link disalin!",
      description: "Link video telah disalin ke clipboard"
    });
  }, [vibrate, toast]);

  const handleComments = useCallback(() => {
    dispatch({ type: 'SET_COMMENTS_VISIBLE', payload: true });
    dispatch({ type: 'START_COMMENT_ANIMATION' });
    vibrate(5);
    setTimeout(() => dispatch({ type: 'END_COMMENT_ANIMATION' }), 300);
  }, [vibrate]);

  const handleFollow = useCallback(() => {
    const video = videos[currentVideoIndex];
    if (!state.followedUsers.has(video.username)) {
      dispatch({ type: 'START_FOLLOWING_ANIMATION', payload: video.username });
      vibrate(10);
      setTimeout(() => {
        dispatch({ type: 'FOLLOW_USER', payload: video.username });
        dispatch({ type: 'END_FOLLOWING_ANIMATION' });
      }, 500);
    }
  }, [currentVideoIndex, videos, state.followedUsers, vibrate]);

  const toggleCaption = useCallback((videoId: number) => {
    dispatch({ type: 'TOGGLE_CAPTION', payload: videoId });
  }, []);

  const handleTouchStartVertical = useCallback((e: React.TouchEvent) => {
    dispatch({ type: 'SET_TOUCH_Y', payload: e.touches[0].clientY });
    dispatch({ type: 'SET_DRAGGING', payload: false });
    dispatch({ type: 'SET_DRAG_OFFSET', payload: 0 });
  }, []);

  const handleTouchMoveVertical = useCallback((e: React.TouchEvent) => {
    if (state.touchStartY === 0) return;

    const deltaY = e.touches[0].clientY - state.touchStartY;
    const threshold = DRAG_THRESHOLD;

    if (Math.abs(deltaY) > threshold && !state.isDragging) {
      dispatch({ type: 'SET_DRAGGING', payload: true });
    }

    if (state.isDragging) {
      const maxDragPercent = 30;
      const dragPercent = Math.max(-maxDragPercent, Math.min(maxDragPercent, (deltaY / window.innerHeight) * 100));
      dispatch({ type: 'SET_DRAG_OFFSET', payload: dragPercent });
    }
  }, [state.touchStartY, state.isDragging]);

  const handleTouchEndVertical = useCallback(() => {
    const deltaY = state.dragOffset;
    const threshold = SWIPE_THRESHOLD / window.innerHeight * 100;

    dispatch({ type: 'SET_DRAGGING', payload: false });
    dispatch({ type: 'SET_DRAG_OFFSET', payload: 0 });

    if (Math.abs(deltaY) > threshold) {
      if (deltaY > 0) {
        goToPreviousVideo();
      } else {
        goToNextVideo();
      }
    }

    dispatch({ type: 'SET_TOUCH_Y', payload: 0 });
  }, [state.dragOffset, goToPreviousVideo, goToNextVideo]);

  const handleVideoTimeUpdate = useCallback((videoId: number, video: HTMLVideoElement) => {
    if (!video.duration || isNaN(video.duration)) return;
    const progress = (video.currentTime / video.duration) * 100;
    setVideoProgress(prev => new Map(prev).set(videoId, progress));
  }, []);

  const handleRetry = useCallback((videoId: number, isVideo: boolean) => {
    dispatch({ type: 'CLEAR_ERROR', payload: videoId });
    
    if (isVideo) {
      const video = videoRefs.current.find(v => v?.getAttribute('data-video-id') === String(videoId));
      if (video) {
        video.load();
        video.play().catch(err => logError('Error replaying video', err as Error));
      }
    } else {
      setImageLoadErrors(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  }, []);

  const { data: commentsData } = useQuery<{ comments: VideoComment[], count: number }>({
    queryKey: ['/api/videos', videos[currentVideoIndex]?.id, 'comments'],
    enabled: state.showComments && !!videos[currentVideoIndex],
  });

  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      const video = videos[currentVideoIndex];
      return apiRequest(`/api/videos/${video.id}/comments`, {
        method: 'POST',
        body: { comment },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos', videos[currentVideoIndex]?.id, 'comments'] });
      dispatch({ type: 'SET_NEW_COMMENT', payload: '' });
      toast({
        title: "Komentar terkirim!",
        description: "Komentar Anda telah ditambahkan"
      });
    },
  });

  const handleCommentSubmit = useCallback(() => {
    if (state.newComment.trim()) {
      addCommentMutation.mutate(state.newComment);
      vibrate(10);
    }
  }, [state.newComment, addCommentMutation, vibrate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToPreviousVideo();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToNextVideo();
      } else if (e.key === ' ') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_PAUSE' });
      } else if (e.key === 'm') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_MUTE' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPreviousVideo, goToNextVideo]);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-green-500 animate-spin" data-testid="loader-videos" />
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
          <div className="text-center px-6 space-y-6">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <div className="space-y-2">
              <h2 className="text-white text-2xl font-bold">Gagal memuat video</h2>
              <p className="text-gray-400 text-base">Terjadi kesalahan saat memuat konten</p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
              data-testid="button-retry"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (videos.length === 0) {
    return (
      <PageTransition>
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900">
          <div className="absolute top-5 left-5 z-50">
            <button
              onClick={() => setLocation('/video')}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-lg flex items-center justify-center text-white hover:bg-black/70 transition-all duration-200 active:scale-90 hover:scale-105 shadow-xl border border-white/10"
              data-testid="button-back"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          </div>
          
          <div className="h-full flex items-center justify-center">
            <div className="text-center px-6 space-y-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center shadow-2xl border border-white/10">
                <Music2 className="w-12 h-12 text-gray-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-white text-2xl font-bold" data-testid="text-empty-heading">Belum ada video</h2>
                <p className="text-gray-400 text-base" data-testid="text-empty-subtitle">
                  Belum ada video yang menggunakan musik "{musicName}"
                </p>
              </div>
              <button
                onClick={() => setLocation('/video')}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
                data-testid="button-back-to-videos"
              >
                Kembali ke Video
              </button>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="fixed inset-0 bg-black">
        <div className="absolute top-5 left-5 z-50 flex items-center space-x-3">
          <button
            onClick={() => setLocation('/video')}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-lg flex items-center justify-center text-white hover:bg-black/70 transition-all duration-200 active:scale-90 hover:scale-105 shadow-xl border border-white/10"
            data-testid="button-back"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          
          <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-lg px-4 py-2 rounded-full border border-white/10">
            <Music2 className="w-5 h-5 text-green-500" />
            <span className="text-white text-sm font-semibold max-w-[200px] truncate" data-testid="text-music-title">
              {musicName}
            </span>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="fixed top-0 left-0 right-0 bottom-16 md:right-20 md:bottom-0 overflow-hidden bg-black"
          onTouchStart={handleTouchStartVertical}
          onTouchMove={handleTouchMoveVertical}
          onTouchEnd={handleTouchEndVertical}
          role="region"
          aria-label="Video feed"
          aria-live="polite"
        >
          <div 
            className={`relative h-full ${state.isTransitioning || !state.isDragging ? 'transition-transform duration-300 ease-out' : ''}`}
            style={{ 
              transform: `translateY(calc(-${currentVideoIndex * 100}% + ${state.dragOffset}%))`,
              willChange: 'transform'
            }}
          >
            {videos.map((video, index) => {
              const shouldRender = Math.abs(index - currentVideoIndex) <= VIDEO_PRELOAD_RANGE;
              const hasError = video.videoUrl ? state.videoErrors.has(video.id) : imageLoadErrors.has(video.id);
              const isBuffering = state.videoBuffering.has(video.id);
              const progress = videoProgress.get(video.id) || 0;
              
              return (
                <div 
                  key={video.id} 
                  className="absolute inset-0 w-full h-full"
                  aria-hidden={index !== currentVideoIndex}
                >
                  {shouldRender && (
                    <div className="relative h-full transition-transform duration-500 ease-out">
                      <div className="absolute inset-0 w-full h-full">
                        {video.videoUrl ? (
                          <div className="relative w-full h-full bg-black">
                            {index === currentVideoIndex && progress > 0 && (
                              <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20 z-50">
                                <div 
                                  className="h-full bg-white transition-all duration-100 ease-linear"
                                  style={{ width: `${progress}%` }}
                                  role="progressbar"
                                  aria-valuenow={Math.round(progress)}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-label="Video progress"
                                />
                              </div>
                            )}
                            
                            <video
                              ref={el => videoRefs.current[index] = el}
                              className="w-full h-full object-contain"
                              src={sanitizeUrl(video.videoUrl, '')}
                              loop
                              playsInline
                              muted={state.isMuted}
                              onClick={handleDoubleTap}
                              onTouchEnd={handleDoubleTap}
                              onError={() => dispatch({ type: 'VIDEO_ERROR', payload: video.id })}
                              onWaiting={() => dispatch({ type: 'VIDEO_BUFFERING', payload: video.id })}
                              onPlaying={() => dispatch({ type: 'VIDEO_PLAYING', payload: video.id })}
                              onCanPlay={() => dispatch({ type: 'VIDEO_PLAYING', payload: video.id })}
                              onTimeUpdate={(e) => handleVideoTimeUpdate(video.id, e.currentTarget)}
                              data-video-id={video.id}
                              aria-label={`Video by ${video.displayName}: ${video.title}`}
                              data-testid={`video-player-${video.id}`}
                            />
                            
                            {isBuffering && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-black/40 backdrop-blur-sm animate-fade-in">
                                <div className="animate-pulse">
                                  <Loader2 className="w-16 h-16 text-white animate-spin drop-shadow-2xl" aria-label="Buffering..." />
                                </div>
                                <p className="text-white text-sm mt-3 font-medium drop-shadow-lg">Buffering...</p>
                              </div>
                            )}
                            
                            {hasError && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-6 animate-fade-in">
                                <AlertCircle className="w-16 h-16 mb-4 text-red-500 drop-shadow-2xl" />
                                <p className="text-lg font-bold mb-2">Failed to load video</p>
                                <p className="text-sm text-gray-400 text-center mb-6">The video could not be loaded. Check your connection and try again.</p>
                                <button
                                  onClick={() => handleRetry(video.id, true)}
                                  className="flex items-center space-x-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all duration-200 hover:scale-105 active:scale-95 border border-white/20"
                                  data-testid={`button-retry-video-${video.id}`}
                                >
                                  <RotateCcw className="w-5 h-5" />
                                  <span className="font-semibold">Retry</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div 
                            className="w-full h-full bg-contain bg-center bg-no-repeat relative bg-black"
                            style={{ backgroundImage: `url(${sanitizeUrl(video.thumbnail, '')})` }}
                            onClick={handleDoubleTap}
                            onTouchEnd={handleDoubleTap}
                            role="img"
                            aria-label={`Image post by ${video.displayName}: ${video.title}`}
                            data-testid={`image-post-${video.id}`}
                          >
                            {hasError && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-6 animate-fade-in">
                                <AlertCircle className="w-16 h-16 mb-4 text-red-500 drop-shadow-2xl" />
                                <p className="text-lg font-bold mb-2">Failed to load image</p>
                                <p className="text-sm text-gray-400 text-center mb-6">The image could not be loaded. Check your connection and try again.</p>
                                <button
                                  onClick={() => handleRetry(video.id, false)}
                                  className="flex items-center space-x-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all duration-200 hover:scale-105 active:scale-95 border border-white/20"
                                  data-testid={`button-retry-image-${video.id}`}
                                >
                                  <RotateCcw className="w-5 h-5" />
                                  <span className="font-semibold">Retry</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {state.isPaused && index === currentVideoIndex && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-fade-in" data-testid="icon-play-paused">
                            <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/20">
                              <Play 
                                className="w-10 h-10 text-white drop-shadow-2xl ml-1" 
                                fill="white" 
                                aria-label="Video paused"
                              />
                            </div>
                          </div>
                        )}

                        {state.doubleTapHeart && index === currentVideoIndex && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                            <div className="relative">
                              <Heart className="w-24 h-24 text-red-500 fill-red-500 animate-heart-burst drop-shadow-2xl" />
                              {[...Array(8)].map((_, i) => (
                                <Heart 
                                  key={i}
                                  className="absolute top-1/2 left-1/2 w-6 h-6 text-red-500 fill-red-500 drop-shadow-xl"
                                  style={{
                                    animation: `heart-particle-${i} 1s ease-out forwards`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black/60 via-black/30 to-transparent pointer-events-none" aria-hidden="true" />
                        <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" aria-hidden="true" />

                        <div className="absolute top-5 right-4 z-40 flex items-center space-x-2">
                          <button
                            onClick={() => {
                              dispatch({ type: 'TOGGLE_MUTE' });
                              vibrate(5);
                            }}
                            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-lg flex items-center justify-center text-white hover:bg-black/70 transition-all duration-200 active:scale-90 hover:scale-105 shadow-xl border border-white/10"
                            data-testid="button-mute"
                            aria-label={state.isMuted ? "Unmute video" : "Mute video"}
                          >
                            {state.isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                          </button>
                        </div>

                        {index === currentVideoIndex && (
                          <div className="absolute bottom-0 left-0 right-0 z-30">
                            <div className={`px-3 pb-[32px] transition-opacity duration-200 ${state.isDragging ? 'opacity-50' : 'opacity-100'}`}>
                              <div className="flex items-end">
                                <div className="flex-1 pr-16">
                                  <div 
                                    className="text-white text-base font-bold mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" 
                                    data-testid="text-username"
                                    role="text"
                                    aria-label={`Username: ${video.username}`}
                                  >
                                    @{video.username}
                                  </div>
                                  
                                  <div 
                                    className="text-white/80 text-xs mb-2 font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] animate-fade-in"
                                    data-testid="text-views-count"
                                  >
                                    {formatTikTokNumber(video.views)} views
                                  </div>
                                
                                  <div className="text-white text-sm mb-2 leading-relaxed font-normal drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                                    {video.title.length > 100 ? (
                                      state.expandedCaptions.has(video.id) ? (
                                        <>
                                          <span role="text">{video.title}</span>{' '}
                                          <button 
                                            onClick={() => toggleCaption(video.id)}
                                            className="text-gray-300 font-semibold hover:text-white transition-colors duration-200"
                                            data-testid="button-caption-collapse"
                                            aria-label="Show less caption"
                                          >
                                            Show less
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <span role="text">{video.title.slice(0, 100)}...</span>
                                          <button 
                                            onClick={() => toggleCaption(video.id)}
                                            className="text-gray-300 font-semibold hover:text-white transition-colors duration-200"
                                            data-testid="button-caption-expand"
                                            aria-label="Show more caption"
                                          >
                                            more
                                          </button>
                                        </>
                                      )
                                    ) : (
                                      <span role="text">{video.title}</span>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-2 mt-0.5">
                                    <Music2 className="w-3.5 h-3.5 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] flex-shrink-0" aria-hidden="true" data-testid="icon-music" />
                                    <div className="flex-1 overflow-hidden">
                                      <div className="text-white text-xs opacity-95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] truncate font-medium" role="text" data-testid="text-music-name">
                                        {video.musicName}
                                      </div>
                                    </div>
                                    <div className="relative w-8 h-8 flex-shrink-0" aria-hidden="true" data-testid="icon-music-disc">
                                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 animate-spin-slow shadow-xl"></div>
                                      <div className="absolute inset-0.5 rounded-full bg-gray-900 flex items-center justify-center shadow-inner">
                                        <Disc3 className="w-3.5 h-3.5 text-white" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className={`absolute right-3 bottom-[10px] flex flex-col items-center space-y-3.5 transition-opacity duration-200 ${state.isDragging ? 'opacity-50' : 'opacity-100'}`}>
                              <div className="relative mb-0.5">
                                <div className={`w-12 h-12 rounded-full overflow-hidden ring-2 ring-white shadow-2xl transition-all duration-200 ${state.followingAnimation.has(video.username) ? 'animate-pulse' : ''}`}>
                                  <img 
                                    src={sanitizeUrl(video.profilePicture, 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=50&h=50&fit=crop')}
                                    alt={`${video.displayName}'s profile picture`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    data-testid={`img-profile-${video.id}`}
                                  />
                                </div>
                                {!state.followedUsers.has(video.username) && !state.followingAnimation.has(video.username) && (
                                  <button
                                    onClick={handleFollow}
                                    className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all duration-200 active:scale-95 border-2 border-white"
                                    data-testid="button-follow"
                                    aria-label={`Follow ${video.displayName}`}
                                  >
                                    <Plus className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                                  </button>
                                )}
                                {state.followingAnimation.has(video.username) && (
                                  <div 
                                    className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-xl transition-all duration-500 ease-out animate-fade-in border-2 border-white"
                                    aria-label="Following"
                                  >
                                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col items-center">
                                <button
                                  onClick={handleLike}
                                  className={`w-11 h-11 flex items-center justify-center transition-all duration-200 ${state.likeAnimation ? 'animate-bounce-like' : 'active:scale-90 hover:scale-105'}`}
                                  data-testid="button-like"
                                  aria-label={state.likedVideos.has(video.id) ? "Unlike video" : "Like video"}
                                  aria-pressed={state.likedVideos.has(video.id)}
                                >
                                  <Heart className={`w-8 h-8 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] transition-all duration-200 ${state.likedVideos.has(video.id) ? 'text-red-500 fill-red-500 scale-110' : 'text-white'}`} />
                                </button>
                                <span className="text-white text-[11px] font-bold mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" role="text" data-testid={`text-likes-count-${video.id}`}>
                                  {formatTikTokNumber(video.likes + (state.likedVideos.has(video.id) ? 1 : 0))}
                                </span>
                              </div>

                              <div className="flex flex-col items-center">
                                <button
                                  onClick={handleComments}
                                  className={`w-11 h-11 flex items-center justify-center transition-all duration-200 ${state.commentAnimation ? 'animate-bounce-like' : 'active:scale-90 hover:scale-105'}`}
                                  data-testid="button-comments"
                                  aria-label={`Open comments (${formatTikTokNumber(commentsData?.count || video.comments)})`}
                                >
                                  <MessageCircle className="w-8 h-8 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]" />
                                </button>
                                <span className="text-white text-[11px] font-bold mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" role="text" data-testid={`text-comments-count-${video.id}`}>
                                  {formatTikTokNumber(commentsData?.count || video.comments)}
                                </span>
                              </div>

                              <div className="flex flex-col items-center">
                                <button
                                  onClick={handleSave}
                                  className={`w-11 h-11 flex items-center justify-center transition-all duration-200 active:scale-90 hover:scale-105 ${state.savedVideos.has(video.id) ? 'rotate-12' : ''}`}
                                  data-testid="button-save"
                                  aria-label={state.savedVideos.has(video.id) ? "Unsave video" : "Save video"}
                                  aria-pressed={state.savedVideos.has(video.id)}
                                >
                                  <Bookmark className={`w-7 h-7 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] transition-all duration-200 ${state.savedVideos.has(video.id) ? 'text-yellow-400 fill-yellow-400' : 'text-white'}`} />
                                </button>
                                <span className="text-white text-[11px] font-bold mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" role="text" data-testid={`text-saves-count-${video.id}`}>
                                  {formatTikTokNumber(video.saves + (state.savedVideos.has(video.id) ? 1 : 0))}
                                </span>
                              </div>

                              <div className="flex flex-col items-center">
                                <button
                                  onClick={handleShare}
                                  className={`w-11 h-11 flex items-center justify-center transition-all duration-200 ${state.shareAnimation ? 'animate-bounce-like' : 'active:scale-90 hover:scale-105'}`}
                                  data-testid="button-share"
                                  aria-label="Share video"
                                >
                                  <Share2 className="w-7 h-7 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]" />
                                </button>
                                <span className="text-white text-[11px] font-bold mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" role="text" data-testid={`text-shares-count-${video.id}`}>
                                  {formatTikTokNumber(video.shares)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {state.showComments && (
          <div 
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-md animate-fade-in" 
            onClick={() => dispatch({ type: 'SET_COMMENTS_VISIBLE', payload: false })}
            role="dialog"
            aria-modal="true"
            aria-labelledby="comments-title"
          >
            <div 
              className="absolute bottom-0 left-0 right-0 bg-[#161823] rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up shadow-2xl border-t border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-4 pb-3" aria-hidden="true" data-testid="handle-comments-drag">
                <div className="w-14 h-1.5 bg-gray-500 rounded-full shadow-md"></div>
              </div>

              <div className="px-6 py-4 border-b border-gray-700/60 flex-shrink-0">
                <h3 id="comments-title" className="text-white font-bold text-lg" data-testid="text-comments-header">
                  {formatTikTokNumber(commentsData?.count || 0)} {commentsData?.count === 1 ? 'comment' : 'comments'}
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {commentsData?.comments?.length ? (
                  commentsData.comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3 animate-fade-in" data-testid={`comment-item-${comment.id}`}>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                        <img 
                          src={sanitizeUrl(comment.user.profilePicture || `https://images.unsplash.com/photo-${150000000 + comment.user.id}?w=40&h=40&fit=crop`, 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=40&h=40&fit=crop')}
                          alt={`${comment.user.displayName}'s profile picture`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          data-testid={`img-comment-profile-${comment.id}`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1.5">
                          <span className="text-white font-semibold text-sm" data-testid={`text-comment-author-${comment.id}`}>
                            {comment.user.displayName}
                          </span>
                          <span className="text-gray-500 text-xs font-medium" data-testid={`text-comment-date-${comment.id}`}>
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-white/95 text-sm leading-relaxed" data-testid={`text-comment-content-${comment.id}`}>{comment.comment}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 animate-fade-in" data-testid="container-no-comments">
                    <div className="w-24 h-24 mx-auto mb-5 rounded-full bg-gradient-to-br from-gray-800/50 to-gray-700/50 flex items-center justify-center shadow-xl border border-white/5">
                      <MessageCircle className="w-12 h-12 text-gray-500" aria-hidden="true" />
                    </div>
                    <p className="text-gray-300 text-lg font-semibold mb-1" data-testid="text-no-comments">No comments yet</p>
                    <p className="text-gray-500 text-sm" data-testid="text-no-comments-subtitle">Be the first to comment!</p>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-gray-700/60 flex-shrink-0 bg-[#161823] shadow-2xl">
                <div className="flex space-x-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 ring-1 ring-white/10 flex-shrink-0" aria-hidden="true" data-testid="img-comment-input-avatar"></div>
                  <input
                    type="text"
                    value={state.newComment}
                    onChange={(e) => dispatch({ type: 'SET_NEW_COMMENT', payload: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleCommentSubmit();
                      }
                    }}
                    placeholder="Add a comment..."
                    className="flex-1 bg-gray-800/50 text-white px-4 py-3 rounded-full placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 border border-gray-700/50 focus:border-green-500/50"
                    maxLength={500}
                    data-testid="input-comment"
                  />
                  <button
                    onClick={handleCommentSubmit}
                    disabled={!state.newComment.trim() || addCommentMutation.isPending}
                    className={`px-5 py-3 rounded-full font-semibold transition-all duration-200 ${
                      state.newComment.trim() && !addCommentMutation.isPending
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:scale-105 active:scale-95'
                        : 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50'
                    }`}
                    data-testid="button-post-comment"
                    aria-label="Post comment"
                  >
                    {addCommentMutation.isPending ? 'Posting...' : 'Post'}
                  </button>
                </div>
                {state.newComment.length > 0 && (
                  <div className="text-right mt-2 text-xs text-gray-500 animate-fade-in">
                    {state.newComment.length}/500
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
