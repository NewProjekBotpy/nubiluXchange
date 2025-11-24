import { Heart, MessageCircle, Share2, Bookmark, Music2, VolumeX, Volume2, Play, Plus, Check, Disc3, Loader2, AlertCircle, Video as VideoIcon, RotateCcw, Camera } from "lucide-react";
import { useState, useRef, useEffect, useMemo, useReducer, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { UnifiedNavbar } from "@/components/UnifiedNavbar";
import { PageTransition } from "@/components/PageTransition";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { formatTikTokNumber, sanitizeUrl } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

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
  videoId: number;
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
    case 'LIKE_VIDEO':
      return { ...state, likedVideos: new Set(state.likedVideos).add(action.payload) };
    case 'UNLIKE_VIDEO': {
      const newLiked = new Set(state.likedVideos);
      newLiked.delete(action.payload);
      return { ...state, likedVideos: newLiked };
    }
    case 'SAVE_VIDEO':
      return { ...state, savedVideos: new Set(state.savedVideos).add(action.payload) };
    case 'UNSAVE_VIDEO': {
      const newSaved = new Set(state.savedVideos);
      newSaved.delete(action.payload);
      return { ...state, savedVideos: newSaved };
    }
    case 'FOLLOW_USER':
      return { ...state, followedUsers: new Set(state.followedUsers).add(action.payload) };
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
    case 'START_FOLLOWING_ANIMATION':
      return { ...state, followingAnimation: new Set(state.followingAnimation).add(action.payload) };
    case 'END_FOLLOWING_ANIMATION':
      return { ...state, followingAnimation: new Set() };
    case 'VIDEO_ERROR':
      return { ...state, videoErrors: new Set(state.videoErrors).add(action.payload) };
    case 'VIDEO_BUFFERING':
      return { ...state, videoBuffering: new Set(state.videoBuffering).add(action.payload) };
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

const DOUBLE_TAP_DELAY = 300;
const SWIPE_THRESHOLD = 80;
const VIDEO_PRELOAD_RANGE = 1;

export default function Video() {
  const [, setLocation] = useLocation();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [state, dispatch] = useReducer(videoReducer, initialState);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<number>>(new Set());
  const [videoProgress, setVideoProgress] = useState<Map<number, number>>(new Map());
  const [viewedVideos, setViewedVideos] = useState<Set<number>>(new Set());
  
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Fetch permanent video content
  const { data: videoContentList = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/video-content'],
  });

  // Transform video content to video format and create infinite loop
  const videos: VideoData[] = useMemo(() => {
    const baseVideos = videoContentList.map(content => ({
      id: content.id,
      title: content.title || 'Epic Gaming Moment 🎮✨ #gaming #viral',
      username: content.username || 'gamer_pro',
      displayName: content.displayName || content.username || 'Pro Gamer',
      thumbnail: content.thumbnailUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=800&fit=crop',
      likes: content.likes || 0,
      comments: content.comments || 0,
      shares: content.shares || 0,
      saves: content.saves || 0,
      views: content.views || 0,
      videoUrl: content.contentType === 'video' ? content.videoUrl : undefined,
      musicName: content.musicName || 'Original Sound - Gaming Beats',
      profilePicture: content.profilePicture || `https://images.unsplash.com/photo-${150000000 + content.id}?w=50&h=50&fit=crop&crop=face`
    }));
    
    // Create infinite loop by repeating videos (TikTok style)
    if (baseVideos.length > 0) {
      const repeatCount = Math.max(10, Math.ceil(20 / baseVideos.length));
      const infiniteVideos = [];
      for (let i = 0; i < repeatCount; i++) {
        infiniteVideos.push(...baseVideos);
      }
      return infiniteVideos;
    }
    
    return baseVideos;
  }, [videoContentList]);

  const currentVideo = videos[currentVideoIndex];

  // Fetch user's like/save state for current video
  const { data: userState } = useQuery<{ isLiked: boolean; isSaved: boolean }>({
    queryKey: ['/api/video-content', currentVideo?.id, 'user-state'],
    enabled: !!currentVideo?.id && isAuthenticated,
  });

  // Initialize local state with user state data
  useEffect(() => {
    if (userState && currentVideo) {
      if (userState.isLiked && !state.likedVideos.has(currentVideo.id)) {
        dispatch({ type: 'LIKE_VIDEO', payload: currentVideo.id });
      } else if (!userState.isLiked && state.likedVideos.has(currentVideo.id)) {
        dispatch({ type: 'UNLIKE_VIDEO', payload: currentVideo.id });
      }
      
      if (userState.isSaved && !state.savedVideos.has(currentVideo.id)) {
        dispatch({ type: 'SAVE_VIDEO', payload: currentVideo.id });
      } else if (!userState.isSaved && state.savedVideos.has(currentVideo.id)) {
        dispatch({ type: 'UNSAVE_VIDEO', payload: currentVideo.id });
      }
    }
  }, [userState, currentVideo]);

  // Mutations for like/save/share/view actions
  const likeMutation = useMutation({
    mutationFn: async ({ videoId, isLiked }: { videoId: number; isLiked: boolean }) => {
      return apiRequest(`/api/video-content/${videoId}/like`, {
        method: 'POST',
        body: { isLiked }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-content'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update like status",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ videoId, isSaved }: { videoId: number; isSaved: boolean }) => {
      return apiRequest(`/api/video-content/${videoId}/save`, {
        method: 'POST',
        body: { isSaved }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-content'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update save status",
        variant: "destructive",
      });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async (videoId: number) => {
      return apiRequest(`/api/video-content/${videoId}/share`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-content'] });
    },
    onError: (error: any) => {
      logger.warn('Failed to track share', { component: 'Video', operation: 'trackShareMutation', error: error?.message });
    },
  });

  const viewMutation = useMutation({
    mutationFn: async (videoId: number) => {
      return apiRequest(`/api/video-content/${videoId}/view`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-content'] });
    },
    onError: (error: any) => {
      logger.warn('Failed to track view', { component: 'Video', operation: 'trackViewMutation', error: error?.message });
    },
  });

  // Haptic feedback with error handling
  const vibrate = useCallback((duration = 10) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch (error) {
        logger.debug('Vibration not supported', { component: 'Video', operation: 'doubleTapLike', error: (error as Error)?.message });
      }
    }
  }, []);

  // Cleanup timeouts and video elements on unmount
  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
      animationTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      animationTimeoutsRef.current = [];
      
      videoRefs.current.forEach(video => {
        if (video) {
          video.pause();
          video.src = '';
          video.load();
        }
      });
      videoRefs.current = [];
    };
  }, []);

  // Sync mute state with video elements on state change
  useEffect(() => {
    videoRefs.current.forEach((video) => {
      if (video) {
        video.muted = state.isMuted;
      }
    });
  }, [state.isMuted]);

  // Auto-play current video with lazy loading, preload images, and track views
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      
      const isInRange = Math.abs(index - currentVideoIndex) <= VIDEO_PRELOAD_RANGE;
      
      if (index === currentVideoIndex && !state.isPaused && isInRange) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            logger.warn('Video play failed', { component: 'Video', operation: 'playVideo', videoId: videos[index].id, error: error?.message });
            dispatch({ type: 'VIDEO_ERROR', payload: videos[index].id });
          });
        }
        
        // Track view once per video when it starts playing
        const videoId = videos[index].id;
        if (!viewedVideos.has(videoId)) {
          setViewedVideos(prev => new Set(prev).add(videoId));
          viewMutation.mutate(videoId);
        }
      } else {
        video.pause();
      }
    });
    
    videos.forEach((video, index) => {
      const isInRange = Math.abs(index - currentVideoIndex) <= VIDEO_PRELOAD_RANGE;
      if (isInRange && !video.videoUrl && video.thumbnail) {
        const img = new Image();
        img.onload = () => {
          setImageLoadErrors(prev => {
            const newSet = new Set(prev);
            newSet.delete(video.id);
            return newSet;
          });
        };
        img.onerror = () => {
          setImageLoadErrors(prev => new Set(prev).add(video.id));
        };
        img.src = sanitizeUrl(video.thumbnail, '');
      }
    });
  }, [currentVideoIndex, state.isPaused, videos, viewedVideos, viewMutation]);

  // Horizontal swipe navigation (between pages)
  const { handleTouchStart: handleHorizontalStart, handleTouchMove: handleHorizontalMove, handleTouchEnd: handleHorizontalEnd } = useSwipeNavigation({
    currentPage: 'konten',
  });

  // Vertical touch/swipe handlers (between videos) - TikTok-like behavior
  const handleTouchStartVertical = useCallback((e: React.TouchEvent) => {
    dispatch({ type: 'SET_TOUCH_Y', payload: e.touches[0].clientY });
    dispatch({ type: 'SET_DRAGGING', payload: true });
    dispatch({ type: 'SET_TRANSITIONING', payload: false });
    dispatch({ type: 'SET_DRAG_OFFSET', payload: 0 });
    handleHorizontalStart(e);
  }, [handleHorizontalStart]);

  const handleTouchMoveVertical = useCallback((e: React.TouchEvent) => {
    if (state.isDragging) {
      const currentY = e.touches[0].clientY;
      const rawDiff = currentY - state.touchStartY;
      
      // Block pull-to-refresh when scrolling up at the top
      if (currentVideoIndex === 0 && rawDiff > 0) {
        e.preventDefault();
      }
      
      const containerHeight = containerRef.current?.clientHeight || window.innerHeight;
      const normalizedDiff = (rawDiff / containerHeight) * 100;
      
      // Remove boundary restrictions for infinite scroll
      const dragOffset = normalizedDiff;
      
      dispatch({ type: 'SET_DRAG_OFFSET', payload: dragOffset });
    }
    handleHorizontalMove(e);
  }, [state.isDragging, state.touchStartY, currentVideoIndex, handleHorizontalMove]);

  const handleTouchEndVertical = useCallback((e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientY;
    const diff = state.touchStartY - touchEnd;

    const touchStartX = e.changedTouches[0].clientX;
    const horizontalDiff = Math.abs(touchStartX - e.changedTouches[0].clientX);

    dispatch({ type: 'SET_DRAGGING', payload: false });
    dispatch({ type: 'SET_DRAG_OFFSET', payload: 0 });
    dispatch({ type: 'SET_TRANSITIONING', payload: true });

    if (Math.abs(diff) > SWIPE_THRESHOLD && Math.abs(diff) > horizontalDiff) {
      vibrate(5);
      // Remove boundary checks for infinite scroll
      if (diff > 0) {
        // Swipe up - next video
        setCurrentVideoIndex(prev => (prev + 1) % videos.length);
      } else if (diff < 0) {
        // Swipe down - previous video
        setCurrentVideoIndex(prev => (prev - 1 + videos.length) % videos.length);
      }
    }

    setTimeout(() => {
      dispatch({ type: 'SET_TRANSITIONING', payload: false });
    }, 300);

    handleHorizontalEnd();
  }, [state.touchStartY, videos.length, vibrate, handleHorizontalEnd]);

  // Double tap to like with heart animation
  const handleDoubleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      e.preventDefault();
      
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }

      if (!currentVideo || state.likedVideos.has(currentVideo.id)) return;

      dispatch({ type: 'LIKE_VIDEO', payload: currentVideo.id });
      dispatch({ type: 'SHOW_DOUBLE_TAP_HEART' });
      vibrate(15);
      
      const timeout = setTimeout(() => {
        dispatch({ type: 'HIDE_DOUBLE_TAP_HEART' });
      }, 1000);
      animationTimeoutsRef.current.push(timeout);
    } else {
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
      
      pauseTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'TOGGLE_PAUSE' });
        pauseTimeoutRef.current = null;
      }, DOUBLE_TAP_DELAY);
    }

    lastTapRef.current = now;
  }, [currentVideo, state.likedVideos, vibrate]);

  const handleLike = useCallback(() => {
    if (!currentVideo) return;

    const isCurrentlyLiked = state.likedVideos.has(currentVideo.id);
    const newLikedState = !isCurrentlyLiked;

    // Optimistic update
    if (newLikedState) {
      dispatch({ type: 'LIKE_VIDEO', payload: currentVideo.id });
      dispatch({ type: 'START_LIKE_ANIMATION' });
      vibrate(10);
      
      const timeout = setTimeout(() => {
        dispatch({ type: 'END_LIKE_ANIMATION' });
      }, 400);
      animationTimeoutsRef.current.push(timeout);
    } else {
      dispatch({ type: 'UNLIKE_VIDEO', payload: currentVideo.id });
    }

    // Call backend mutation
    likeMutation.mutate({ videoId: currentVideo.id, isLiked: newLikedState });
  }, [currentVideo, state.likedVideos, vibrate, likeMutation]);

  const handleSave = useCallback(() => {
    if (!currentVideo) return;

    const isCurrentlySaved = state.savedVideos.has(currentVideo.id);
    const newSavedState = !isCurrentlySaved;

    // Optimistic update
    if (newSavedState) {
      dispatch({ type: 'SAVE_VIDEO', payload: currentVideo.id });
      vibrate(10);
    } else {
      dispatch({ type: 'UNSAVE_VIDEO', payload: currentVideo.id });
    }

    // Call backend mutation
    saveMutation.mutate({ videoId: currentVideo.id, isSaved: newSavedState });
  }, [currentVideo, state.savedVideos, vibrate, saveMutation]);

  const handleFollow = useCallback(() => {
    if (!currentVideo) return;

    if (state.followedUsers.has(currentVideo.username)) {
      dispatch({ type: 'UNFOLLOW_USER', payload: currentVideo.username });
    } else {
      dispatch({ type: 'FOLLOW_USER', payload: currentVideo.username });
      dispatch({ type: 'START_FOLLOWING_ANIMATION', payload: currentVideo.username });
      vibrate(10);
      
      const timeout = setTimeout(() => {
        dispatch({ type: 'END_FOLLOWING_ANIMATION' });
      }, 1000);
      animationTimeoutsRef.current.push(timeout);
      
      toast({
        title: "Following",
        description: `You're now following @${currentVideo.username}`,
      });
    }
  }, [currentVideo, state.followedUsers, vibrate, toast]);

  const handleShare = useCallback(async () => {
    if (!currentVideo) return;

    vibrate(10);
    dispatch({ type: 'START_SHARE_ANIMATION' });
    
    const timeout = setTimeout(() => {
      dispatch({ type: 'END_SHARE_ANIMATION' });
    }, 400);
    animationTimeoutsRef.current.push(timeout);
    
    // Track share in backend
    shareMutation.mutate(currentVideo.id);
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied!",
          description: "Video link copied to clipboard",
        });
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (error) {
      logger.warn('Failed to copy link', { component: 'Video', operation: 'copyLink', error: (error as Error)?.message });
      toast({
        title: "Share",
        description: "Unable to copy link automatically",
        variant: "destructive",
      });
    }
  }, [vibrate, toast, currentVideo, shareMutation]);

  const handleComments = useCallback(() => {
    vibrate(10);
    dispatch({ type: 'START_COMMENT_ANIMATION' });
    
    const timeout = setTimeout(() => {
      dispatch({ type: 'END_COMMENT_ANIMATION' });
    }, 400);
    animationTimeoutsRef.current.push(timeout);
    
    dispatch({ type: 'SET_COMMENTS_VISIBLE', payload: true });
  }, [vibrate]);

  const toggleCaption = useCallback((videoId: number) => {
    dispatch({ type: 'TOGGLE_CAPTION', payload: videoId });
  }, []);

  // Retry handler for failed media
  const handleRetry = useCallback((videoId: number, isVideo: boolean) => {
    if (isVideo) {
      dispatch({ type: 'CLEAR_ERROR', payload: videoId });
      const videoIndex = videos.findIndex(v => v.id === videoId);
      if (videoIndex !== -1 && videoRefs.current[videoIndex]) {
        const video = videoRefs.current[videoIndex];
        if (video) {
          video.load();
          video.play().catch(error => {
            logger.warn('Retry play failed', { component: 'Video', operation: 'retryPlay', videoId, error: error?.message });
            dispatch({ type: 'VIDEO_ERROR', payload: videoId });
          });
        }
      }
    } else {
      setImageLoadErrors(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    }
    vibrate(10);
    toast({
      title: "Retrying...",
      description: "Attempting to reload media",
    });
  }, [videos, vibrate, toast]);

  // Track video progress
  const handleVideoTimeUpdate = useCallback((videoId: number, video: HTMLVideoElement) => {
    if (video.duration && !isNaN(video.duration)) {
      const progress = (video.currentTime / video.duration) * 100;
      setVideoProgress(prev => {
        const newMap = new Map(prev);
        newMap.set(videoId, progress);
        return newMap;
      });
    }
  }, []);

  // Fetch comments
  const { data: commentsData } = useQuery<{
    comments: VideoComment[];
    count: number;
  }>({
    queryKey: ['/api/video-content', currentVideo?.id, 'comments'],
    enabled: !!currentVideo?.id && state.showComments,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ videoId, comment }: { videoId: number; comment: string }) => {
      return apiRequest(`/api/video-content/${videoId}/comments`, {
        method: 'POST',
        body: { comment }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-content', currentVideo?.id, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/video-content'] });
      dispatch({ type: 'SET_NEW_COMMENT', payload: "" });
      vibrate(10);
      toast({
        title: "Comment posted!",
        description: "Your comment has been added",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post comment",
        variant: "destructive",
      });
    },
  });

  const handleCommentSubmit = useCallback(() => {
    if (!state.newComment.trim() || !currentVideo) return;

    addCommentMutation.mutate({
      videoId: currentVideo.id,
      comment: state.newComment.trim(),
    });
  }, [state.newComment, currentVideo, addCommentMutation]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          // Infinite scroll for keyboard navigation
          setCurrentVideoIndex(prev => (prev - 1 + videos.length) % videos.length);
          break;
        case 'ArrowDown':
          e.preventDefault();
          // Infinite scroll for keyboard navigation
          setCurrentVideoIndex(prev => (prev + 1) % videos.length);
          break;
        case ' ':
          e.preventDefault();
          dispatch({ type: 'TOGGLE_PAUSE' });
          break;
        case 'm':
          e.preventDefault();
          dispatch({ type: 'TOGGLE_MUTE' });
          break;
        case 'l':
          e.preventDefault();
          if (currentVideo) {
            if (state.likedVideos.has(currentVideo.id)) {
              dispatch({ type: 'UNLIKE_VIDEO', payload: currentVideo.id });
            } else {
              dispatch({ type: 'LIKE_VIDEO', payload: currentVideo.id });
              dispatch({ type: 'START_LIKE_ANIMATION' });
              vibrate(10);
              
              const timeout = setTimeout(() => {
                dispatch({ type: 'END_LIKE_ANIMATION' });
              }, 400);
              animationTimeoutsRef.current.push(timeout);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentVideoIndex, videos.length, currentVideo, state.likedVideos, vibrate]);

  if (isLoading) {
    return (
      <div className="h-screen bg-black relative overflow-hidden" role="status" aria-live="polite">
        <UnifiedNavbar 
          activeTab="konten"
          showSearchBar={false}
          showFilterButton={false}
          transparent={true}
          hideLogo={true}
        />
        
        {/* TikTok-Style Loading Skeleton */}
        <div className="absolute inset-0 bg-black">
          {/* Skeleton Profile Picture */}
          <div className="absolute right-3 bottom-[180px] z-30">
            <div className="w-12 h-12 rounded-full bg-gray-700 animate-pulse ring-2 ring-white/20"></div>
          </div>
          
          {/* Skeleton Action Buttons */}
          <div className="absolute right-3 bottom-[240px] z-30 flex flex-col items-center space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center space-y-1">
                <div className="w-11 h-11 rounded-full bg-gray-700 animate-pulse"></div>
                <div className="w-8 h-3 bg-gray-700 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
          
          {/* Skeleton Username and Caption */}
          <div className="absolute left-3 bottom-[100px] right-24 z-30 space-y-3">
            <div className="h-5 bg-gray-700 rounded w-32 animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4 animate-pulse"></div>
          </div>
          
          {/* Skeleton Music Disc */}
          <div className="absolute right-3 bottom-[100px] z-30">
            <div className="w-10 h-10 rounded-full bg-gray-700 animate-pulse"></div>
          </div>
          
          {/* Skeleton Music Text */}
          <div className="absolute left-3 bottom-[72px] z-30 flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-700 rounded animate-pulse"></div>
            <div className="w-40 h-3 bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        
        <span className="sr-only">Loading videos...</span>
      </div>
    );
  }

  // Empty State
  if (videos.length === 0) {
    return (
      <PageTransition>
        <UnifiedNavbar 
          activeTab="konten"
          showSearchBar={false}
          showFilterButton={false}
          transparent={true}
          hideLogo={true}
        />
        
        <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center animate-fade-in">
          <div className="text-center px-6 space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center shadow-2xl border border-white/10">
              <VideoIcon className="w-12 h-12 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-white text-2xl font-bold" data-testid="text-empty-heading">Belum ada konten</h2>
              <p className="text-gray-400 text-base" data-testid="text-empty-subtitle">Video gaming akan muncul di sini</p>
            </div>
            <button
              onClick={() => setLocation('/')}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
              data-testid="button-explore-products"
            >
              Jelajahi Produk
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <UnifiedNavbar 
        activeTab="konten"
        showSearchBar={false}
        showFilterButton={false}
        transparent={true}
        hideLogo={true}
      />

      {/* TikTok-style Video Container */}
      <div 
        ref={containerRef}
        className="fixed top-0 left-0 right-0 bottom-16 md:right-20 md:bottom-0 overflow-hidden bg-black"
        style={{ touchAction: 'pan-y', overscrollBehavior: 'none' }}
        onTouchStart={handleTouchStartVertical}
        onTouchMove={handleTouchMoveVertical}
        onTouchEnd={handleTouchEndVertical}
        role="region"
        aria-label="Video feed"
        aria-live="polite"
      >
        {/* Videos Stack */}
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
                      {/* Video/Image Content */}
                      {video.videoUrl ? (
                        <div className="relative w-full h-full bg-black">
                          {/* Video Progress Bar */}
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
                            aria-label={`Video by ${video.displayName}: ${video.title}`}
                            data-testid={`video-player-${video.id}`}
                          />
                          
                          {/* Enhanced Buffering Indicator */}
                          {isBuffering && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-black/40 backdrop-blur-sm animate-fade-in">
                              <div className="animate-pulse">
                                <Loader2 className="w-16 h-16 text-white animate-spin drop-shadow-2xl" aria-label="Buffering..." />
                              </div>
                              <p className="text-white text-sm mt-3 font-medium drop-shadow-lg">Buffering...</p>
                            </div>
                          )}
                          
                          {/* Enhanced Error State */}
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
                          {/* Enhanced Error State for Images */}
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

                      {/* Play Icon Overlay */}
                      {state.isPaused && index === currentVideoIndex && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-fade-in" data-testid="icon-play-paused">
                          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/20">
                            <Play 
                              className="w-8 h-8 text-white drop-shadow-2xl ml-1" 
                              fill="white" 
                              aria-label="Video paused"
                            />
                          </div>
                        </div>
                      )}

                      {/* Double Tap Heart Animation */}
                      {state.doubleTapHeart && index === currentVideoIndex && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                          <div className="relative">
                            <Heart className="w-20 h-20 text-red-500 fill-red-500 animate-heart-burst drop-shadow-2xl" />
                            {[...Array(8)].map((_, i) => (
                              <Heart 
                                key={i}
                                className="absolute top-1/2 left-1/2 w-5 h-5 text-red-500 fill-red-500 drop-shadow-xl"
                                style={{
                                  animation: `heart-particle-${i} 1s ease-out forwards`,
                                  transform: 'translate(-50%, -50%)'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Top Gradient Overlay */}
                      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black/60 via-black/30 to-transparent pointer-events-none" aria-hidden="true" />

                      {/* Bottom Gradient Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" aria-hidden="true" />

                      {/* Top Right Controls */}
                      <div className="absolute top-5 right-4 z-40 flex items-center space-x-2">
                        <button
                          onClick={() => {
                            dispatch({ type: 'TOGGLE_MUTE' });
                            vibrate(5);
                          }}
                          className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-lg flex items-center justify-center text-white hover:bg-black/70 transition-all duration-200 active:scale-90 hover:scale-105 shadow-xl border border-white/10"
                          data-testid="button-mute"
                          aria-label={state.isMuted ? "Unmute video" : "Mute video"}
                        >
                          {state.isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Bottom Content */}
                      {index === currentVideoIndex && (
                        <div className="absolute bottom-0 left-0 right-0 z-30">
                          {/* User Info and Content */}
                          <div className={`px-3 pb-[32px] transition-opacity duration-200 ${state.isDragging ? 'opacity-50' : 'opacity-100'}`}>
                            <div className="flex items-end">
                              {/* User Info Column */}
                              <div className="flex-1 pr-16">
                                {/* Username Tag */}
                                <div 
                                  className="text-white text-sm font-bold mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" 
                                  data-testid="text-username"
                                  role="text"
                                  aria-label={`Username: ${video.username}`}
                                >
                                  @{video.username}
                                </div>
                                
                                {/* View Count Display */}
                                <div 
                                  className="text-white/80 text-[11px] mb-2 font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] animate-fade-in"
                                  data-testid="text-views-count"
                                >
                                  {formatTikTokNumber(video.views)} views
                                </div>
                              
                                {/* Caption */}
                                <div className="text-white text-xs mb-2 leading-relaxed font-normal drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
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

                                {/* Music */}
                                <div className="flex items-center space-x-2 mt-0.5">
                                  <Music2 className="w-3 h-3 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] flex-shrink-0" aria-hidden="true" data-testid="icon-music" />
                                  <div className="flex-1 overflow-hidden">
                                    <div className="text-white text-[11px] opacity-95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] truncate font-medium" role="text" data-testid="text-music-name">
                                      {video.musicName}
                                    </div>
                                  </div>
                                  {/* Rotating Music Disc - Clickable to navigate to Sound page */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (video.musicName) {
                                        setLocation(`/sound/${encodeURIComponent(video.musicName)}`);
                                        vibrate(10);
                                      }
                                    }}
                                    className="relative w-7 h-7 flex-shrink-0 transition-all duration-200 hover:scale-110 active:scale-95"
                                    aria-label={`View all videos using ${video.musicName}`}
                                    data-testid="button-music-disc"
                                  >
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 animate-spin-slow shadow-xl"></div>
                                    <div className="absolute inset-0.5 rounded-full bg-gray-900 flex items-center justify-center shadow-inner">
                                      <Disc3 className="w-3 h-3 text-white" />
                                    </div>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right Side Actions */}
                          <div className={`absolute right-3 bottom-[24px] flex flex-col items-center space-y-3 transition-opacity duration-200 ${state.isDragging ? 'opacity-50' : 'opacity-100'}`}>
                            {/* Profile Avatar with Follow Button */}
                            <div className="relative mb-0.5">
                              <div className={`w-10 h-10 rounded-full overflow-hidden ring-2 ring-white shadow-2xl transition-all duration-200 ${state.followingAnimation.has(video.username) ? 'animate-pulse' : ''}`}>
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
                                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-5 h-5 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all duration-200 active:scale-95 border-2 border-white"
                                  data-testid="button-follow"
                                  aria-label={`Follow ${video.displayName}`}
                                >
                                  <Plus className="w-3 h-3 text-white" strokeWidth={3} />
                                </button>
                              )}
                              {state.followingAnimation.has(video.username) && (
                                <div 
                                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-5 h-5 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-xl transition-all duration-500 ease-out animate-fade-in border-2 border-white"
                                  aria-label="Following"
                                >
                                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                </div>
                              )}
                            </div>

                            {/* Like */}
                            <div className="flex flex-col items-center">
                              <button
                                onClick={handleLike}
                                className={`w-9 h-9 flex items-center justify-center transition-all duration-200 ${state.likeAnimation ? 'animate-bounce-like' : 'active:scale-90 hover:scale-105'}`}
                                data-testid="button-like"
                                aria-label={state.likedVideos.has(video.id) ? "Unlike video" : "Like video"}
                                aria-pressed={state.likedVideos.has(video.id)}
                              >
                                <Heart className={`w-6 h-6 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] transition-all duration-200 ${state.likedVideos.has(video.id) ? 'text-red-500 fill-red-500 scale-110' : 'text-white'}`} />
                              </button>
                              <span className="text-white text-[10px] font-bold mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" role="text" data-testid={`text-likes-count-${video.id}`}>
                                {formatTikTokNumber(video.likes + (state.likedVideos.has(video.id) ? 1 : 0))}
                              </span>
                            </div>

                            {/* Comments */}
                            <div className="flex flex-col items-center">
                              <button
                                onClick={handleComments}
                                className={`w-9 h-9 flex items-center justify-center transition-all duration-200 ${state.commentAnimation ? 'animate-bounce-like' : 'active:scale-90 hover:scale-105'}`}
                                data-testid="button-comments"
                                aria-label={`Open comments (${formatTikTokNumber(commentsData?.count || video.comments)})`}
                              >
                                <MessageCircle className="w-6 h-6 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]" />
                              </button>
                              <span className="text-white text-[10px] font-bold mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" role="text" data-testid={`text-comments-count-${video.id}`}>
                                {formatTikTokNumber(commentsData?.count || video.comments)}
                              </span>
                            </div>

                            {/* Save/Bookmark */}
                            <div className="flex flex-col items-center">
                              <button
                                onClick={handleSave}
                                className={`w-9 h-9 flex items-center justify-center transition-all duration-200 active:scale-90 hover:scale-105 ${state.savedVideos.has(video.id) ? 'rotate-12' : ''}`}
                                data-testid="button-save"
                                aria-label={state.savedVideos.has(video.id) ? "Unsave video" : "Save video"}
                                aria-pressed={state.savedVideos.has(video.id)}
                              >
                                <Bookmark className={`w-5 h-5 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] transition-all duration-200 ${state.savedVideos.has(video.id) ? 'text-yellow-400 fill-yellow-400' : 'text-white'}`} />
                              </button>
                              <span className="text-white text-[10px] font-bold mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" role="text" data-testid={`text-saves-count-${video.id}`}>
                                {formatTikTokNumber(video.saves + (state.savedVideos.has(video.id) ? 1 : 0))}
                              </span>
                            </div>

                            {/* Share */}
                            <div className="flex flex-col items-center">
                              <button
                                onClick={handleShare}
                                className={`w-9 h-9 flex items-center justify-center transition-all duration-200 ${state.shareAnimation ? 'animate-bounce-like' : 'active:scale-90 hover:scale-105'}`}
                                data-testid="button-share"
                                aria-label="Share video"
                              >
                                <Share2 className="w-5 h-5 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]" />
                              </button>
                              <span className="text-white text-[10px] font-bold mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" role="text" data-testid={`text-shares-count-${video.id}`}>
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

      {/* Comments Drawer - TikTok Style Enhanced */}
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
            {/* Drag Handle */}
            <div className="flex justify-center pt-4 pb-3" aria-hidden="true" data-testid="handle-comments-drag">
              <div className="w-14 h-1.5 bg-gray-500 rounded-full shadow-md"></div>
            </div>

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-700/60 flex-shrink-0">
              <h3 id="comments-title" className="text-white font-bold text-lg" data-testid="text-comments-header">
                {formatTikTokNumber(commentsData?.count || 0)} {commentsData?.count === 1 ? 'comment' : 'comments'}
              </h3>
            </div>

            {/* Comments List */}
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

            {/* Comment Input */}
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

      {/* Floating Action Button for Upload */}
      {isAuthenticated && (
        <button
          onClick={() => {
            setLocation('/upload/video');
            vibrate(10);
          }}
          className="fixed bottom-24 right-6 md:bottom-8 md:right-28 z-50 w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-full shadow-2xl shadow-green-500/50 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 border-2 border-white/20"
          data-testid="button-upload-fab"
          aria-label="Upload video"
        >
          <Camera className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      )}
    </PageTransition>
  );
}
