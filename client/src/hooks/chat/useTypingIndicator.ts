import { useState, useRef, useCallback, useEffect } from "react";

export interface UseTypingIndicatorOptions {
  chatId: string | undefined;
  currentUserId: number | null;
  isConnected: boolean;
  sendWsMessage: (message: any) => void;
}

export interface UseTypingIndicatorReturn {
  isTyping: boolean;
  typingUsers: Record<number, boolean>;
  handleTyping: () => void;
  setTypingUsers: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}

export function useTypingIndicator({
  chatId,
  currentUserId,
  isConnected,
  sendWsMessage
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<number, boolean>>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle typing with debounce
  const handleTyping = useCallback(() => {
    // Set typing state to true
    if (!isTyping) {
      setIsTyping(true);
      
      // Send typing event via WebSocket
      if (isConnected && chatId && currentUserId) {
        sendWsMessage({
          type: 'user_typing',
          chatId: parseInt(chatId),
          userId: currentUserId,
          isTyping: true
        });
      }
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 500ms of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      
      // Send stop typing event via WebSocket
      if (isConnected && chatId && currentUserId) {
        sendWsMessage({
          type: 'user_typing',
          chatId: parseInt(chatId),
          userId: currentUserId,
          isTyping: false
        });
      }
    }, 500);
  }, [isTyping, chatId, isConnected, currentUserId, sendWsMessage]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    isTyping,
    typingUsers,
    handleTyping,
    setTypingUsers
  };
}
