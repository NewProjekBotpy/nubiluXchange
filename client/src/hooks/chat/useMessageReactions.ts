import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { MessageReaction } from "@shared/schema";
import { logger } from "@/lib/logger";

export interface UseMessageReactionsOptions {
  chatId: string | undefined;
  currentUserId: number | null;
}

export interface UseMessageReactionsReturn {
  messageReactions: Record<number, MessageReaction[]>;
  showReactionPicker: Record<number, boolean>;
  hoveredMessageId: number | null;
  availableEmojis: string[];
  setMessageReactions: React.Dispatch<React.SetStateAction<Record<number, MessageReaction[]>>>;
  setShowReactionPicker: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  setHoveredMessageId: (id: number | null) => void;
  handleEmojiClick: (messageId: number, emoji: string) => Promise<void>;
  handleReactionClick: (messageId: number, emoji: string) => Promise<void>;
  toggleReactionPicker: (messageId: number) => void;
  getAggregatedReactions: (messageId: number) => Record<string, { count: number; users: number[] }>;
  addReactionMutation: UseMutationResult<any, any, { messageId: number; emoji: string; }, unknown>;
  removeReactionMutation: UseMutationResult<any, any, number, unknown>;
}

export function useMessageReactions({
  chatId,
  currentUserId
}: UseMessageReactionsOptions): UseMessageReactionsReturn {
  const [messageReactions, setMessageReactions] = useState<Record<number, MessageReaction[]>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<Record<number, boolean>>({});
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const reactionDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  const queryClient = useQueryClient();
  const availableEmojis = ['👍', '❤️', '😂', '🔥', '🎉', '👏', '😮', '😢'];

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: number; emoji: string }) => {
      return apiRequest(`/api/chats/${chatId}/messages/${messageId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/reactions`] });
    },
    onError: (error: any) => {
      logger.error('Failed to add reaction', error, { component: 'useMessageReactions', operation: 'addReaction' });
    }
  });

  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest(`/api/chats/${chatId}/messages/${messageId}/reactions`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/reactions`] });
    },
    onError: (error: any) => {
      logger.error('Failed to remove reaction', error, { component: 'useMessageReactions', operation: 'removeReaction' });
    }
  });

  // Debounced emoji click handler
  const handleEmojiClick = useCallback(async (messageId: number, emoji: string) => {
    if (!currentUserId) return;

    // Debounce to prevent spam
    if (reactionDebounceRef.current) {
      return;
    }
    
    reactionDebounceRef.current = setTimeout(() => {
      reactionDebounceRef.current = null;
    }, 300);

    const reactions = messageReactions[messageId] || [];
    const userReaction = reactions.find(r => r.userId === currentUserId);

    try {
      if (userReaction?.emoji === emoji) {
        await removeReactionMutation.mutateAsync(messageId);
      } else {
        await addReactionMutation.mutateAsync({ messageId, emoji });
      }

      setShowReactionPicker(prev => ({ ...prev, [messageId]: false }));
    } catch (error) {
      logger.error('Reaction error', error, { component: 'useMessageReactions', operation: 'handleEmojiClick', messageId });
    }
  }, [currentUserId, messageReactions, removeReactionMutation, addReactionMutation]);

  // Handle reaction click on existing reaction
  const handleReactionClick = useCallback(async (messageId: number, emoji: string) => {
    if (!currentUserId) return;

    // Debounce to prevent spam
    if (reactionDebounceRef.current) {
      return;
    }
    
    reactionDebounceRef.current = setTimeout(() => {
      reactionDebounceRef.current = null;
    }, 300);

    const reactions = messageReactions[messageId] || [];
    const userReaction = reactions.find(r => r.userId === currentUserId);

    try {
      if (userReaction?.emoji === emoji) {
        await removeReactionMutation.mutateAsync(messageId);
      } else {
        await addReactionMutation.mutateAsync({ messageId, emoji });
      }
    } catch (error) {
      logger.error('Reaction error', error, { component: 'useMessageReactions', operation: 'handleReactionClick', messageId });
    }
  }, [currentUserId, messageReactions, removeReactionMutation, addReactionMutation]);

  // Toggle reaction picker
  const toggleReactionPicker = useCallback((messageId: number) => {
    setShowReactionPicker(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  }, []);

  // Get aggregated reactions for a message
  const getAggregatedReactions = useCallback((messageId: number) => {
    const reactions = messageReactions[messageId] || [];
    const aggregated: Record<string, { count: number; users: number[] }> = {};

    reactions.forEach(reaction => {
      if (!aggregated[reaction.emoji]) {
        aggregated[reaction.emoji] = { count: 0, users: [] };
      }
      aggregated[reaction.emoji].count++;
      aggregated[reaction.emoji].users.push(reaction.userId);
    });

    return aggregated;
  }, [messageReactions]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (reactionDebounceRef.current) {
        clearTimeout(reactionDebounceRef.current);
        reactionDebounceRef.current = null;
      }
    };
  }, []);

  return {
    messageReactions,
    showReactionPicker,
    hoveredMessageId,
    availableEmojis,
    setMessageReactions,
    setShowReactionPicker,
    setHoveredMessageId,
    handleEmojiClick,
    handleReactionClick,
    toggleReactionPicker,
    getAggregatedReactions,
    addReactionMutation,
    removeReactionMutation
  };
}
