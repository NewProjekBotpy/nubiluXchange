import { Plus, Eye, Repeat2, X, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { BolderAvatar } from "@/components/ui/bolder-avatar";
import { SegmentedProgressRing } from "@/components/ui/segmented-progress-ring";
import { 
  calculateStorySegments,
  Story
} from "@/utils/status-helpers";
import { useStatusData, ViewedStatusIdsResponse } from "@/hooks/useStatusData";
import { useStoryTimer } from "@/hooks/useStoryTimer";
import { useStatusGestures } from "@/hooks/useStatusGestures";

interface UserWithStories {
  userId: number;
  username: string;
  stories: Story[];
  storyCount: number;
  viewedCount: number;
  strokeDasharray: string;
  content: string;
  media: string | null;
  backgroundColor: string | null;
  profilePicture?: string;
  avatarAuraColor: string;
  avatarBorderStyle: string;
  fallback: string;
  hasNewStatus: boolean;
  isMyStatus: boolean;
  createdAt: string;
}

interface StatusModalState {
  isOpen: boolean;
  userId?: number;
  currentStoryIndex?: number;
}

interface StatusViewer {
  id: number;
  username: string;
  profilePicture?: string;
  viewedAt: string;
}

export default function StatusBanner() {
  const [statusModal, setStatusModal] = useState<StatusModalState>({ isOpen: false });
  const [viewersModal, setViewersModal] = useState<{ isOpen: boolean; statusId?: number }>({ isOpen: false });
  const [replyText, setReplyText] = useState("");
  const [isReplyExpanded, setIsReplyExpanded] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Fetch status data using custom hook
  const { viewedStatusIds, myStatuses, activeStatuses, isLoadingStatuses } = useStatusData();

  // Group statuses by userId using Map for O(n) performance
  // Filter out current user's statuses - they should only appear in "My Status" section
  const usersWithStories = useMemo(() => {
    const userMap = new Map<number, { userId: number; username: string; stories: Story[] }>();
    
    // O(n) grouping using Map - exclude current user's statuses
    activeStatuses.forEach((status) => {
      // Skip current user's statuses
      if (user && status.userId === user.id) {
        return;
      }
      
      const existing = userMap.get(status.userId);
      
      if (existing) {
        existing.stories.push({
          id: status.id,
          content: status.content,
          createdAt: status.createdAt,
          media: status.media,
          mediaType: status.mediaType,
          musicUrl: status.musicUrl,
          duration: status.duration,
          backgroundColor: status.backgroundColor
        });
      } else {
        userMap.set(status.userId, {
          userId: status.userId,
          username: status.username,
          stories: [{
            id: status.id,
            content: status.content,
            createdAt: status.createdAt,
            media: status.media,
            mediaType: status.mediaType,
            musicUrl: status.musicUrl,
            duration: status.duration,
            backgroundColor: status.backgroundColor
          }]
        });
      }
    });
    
    // Convert Map to array
    return Array.from(userMap.values());
  }, [activeStatuses, user]);

  // Mutation for handling status repost
  const repostStatusMutation = useMutation({
    mutationFn: async ({ statusId }: { statusId: number }) => {
      return apiRequest('/api/reposts', {
        method: 'POST',
        body: { statusId }
      });
    },
    onSuccess: (data) => {
      const action = data.isReposted ? 'direpost' : 'dibatalkan repostnya';
      toast({
        title: data.isReposted ? "Berhasil repost!" : "Repost dibatalkan",
        description: `Status telah ${action}`,
      });
      // Invalidate all repost-related queries (covers all user-specific queries too)
      queryClient.invalidateQueries({ queryKey: ['/api/reposts'] });
    },
    onError: (error) => {
      toast({
        title: "Gagal repost",
        description: "Terjadi kesalahan saat mencoba repost status",
        variant: "destructive",
      });
    }
  });

  // Mutation for marking status as viewed with optimistic updates for instant UI response
  const markAsViewedMutation = useMutation({
    mutationFn: async (statusId: number) => {
      return apiRequest(`/api/status/${statusId}/view`, {
        method: 'POST',
      });
    },
    // Optimistic update: Update UI immediately before API call completes
    onMutate: async (statusId: number) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['/api/status/my-views'] });
      
      // Snapshot the previous value
      const previousViews = queryClient.getQueryData<ViewedStatusIdsResponse>(['/api/status/my-views']);
      
      // Optimistically update the cache
      queryClient.setQueryData<ViewedStatusIdsResponse>(['/api/status/my-views'], (old) => {
        if (!old) return { viewedStatusIds: [statusId] };
        
        // Add the new statusId if it's not already there
        const existingIds = old.viewedStatusIds || [];
        if (!existingIds.includes(statusId)) {
          return { viewedStatusIds: [...existingIds, statusId] };
        }
        return old;
      });
      
      // Return context with previous value for rollback on error
      return { previousViews };
    },
    // If mutation fails, rollback to previous value
    onError: (err, statusId, context) => {
      if (context?.previousViews) {
        queryClient.setQueryData(['/api/status/my-views'], context.previousViews);
      }
    },
    // Always refetch after error or success to ensure sync with server
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/status/my-views'] });
    },
  });

  // Fetch status viewers when modal is open
  const { data: statusViewers = [] } = useQuery<StatusViewer[]>({
    queryKey: ['/api/status', viewersModal.statusId, 'views'],
    enabled: viewersModal.isOpen && !!viewersModal.statusId,
    staleTime: 10 * 1000, // 10 seconds
  });

  // My status (always first) - use actual user's status data
  const myStatus = useMemo(() => {
    // Convert my statuses to stories format
    const myStories: Story[] = myStatuses.map((status) => ({
      id: status.id,
      content: status.content,
      createdAt: status.createdAt,
      media: status.media,
      mediaType: status.mediaType,
      musicUrl: status.musicUrl,
      duration: status.duration,
      backgroundColor: status.backgroundColor
    }));
    
    // Sort stories by createdAt (descending - most recent first)
    // Server already filters expired statuses, so no need for client-side filtering
    const recentStories = myStories
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const storyCount = recentStories.length;
    
    return {
      userId: user?.id || 0,
      username: "Status saya",
      stories: recentStories,
      profilePicture: user?.profilePicture,
      avatarAuraColor: user?.avatarAuraColor || 'purple',
      avatarBorderStyle: user?.avatarBorderStyle || 'energy',
      fallback: user?.username ? user.username.charAt(0).toUpperCase() : 'U',
      hasNewStatus: storyCount > 0,
      isMyStatus: true,
      media: recentStories[0]?.media || null,
      content: recentStories[0]?.content || "Tambah status baru",
      backgroundColor: recentStories[0]?.backgroundColor || null,
      strokeDasharray: calculateStorySegments(storyCount),
      storyCount: storyCount,
      viewedCount: storyCount, // All my own stories show as "viewed" (green ring)
      createdAt: recentStories[0]?.createdAt || new Date().toISOString()
    };
  }, [myStatuses, user]);

  // Transform users with stories data with memoization and sorting
  const transformedUsers: UserWithStories[] = useMemo(() => {
    return usersWithStories
      .map((user) => {
        // Sort stories by createdAt (descending - most recent first)
        // Server already filters expired statuses, so no need for client-side filtering
        const recentStories = user.stories
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        const storyCount = recentStories.length;
        
        // Count how many stories from this user the current user has viewed
        const viewedCount = recentStories.filter((story: Story) => 
          viewedStatusIds.includes(story.id)
        ).length;
        
        return {
          userId: user.userId,
          username: user.username,
          stories: recentStories,
          storyCount: storyCount,
          viewedCount,
          strokeDasharray: calculateStorySegments(storyCount),
          content: recentStories[0]?.content || '', // Show latest story content
          media: recentStories[0]?.media, // Show latest story media
          backgroundColor: recentStories[0]?.backgroundColor || null, // Show latest story background color
          profilePicture: undefined, // Let BolderAvatar use fallback
          avatarAuraColor: 'purple', // Default for other users until we have their settings
          avatarBorderStyle: 'energy', // Default for other users
          fallback: user.username ? user.username.charAt(0).toUpperCase() : 'U',
          hasNewStatus: storyCount > 0,
          isMyStatus: false, // These are public user statuses
          createdAt: recentStories[0]?.createdAt
        };
      })
      .filter((user: UserWithStories) => user.storyCount > 0) // Only show users with active stories
      .sort((a, b) => {
        // Sort users by most recent story (ascending - oldest first/LEFT, newest last/RIGHT)
        // This matches WhatsApp behavior where newest status appears on the right
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aDate - bDate; // Oldest first (left), newest last (right)
      });
  }, [usersWithStories, viewedStatusIds]);

  // Combine myStatus with transformedUsers for rendering
  // myStatus should ALWAYS be first (leftmost) to match UI rendering
  const allStatuses = useMemo(() => {
    // Always keep myStatus at the left (first position) to match UI
    return [myStatus, ...transformedUsers];
  }, [myStatus, transformedUsers]);

  // Get current user and story for modal
  // Include myStatus in the search so we can view our own statuses
  const currentUser = statusModal.userId === myStatus.userId 
    ? myStatus 
    : transformedUsers.find(u => u.userId === statusModal.userId);
  
  // Reverse stories for viewer (oldest first, newest last)
  const reversedStories = useMemo(() => {
    return currentUser ? [...currentUser.stories].reverse() : [];
  }, [currentUser?.stories]);
  
  const currentStory = reversedStories[statusModal.currentStoryIndex || 0];

  const closeStatusModal = () => {
    setStatusModal({ isOpen: false });
    setIsPaused(false);
    resetTimer();
    setReplyText("");
    setIsReplyExpanded(false);
    
    // Reset gesture state and timers
    if (resetGestures) {
      resetGestures();
    }
    
    // Don't refetch here - let the optimistic update from markAsViewedMutation handle immediate UI updates
    // The mutation's onSettled callback will invalidate and refetch after server confirms
  };

  // Story timer hook for auto-advance and pause/resume functionality
  // Hook auto-resets when story/user changes via dependency tracking
  const { isPaused, setIsPaused, progress, resetTimer } = useStoryTimer({
    isActive: statusModal.isOpen,
    currentStoryIndex: statusModal.currentStoryIndex,
    userId: statusModal.userId,
    currentUser,
    onAdvance: () => {
      // Inline auto-advance logic to avoid circular dependency
      if (!currentUser || statusModal.currentStoryIndex === undefined) return;
      
      const nextIndex = statusModal.currentStoryIndex + 1;
      if (nextIndex < reversedStories.length) {
        setStatusModal({ ...statusModal, currentStoryIndex: nextIndex });
      } else {
        // Move to next user if available
        const currentUserIndex = allStatuses.findIndex(u => u.userId === statusModal.userId);
        if (currentUserIndex < allStatuses.length - 1) {
          const nextUser = allStatuses[currentUserIndex + 1];
          setStatusModal({ isOpen: true, userId: nextUser.userId, currentStoryIndex: 0 });
        } else {
          // Close modal inline
          closeStatusModal();
        }
      }
    }
  });

  // Gesture handling hook for pinch zoom, drag to close, and hold to pause
  const {
    isZooming,
    scale,
    translateX,
    translateY,
    dragY,
    isDragging,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    reset: resetGestures,
  } = useStatusGestures({
    isPaused,
    setIsPaused,
    onClose: closeStatusModal,
  });

  const handleNextStory = () => {
    if (!currentUser || statusModal.currentStoryIndex === undefined) return;
    
    const nextIndex = statusModal.currentStoryIndex + 1;
    if (nextIndex < reversedStories.length) {
      setStatusModal({ ...statusModal, currentStoryIndex: nextIndex });
    } else {
      // Move to next user if available
      const currentUserIndex = allStatuses.findIndex(u => u.userId === statusModal.userId);
      if (currentUserIndex < allStatuses.length - 1) {
        const nextUser = allStatuses[currentUserIndex + 1];
        setStatusModal({ isOpen: true, userId: nextUser.userId, currentStoryIndex: 0 });
      } else {
        closeStatusModal();
      }
    }
  };

  // Mark story as viewed when modal opens or story changes (only for authenticated users)
  // Skip marking own statuses as viewed - they should always stay green
  useEffect(() => {
    if (user && statusModal.isOpen && currentStory && !viewedStatusIds.includes(currentStory.id)) {
      // Don't mark own statuses as viewed - keep them green
      if (currentUser?.isMyStatus) {
        return;
      }
      markAsViewedMutation.mutate(currentStory.id);
    }
  }, [statusModal.isOpen, currentStory?.id, user, currentUser?.isMyStatus]);

  const handleStatusClick = (userId: number) => {
    // Check if clicking on own status
    if (userId === myStatus.userId) {
      // If user has stories, view them; otherwise go to upload
      if (myStatus.storyCount > 0) {
        // Start from oldest (index 0 in reversed array means oldest story)
        setStatusModal({ isOpen: true, userId, currentStoryIndex: 0 });
      } else {
        // Navigate to upload with status tab active
        setLocation('/upload?type=status');
      }
      return;
    }
    
    // For other users' statuses: Find first unwatched story
    const clickedUser = transformedUsers.find(u => u.userId === userId);
    if (!clickedUser) {
      return;
    }
    
    // Reverse the stories to match viewer order (oldest first)
    const reversedUserStories = [...clickedUser.stories].reverse();
    
    // Find the first unwatched story
    let startIndex = 0;
    for (let i = 0; i < reversedUserStories.length; i++) {
      if (!viewedStatusIds.includes(reversedUserStories[i].id)) {
        startIndex = i;
        break;
      }
    }
    
    // If all stories are watched, restart from beginning
    if (reversedUserStories.length > 0) {
      const allWatched = reversedUserStories.every(story => viewedStatusIds.includes(story.id));
      if (allWatched) {
        startIndex = 0; // Restart from beginning if all watched
      }
    }
    
    setStatusModal({ isOpen: true, userId, currentStoryIndex: startIndex });
  };

  const handleAddStatus = () => {
    setLocation('/upload');
  };

  const handlePrevStory = () => {
    if (!currentUser || statusModal.currentStoryIndex === undefined) return;
    
    const prevIndex = statusModal.currentStoryIndex - 1;
    if (prevIndex >= 0) {
      setStatusModal({ ...statusModal, currentStoryIndex: prevIndex });
    } else {
      // Move to previous user if available
      const currentUserIndex = allStatuses.findIndex(u => u.userId === statusModal.userId);
      if (currentUserIndex > 0) {
        const prevUser = allStatuses[currentUserIndex - 1];
        // Start from end of reversed array (which is the newest status made oldest first)
        const prevUserReversedStories = [...prevUser.stories].reverse();
        setStatusModal({ 
          isOpen: true, 
          userId: prevUser.userId, 
          currentStoryIndex: prevUserReversedStories.length - 1 
        });
      }
    }
  };

  const handleStatusRepost = async () => {
    if (!currentStory || repostStatusMutation.isPending) return;
    repostStatusMutation.mutate({ statusId: currentStory.id });
  };

  const handleViewViewers = () => {
    if (!currentStory) return;
    setViewersModal({ isOpen: true, statusId: currentStory.id });
  };

  const closeViewersModal = () => {
    setViewersModal({ isOpen: false });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  // Extract song name from music URL or filename
  const getMusicName = (musicUrl: string | null | undefined): string | null => {
    if (!musicUrl) return null;
    
    // Extract filename from URL
    const parts = musicUrl.split('/');
    const filename = parts[parts.length - 1];
    
    // Remove file extension and decode URI
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    const decoded = decodeURIComponent(nameWithoutExt);
    
    // Limit to 25 characters and add ellipsis
    if (decoded.length > 25) {
      return decoded.substring(0, 25) + '...';
    }
    
    return decoded;
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    
    toast({
      title: "Balasan terkirim!",
      description: "Balasan Anda telah dikirim ke pembuat status",
    });
    
    setReplyText("");
    setIsReplyExpanded(false);
    setIsPaused(false);
  };

  // Show loading state
  if (isLoadingStatuses) {
    return (
      <section className="px-0 py-4 bg-nxe-surface/30">
        <h2 className="text-sm font-medium text-white mb-3 px-4">Status</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
          {/* Loading skeletons */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center min-w-max">
              <div className="w-24 h-40 rounded-xl bg-gray-700/50 animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Show empty state if no other users have statuses
  if (transformedUsers.length === 0) {
    return (
      <section className="px-0 py-4 bg-nxe-surface/30">
        <h2 className="text-sm font-medium text-white mb-3 px-4">Status</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
          {/* My Status Card - show user's status or add button (only for authenticated users) */}
          {user && <div className="flex flex-col items-center min-w-max" data-testid="card-status-my">
            <div className="relative">
              <div className="relative w-24 h-40 rounded-xl overflow-hidden">
                {/* Background image with dark overlay if user has status */}
                {myStatus.media ? (
                  <>
                    <img 
                      src={myStatus.media} 
                      alt="My status background" 
                      className="absolute inset-0 w-full h-full object-cover"
                      data-testid="img-background-my"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                  </>
                ) : (
                  <>
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: myStatus.backgroundColor || 'linear-gradient(135deg, #374151, #1f2937)'
                      }}
                      data-testid="background-gradient-my"
                    />
                    {myStatus.storyCount > 0 && myStatus.content && (
                      <div className="absolute inset-0 flex items-center justify-center px-2 pt-16 pb-8">
                        <p className="text-white text-center text-xs font-medium line-clamp-3 drop-shadow-lg" data-testid="text-preview-my">
                          {myStatus.content}
                        </p>
                      </div>
                    )}
                  </>
                )}
                
                {/* Profile picture with story ring or plus icon */}
                <div className="absolute top-3 left-1/2 transform -translate-x-1/2">
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    {myStatus.storyCount > 0 ? (
                      <>
                        <div className="absolute inset-0">
                          <SegmentedProgressRing
                            totalSegments={myStatus.storyCount}
                            viewedSegments={myStatus.storyCount} // All own stories are "viewed"
                            size="sm"
                            className=""
                          />
                        </div>
                        {/* Avatar wrapper */}
                        <div className="relative w-12 h-12 rounded-full overflow-hidden">
                          <BolderAvatar
                            src={myStatus.profilePicture}
                            alt="My status"
                            fallback={myStatus.fallback}
                            size="sm"
                            auraColor={(myStatus.avatarAuraColor as "purple" | "green" | "blue" | "orange" | "red" | "pink" | "cyan" | "gold") || 'purple'}
                            borderStyle={(myStatus.avatarBorderStyle as "energy" | "geometric" | "neon" | "crystal") || 'energy'}
                            interactive={true}
                            className="w-full h-full"
                            data-testid="img-avatar-my"
                          />
                          {/* Clickable area for avatar only - goes to upload */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation('/upload?type=status');
                            }}
                            className="absolute inset-0 z-10"
                            data-testid="button-avatar-upload"
                          />
                        </div>
                        {/* Add button - water drop glassmorphism effect */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation('/upload?type=status');
                          }}
                          className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center hover:scale-110 transition-all z-20 backdrop-blur-md border border-white/30"
                          style={{
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.2) 50%, rgba(255, 255, 255, 0.3) 100%)',
                            boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                          }}
                          data-testid="button-add-status-plus"
                        >
                          <Plus className="h-3 w-3 text-black" style={{ mixBlendMode: 'multiply', opacity: 0.7 }} />
                        </button>
                      </>
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden backdrop-blur-md border border-white/30"
                        style={{
                          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.2) 50%, rgba(255, 255, 255, 0.3) 100%)',
                          boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.3), inset 0 2px 0 0 rgba(255, 255, 255, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <Plus className="h-6 w-6 text-black" style={{ mixBlendMode: 'multiply', opacity: 0.7 }} />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Username at bottom */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 max-w-[90px] px-1">
                  {myStatus.storyCount > 0 ? (
                    <p className="text-sm text-white font-medium text-center drop-shadow-lg truncate">
                      {myStatus.username}
                    </p>
                  ) : (
                    <p className="text-sm text-white font-medium text-center drop-shadow-lg whitespace-pre-line">
                      Tambah{"\n"}Status
                    </p>
                  )}
                </div>
                
                {/* Clickable overlay */}
                <button 
                  onClick={() => handleStatusClick(myStatus.userId)}
                  className="absolute inset-0 hover:scale-105 transition-all duration-300"
                  data-testid="button-my-status"
                />
              </div>
            </div>
          </div>}

          {/* Empty state message */}
          <div className="flex items-center justify-center min-w-max px-4">
            <p className="text-sm text-white/60">Belum ada status terbaru dari pengguna lain</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="px-0 py-4 bg-nxe-surface/30">
        <h2 className="text-sm font-medium text-white mb-3 px-4">Status</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
          {/* My Status Card - show user's status or add button (only for authenticated users) */}
          {user && <div className="flex flex-col items-center min-w-max" data-testid="card-status-my">
            <div className="relative">
              <div className="relative w-24 h-40 rounded-xl overflow-hidden">
                {/* Background image with dark overlay if user has status */}
                {myStatus.media ? (
                  <>
                    <img 
                      src={myStatus.media} 
                      alt="My status background" 
                      className="absolute inset-0 w-full h-full object-cover"
                      data-testid="img-background-my"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                  </>
                ) : (
                  <>
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: myStatus.backgroundColor || 'linear-gradient(135deg, #374151, #1f2937)'
                      }}
                      data-testid="background-gradient-my"
                    />
                    {myStatus.storyCount > 0 && myStatus.content && (
                      <div className="absolute inset-0 flex items-center justify-center px-2 pt-16 pb-8">
                        <p className="text-white text-center text-xs font-medium line-clamp-3 drop-shadow-lg" data-testid="text-preview-my">
                          {myStatus.content}
                        </p>
                      </div>
                    )}
                  </>
                )}
                
                {/* Profile picture with story ring or plus icon */}
                <div className="absolute top-3 left-1/2 transform -translate-x-1/2">
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    {myStatus.storyCount > 0 ? (
                      <>
                        <div className="absolute inset-0">
                          <SegmentedProgressRing
                            totalSegments={myStatus.storyCount}
                            viewedSegments={myStatus.storyCount} // All own stories are "viewed"
                            size="sm"
                            className=""
                          />
                        </div>
                        {/* Avatar wrapper */}
                        <div className="relative w-12 h-12 rounded-full overflow-hidden">
                          <BolderAvatar
                            src={myStatus.profilePicture}
                            alt="My status"
                            fallback={myStatus.fallback}
                            size="sm"
                            auraColor={(myStatus.avatarAuraColor as "purple" | "green" | "blue" | "orange" | "red" | "pink" | "cyan" | "gold") || 'purple'}
                            borderStyle={(myStatus.avatarBorderStyle as "energy" | "geometric" | "neon" | "crystal") || 'energy'}
                            interactive={true}
                            className="w-full h-full"
                            data-testid="img-avatar-my"
                          />
                          {/* Clickable area for avatar only - goes to upload */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation('/upload?type=status');
                            }}
                            className="absolute inset-0 z-10"
                            data-testid="button-avatar-upload"
                          />
                        </div>
                        {/* Add button - water drop glassmorphism effect */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation('/upload?type=status');
                          }}
                          className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center hover:scale-110 transition-all z-20 backdrop-blur-md border border-white/30"
                          style={{
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.2) 50%, rgba(255, 255, 255, 0.3) 100%)',
                            boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                          }}
                          data-testid="button-add-status-plus"
                        >
                          <Plus className="h-3 w-3 text-black" style={{ mixBlendMode: 'multiply', opacity: 0.7 }} />
                        </button>
                      </>
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden backdrop-blur-md border border-white/30"
                        style={{
                          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.2) 50%, rgba(255, 255, 255, 0.3) 100%)',
                          boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.3), inset 0 2px 0 0 rgba(255, 255, 255, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <Plus className="h-6 w-6 text-black" style={{ mixBlendMode: 'multiply', opacity: 0.7 }} />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Username at bottom */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 max-w-[90px] px-1">
                  {myStatus.storyCount > 0 ? (
                    <p className="text-sm text-white font-medium text-center drop-shadow-lg truncate">
                      {myStatus.username}
                    </p>
                  ) : (
                    <p className="text-sm text-white font-medium text-center drop-shadow-lg whitespace-pre-line">
                      Tambah{"\n"}Status
                    </p>
                  )}
                </div>
                
                {/* Clickable overlay */}
                <button 
                  onClick={() => handleStatusClick(myStatus.userId)}
                  className="absolute inset-0 hover:scale-105 transition-all duration-300"
                  data-testid="button-my-status"
                />
              </div>
            </div>
          </div>}
          
          {/* Status Items from other users */}
          {transformedUsers.map((status, index) => {
            // Dark green variations for consistent app theme (#134D37)
            const greenVariations = [
              'linear-gradient(135deg, #134D37, #0F3A2A)', // Primary dark green
              'linear-gradient(135deg, #1B6B4A, #134D37)', // Slightly lighter
              'linear-gradient(135deg, #165240, #103329)', // Medium dark green
              'linear-gradient(135deg, #2D5A47, #1A4A38)', // Balanced green
              'linear-gradient(135deg, #0D4533, #08291F)'  // Very dark green
            ];
            
            // Custom border configuration (prepared for future functionality)
            const borderConfig = {
              style: (status as any).customBorderStyle || 'default',
              color: (status as any).customBorderColor || 'green',
              animation: (status as any).customBorderAnimation || 'none'
            };
            
            const selectedGradient = greenVariations[index % greenVariations.length];
            const selectedBorderStyle = "energy"; // Using energy style for consistent look
            
            // Use attached design preview for first item as sample
            const previewImage = status.media;
            
            return (
              <div key={status.userId} className="flex flex-col items-center min-w-max" data-testid={`card-status-${status.userId}`}>
                <div className="relative">
                  {/* WhatsApp-style status card with background image */}
                  <div className="relative w-24 h-40 rounded-xl overflow-hidden">
                    {/* Background image with dark overlay */}
                    {previewImage ? (
                      <>
                        <img 
                          src={previewImage} 
                          alt="Status background" 
                          className="absolute inset-0 w-full h-full object-cover"
                          data-testid={`img-background-${status.userId}`}
                        />
                        <div className="absolute inset-0 bg-black/30" />
                      </>
                    ) : (
                      <>
                        <div 
                          className="absolute inset-0"
                          style={{
                            background: status.backgroundColor || 'linear-gradient(135deg, #374151, #1f2937)'
                          }}
                          data-testid={`background-gradient-${status.userId}`}
                        />
                        {status.content && (
                          <div className="absolute inset-0 flex items-center justify-center px-2 pt-16 pb-8">
                            <p className="text-white text-center text-xs font-medium line-clamp-3 drop-shadow-lg" data-testid={`text-preview-${status.userId}`}>
                              {status.content}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Profile picture with story-style border at top */}
                    <div className="absolute top-3 left-1/2 transform -translate-x-1/2">
                      <div className="relative w-14 h-14 flex items-center justify-center">
                        {/* Story border segments - WhatsApp style - positioned precisely around avatar */}
                        <div className="absolute inset-0">
                          <SegmentedProgressRing
                            totalSegments={status.storyCount || 0}
                            viewedSegments={status.viewedCount || 0}
                            size="sm"
                            className=""
                            reverse={true}
                          />
                        </div>
                        {/* Avatar inside - centered and slightly smaller than container */}
                        <div className="relative w-12 h-12">
                          <BolderAvatar
                            src={status.profilePicture}
                            alt={`${status.username} status`}
                            fallback={status.fallback}
                            size="sm"
                            auraColor={(status.avatarAuraColor as "purple" | "green" | "blue" | "orange" | "red" | "pink" | "cyan" | "gold") || 'purple'}
                            borderStyle={(status.avatarBorderStyle as "energy" | "geometric" | "neon" | "crystal") || 'energy'}
                            interactive={true}
                            className="w-full h-full"
                            data-testid={`img-avatar-${status.userId}`}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Username at bottom */}
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 max-w-[90px] px-1">
                      <p className="text-sm text-white font-medium text-center drop-shadow-lg truncate">
                        {status.username}
                      </p>
                    </div>
                    
                    {/* Clickable overlay */}
                    <button 
                      onClick={() => handleStatusClick(status.userId)}
                      className="absolute inset-0 hover:scale-105 transition-all duration-300"
                      data-testid={`button-open-status-${status.userId}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Status Modal with Animations */}
      <AnimatePresence>
        {statusModal.isOpen && currentUser && currentStory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: isDragging ? Math.max(0.3, 1 - dragY / 300) : 1 
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: isDragging ? 0 : 0.15 }}
            className="fixed inset-0 z-50"
            style={{
              background: !currentStory.media && currentStory.backgroundColor 
                ? currentStory.backgroundColor 
                : '#000000',
              transform: isDragging ? `translateY(${dragY}px) scale(${Math.max(0.9, 1 - dragY / 1000)})` : 'none',
              overscrollBehavior: 'none',
              touchAction: 'none',
            }}
          >
            <div 
              className="relative w-full h-full"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={() => setIsPaused(false)}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                overscrollBehavior: 'none',
              }}
            >
              {/* Header - Fades out when paused or zooming */}
              <motion.div 
                animate={{ opacity: (isPaused || isZooming) ? 0 : 1 }}
                transition={{ duration: 0.2 }}
                className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4"
                style={{ pointerEvents: (isPaused || isZooming) ? 'none' : 'auto' }}
              >
                    {/* Animated Progress bars for multiple stories */}
                    <div className="flex gap-1 mb-3">
                      {reversedStories.map((_, idx) => (
                        <div key={idx} className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
                          <motion.div 
                            className={`h-full bg-white rounded-full`}
                            initial={{ width: '0%' }}
                            animate={{ 
                              width: idx < (statusModal.currentStoryIndex || 0) 
                                ? '100%' 
                                : idx === (statusModal.currentStoryIndex || 0)
                                ? `${progress}%`
                                : '0%'
                            }}
                            transition={{ duration: 0.1, ease: 'linear' }}
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <BolderAvatar
                          src={currentUser.profilePicture}
                          alt="Profile"
                          fallback={currentUser.fallback}
                          size="sm"
                          auraColor={(currentUser.avatarAuraColor as "purple" | "green" | "blue" | "orange" | "red" | "pink" | "cyan" | "gold") || 'purple'}
                          borderStyle={(currentUser.avatarBorderStyle as "energy" | "geometric" | "neon" | "crystal") || 'energy'}
                          className="w-10 h-10"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">
                            {currentUser.username}
                          </p>
                          <p className="text-white/70 text-xs flex items-center gap-1">
                            <span className="flex-shrink-0">{currentStory.duration || 15} dtk</span>
                            {currentStory.musicUrl && getMusicName(currentStory.musicUrl) && (
                              <>
                                <span className="flex-shrink-0">•</span>
                                <span className="flex items-center gap-1 min-w-0">
                                  <span className="flex-shrink-0">🎵</span>
                                  <span className="truncate">{getMusicName(currentStory.musicUrl)}</span>
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={closeStatusModal}
                        className="text-white text-2xl hover:text-nxe-primary transition-colors"
                        data-testid="button-close-modal"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
              </motion.div>

              {/* Navigation areas - left/right tap zones - Only disabled when zooming */}
              {!isZooming && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevStory();
                    }}
                    className="absolute left-0 top-0 bottom-0 w-1/3 z-30 bg-transparent"
                    data-testid="button-prev-story"
                    aria-label="Previous story"
                  />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextStory();
                    }}
                    className="absolute right-0 top-0 bottom-0 w-1/3 z-30 bg-transparent"
                    data-testid="button-next-story"
                    aria-label="Next story"
                  />
                </>
              )}

              {/* Content without animation - instant teleport between stories */}
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentStory.id}
                  animate={{ 
                    scale: isZooming ? scale : 1,
                    x: isZooming ? translateX : 0,
                    y: isZooming ? translateY : 0
                  }}
                  transition={{ duration: 0 }}
                  className={`flex items-center justify-center h-full ${currentStory.media ? '' : 'px-6'}`}
                  style={{
                    transformOrigin: 'center center',
                  }}
                >
                  <div className={`${currentStory.media ? 'w-full h-full flex flex-col items-center justify-center' : 'w-full text-center'}`}>
                    {currentStory.media && (
                      currentStory.mediaType === 'video' ? (
                        <video
                          src={currentStory.media}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-contain"
                          data-testid="video-status-media"
                        />
                      ) : (
                        <img 
                          src={currentStory.media} 
                          alt="Status media" 
                          className="w-full h-full object-contain"
                          data-testid="img-status-media"
                        />
                      )
                    )}
                    
                    {/* Content text - Fades out when zooming */}
                    <AnimatePresence>
                      {currentStory.content && !isZooming && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.2 }}
                          className={`${
                            currentStory.media 
                              ? 'absolute bottom-24 left-0 right-0 px-4 py-3' 
                              : 'px-4'
                          }`}
                          style={{
                            backgroundColor: currentStory.media ? 'rgba(0, 0, 0, 0.5)' : 'transparent'
                          }}
                          data-testid="text-status-content"
                        >
                          <p className={`text-white leading-relaxed font-medium text-center ${
                            currentStory.media 
                              ? 'text-lg' 
                              : 'text-3xl sm:text-4xl md:text-5xl'
                          }`}
                          style={{
                            textShadow: currentStory.backgroundColor 
                              ? '0 2px 8px rgba(0,0,0,0.3)' 
                              : 'none'
                          }}
                          >
                            {currentStory.content}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Footer Actions - Fades out when paused (except when reply is expanded) or zooming */}
              <AnimatePresence>
                {(!isPaused || isReplyExpanded) && !isZooming && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4"
                  >
                    {/* Check if this is user's own status */}
                    {currentUser.isMyStatus ? (
                      // For own status: show only eye icon in center
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center justify-center"
                      >
                        <button 
                          onClick={handleViewViewers}
                          className="text-white hover:text-nxe-primary transition-colors flex items-center gap-2"
                          data-testid="button-view-viewers"
                        >
                          <Eye className="w-6 h-6" />
                          <span className="text-sm">{statusViewers.length} dilihat</span>
                        </button>
                      </motion.div>
                    ) : (
                      // For others' status: show reply input and action buttons
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <button
                              onClick={handleStatusRepost}
                              disabled={repostStatusMutation.isPending}
                              className={`transition-colors ${
                                repostStatusMutation.isPending 
                                  ? 'text-gray-500 cursor-not-allowed' 
                                  : 'text-white hover:text-nxe-primary'
                              }`}
                              data-testid={`button-repost-status-${currentStory.id}`}
                              title="Repost status ini"
                            >
                              <Repeat2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Reply Input with expand animation */}
                        <AnimatePresence>
                          {!isReplyExpanded ? (
                            <motion.button
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              transition={{ duration: 0.1 }}
                              onClick={() => {
                                setIsReplyExpanded(true);
                                setIsPaused(true);
                              }}
                              className="w-full bg-white/20 text-white/70 px-4 py-2 rounded-full text-sm text-left backdrop-blur-sm"
                              data-testid="button-expand-reply"
                            >
                              Balas status...
                            </motion.button>
                          ) : (
                            <motion.div 
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              transition={{ duration: 0.1 }}
                              className="flex items-center gap-2"
                            >
                              <input 
                                type="text" 
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onBlur={() => {
                                  if (!replyText) {
                                    setIsReplyExpanded(false);
                                    setIsPaused(false);
                                  }
                                }}
                                onFocus={() => setIsPaused(true)}
                                placeholder="Balas status..."
                                className="bg-white/20 text-white placeholder-white/70 px-4 py-2 rounded-full flex-1 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                                autoFocus
                                data-testid="input-reply"
                              />
                              <button
                                onClick={handleSendReply}
                                disabled={!replyText.trim()}
                                className={`p-2 rounded-full transition-colors ${
                                  replyText.trim() 
                                    ? 'bg-nxe-primary text-white' 
                                    : 'bg-white/20 text-white/50'
                                }`}
                                data-testid="button-send-reply"
                              >
                                <Send className="w-5 h-5" />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viewers Modal with slide-up animation */}
      <AnimatePresence>
        {viewersModal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" 
            onClick={closeViewersModal}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-nxe-surface w-full max-w-md rounded-t-2xl max-h-[70vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-lg">
                    Yang Melihat ({statusViewers.length})
                  </h3>
                  <button 
                    onClick={closeViewersModal}
                    className="text-white/70 hover:text-white text-2xl"
                    data-testid="button-close-viewers"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Viewers List */}
              <div className="overflow-y-auto max-h-[calc(70vh-80px)]">
                {statusViewers.length === 0 ? (
                  <div className="p-8 text-center">
                    <Eye className="w-12 h-12 text-white/30 mx-auto mb-2" />
                    <p className="text-white/60">Belum ada yang melihat status ini</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {statusViewers.map((viewer, index) => (
                      <motion.div 
                        key={viewer.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15, delay: index * 0.02 }}
                        className="p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
                      >
                        <BolderAvatar
                          src={viewer.profilePicture || undefined}
                          alt={viewer.username || 'User'}
                          fallback={(viewer.username || 'U').charAt(0).toUpperCase()}
                          size="sm"
                          
                          className="w-10 h-10"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{viewer.username || 'User'}</p>
                          <p className="text-white/60 text-xs truncate">{getTimeAgo(viewer.viewedAt)}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
