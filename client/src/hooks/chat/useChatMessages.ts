import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Message } from "@shared/schema";
import { useScrollAnchor } from "@/hooks/useScrollAnchor";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

export interface UseChatMessagesOptions {
  chatId: string | undefined;
  currentUserId: number | null;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  messageRefs: React.MutableRefObject<Record<number, HTMLDivElement>>;
}

export interface UseChatMessagesReturn {
  // State
  localMessages: Message[];
  isLoadingOlder: boolean;
  hasOlderMessages: boolean;
  showJumpToBottom: boolean;
  unreadCount: number;
  targetMessageId: number | null;
  highlightedMessageId: number | null;
  expandedMessages: Record<number, boolean>;
  
  // Query state
  messages: Message[];
  messagesLoading: boolean;
  messagesSuccess: boolean;
  
  // Actions
  setTargetMessageId: (id: number | null) => void;
  setHighlightedMessageId: (id: number | null) => void;
  handleJumpToMessage: (targetChatId: number, messageId: number) => void;
  handleLoadOlder: () => void;
  handleJumpToBottom: () => void;
  toggleMessageExpansion: (messageId: number) => void;
  
  // Scroll anchor
  scrollAnchor: ReturnType<typeof useScrollAnchor>;
}

export function useChatMessages({
  chatId,
  currentUserId,
  scrollContainerRef,
  messageRefs
}: UseChatMessagesOptions): UseChatMessagesReturn {
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [targetMessageId, setTargetMessageId] = useState<number | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Record<number, boolean>>({});
  
  const previousMessageCountRef = useRef<number>(0);
  const hasInitializedRef = useRef(false);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initialize scroll anchor hook
  const scrollAnchor = useScrollAnchor({
    conversationId: chatId || '',
    containerRef: scrollContainerRef,
    messageRefs,
    enabled: !!chatId
  });

  // Fetch messages for specific chat
  const { data: messages = [], isLoading: messagesLoading, isSuccess: messagesSuccess } = useQuery<Message[]>({
    queryKey: [`/api/chats/${chatId}/messages`],
    enabled: !!chatId,
  });

  // Sync messages from query to local state
  useEffect(() => {
    setLocalMessages(messages);
    setHasOlderMessages(messages.length > 0);
  }, [messages]);

  // Load older messages mutation
  const loadOlderMessagesMutation = useMutation({
    mutationFn: async () => {
      if (!chatId || !localMessages.length) throw new Error("No chat selected or no messages");
      
      const oldestMessageId = localMessages[0]?.id;
      if (!oldestMessageId) throw new Error("No oldest message found");

      const response = await fetch(`/api/chats/${chatId}/messages?before=${oldestMessageId}&limit=20`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load older messages');
      }

      const olderMessages: Message[] = await response.json();
      return olderMessages;
    },
    onSuccess: (olderMessages) => {
      if (olderMessages.length === 0) {
        setHasOlderMessages(false);
      } else {
        setLocalMessages(prev => [...olderMessages, ...prev]);
      }
      setIsLoadingOlder(false);
    },
    onError: (error: any) => {
      logger.error('Failed to load older messages', error, { component: 'useChatMessages', operation: 'loadMoreMessages' });
      setIsLoadingOlder(false);
      toast({
        title: "Gagal memuat pesan lama",
        description: error.message || "Silakan coba lagi.",
        variant: "destructive"
      });
    }
  });

  // Handle load older messages with scroll preservation
  const handleLoadOlder = useCallback(() => {
    if (isLoadingOlder || !hasOlderMessages) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    setIsLoadingOlder(true);
    const beforeHeight = container.scrollHeight;

    loadOlderMessagesMutation.mutate(undefined, {
      onSuccess: () => {
        scrollAnchor.adjustForPrepend(beforeHeight);
      }
    });
  }, [isLoadingOlder, hasOlderMessages, loadOlderMessagesMutation, scrollAnchor, scrollContainerRef]);

  // Handle jump to bottom
  const handleJumpToBottom = useCallback(() => {
    scrollAnchor.scrollToBottom(true);
    setUnreadCount(0);
  }, [scrollAnchor]);

  // Jump to message and highlight it
  const handleJumpToMessage = useCallback((targetChatId: number, messageId: number) => {
    if (!chatId) return;
    
    // Clear any existing highlight timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    
    if (targetChatId !== Number(chatId)) {
      // Different chat - set target for after navigation
      setTargetMessageId(messageId);
    } else {
      // Same chat - scroll to message
      scrollAnchor.scrollToMessage(messageId, 'smooth');
      setHighlightedMessageId(messageId);
      
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedMessageId(null);
        highlightTimeoutRef.current = null;
      }, 3000);
    }
  }, [chatId, scrollAnchor]);

  // Toggle message expansion with scroll adjustment
  const toggleMessageExpansion = useCallback((messageId: number) => {
    const container = scrollContainerRef.current;
    const messageEl = messageRefs.current[messageId];
    
    if (container && messageEl) {
      const messageTopBeforeExpand = messageEl.offsetTop;
      const scrollTopBeforeExpand = container.scrollTop;
      const relativePosition = scrollTopBeforeExpand - messageTopBeforeExpand;
      
      setExpandedMessages(prev => {
        const newState = {
          ...prev,
          [messageId]: !prev[messageId]
        };
        
        requestAnimationFrame(() => {
          const messageTopAfterExpand = messageEl.offsetTop;
          const newScrollTop = messageTopAfterExpand + relativePosition;
          container.scrollTop = newScrollTop;
        });
        
        return newState;
      });
    } else {
      setExpandedMessages(prev => ({
        ...prev,
        [messageId]: !prev[messageId]
      }));
    }
  }, [scrollContainerRef, messageRefs]);

  // Scroll event listener to track position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !chatId) return;

    const handleScroll = () => {
      const isNear = scrollAnchor.isNearBottom(150);
      setShowJumpToBottom(!isNear);
      
      if (isNear) {
        setUnreadCount(0);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    const initialCheck = setTimeout(() => {
      handleScroll();
    }, 100);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(initialCheck);
    };
  }, [chatId, scrollAnchor, scrollContainerRef]);

  // Track new messages arriving while scrolled up
  useEffect(() => {
    if (isLoadingOlder) return;
    
    if (!chatId || !localMessages.length) {
      previousMessageCountRef.current = 0;
      return;
    }

    const currentCount = localMessages.length;
    const previousCount = previousMessageCountRef.current;

    if (currentCount > previousCount && previousCount > 0) {
      const newMessagesCount = currentCount - previousCount;
      const isAtBottom = scrollAnchor.isNearBottom(30);
      
      if (!isAtBottom) {
        setUnreadCount(prev => prev + newMessagesCount);
      } else {
        scrollAnchor.scrollToBottom(false);
      }
    }

    previousMessageCountRef.current = currentCount;
  }, [localMessages.length, chatId, scrollAnchor, isLoadingOlder]);

  // Handle scroll position restore on first load
  useEffect(() => {
    if (!messagesSuccess || messages.length === 0) return;
    if (hasInitializedRef.current) return;

    const savedPosition = localStorage.getItem(`chat-scroll-${chatId}`);
    if (savedPosition) {
      scrollAnchor.restorePosition();
    } else {
      scrollAnchor.scrollToBottom(false);
    }
    
    hasInitializedRef.current = true;
  }, [messagesSuccess, messages.length, chatId, scrollAnchor]);

  // Reset initialization flag when chat changes
  useEffect(() => {
    hasInitializedRef.current = false;
  }, [chatId]);

  // Effect to handle scrolling to target message after navigation
  useEffect(() => {
    if (targetMessageId && messagesSuccess && messages.length > 0) {
      const messageExists = localMessages.some(m => m.id === targetMessageId);
      if (messageExists) {
        scrollAnchor.scrollToMessage(targetMessageId, 'smooth');
        setHighlightedMessageId(targetMessageId);
        
        highlightTimeoutRef.current = setTimeout(() => {
          setHighlightedMessageId(null);
          setTargetMessageId(null);
          highlightTimeoutRef.current = null;
        }, 3000);
      }
    }
  }, [targetMessageId, messagesSuccess, messages.length, localMessages, scrollAnchor]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    localMessages,
    isLoadingOlder,
    hasOlderMessages,
    showJumpToBottom,
    unreadCount,
    targetMessageId,
    highlightedMessageId,
    expandedMessages,
    messages,
    messagesLoading,
    messagesSuccess,
    setTargetMessageId,
    setHighlightedMessageId,
    handleJumpToMessage,
    handleLoadOlder,
    handleJumpToBottom,
    toggleMessageExpansion,
    scrollAnchor
  };
}
