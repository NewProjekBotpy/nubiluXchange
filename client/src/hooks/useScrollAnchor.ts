import { useRef, useCallback, useEffect } from 'react';
import { logWarning } from '@/lib/logger';

interface ScrollAnchor {
  messageId: number;
  offsetPx: number;
  scrollTop: number;
}

interface UseScrollAnchorOptions {
  conversationId: string;
  containerRef: React.RefObject<HTMLDivElement>;
  messageRefs: React.MutableRefObject<Record<number, HTMLDivElement>>;
  enabled?: boolean;
}

/**
 * Scroll Queue Manager to prevent race conditions
 */
class ScrollQueue {
  private queue: Array<() => void> = [];
  private isProcessing = false;
  private currentAnimationFrame: number | null = null;

  enqueue(operation: () => void) {
    this.queue.push(operation);
    if (!this.isProcessing) {
      this.processNext();
    }
  }

  private processNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const operation = this.queue.shift();
    
    if (operation) {
      this.currentAnimationFrame = requestAnimationFrame(() => {
        operation();
        // Small delay to ensure DOM updates complete
        setTimeout(() => this.processNext(), 16); // ~1 frame
      });
    }
  }

  clear() {
    this.queue = [];
    if (this.currentAnimationFrame !== null) {
      cancelAnimationFrame(this.currentAnimationFrame);
      this.currentAnimationFrame = null;
    }
    this.isProcessing = false;
  }
}

/**
 * Hook untuk save/restore scroll position seperti WhatsApp
 * WITH SCROLL QUEUE MANAGER to prevent race conditions
 */
export function useScrollAnchor({
  conversationId,
  containerRef,
  messageRefs,
  enabled = true
}: UseScrollAnchorOptions) {
  const lastSavedPosition = useRef<ScrollAnchor | null>(null);
  const scrollQueue = useRef(new ScrollQueue());

  /**
   * Get the topmost visible message in viewport
   */
  const getVisibleAnchor = useCallback((): ScrollAnchor | null => {
    const container = containerRef.current;
    if (!container) return null;

    const containerRect = container.getBoundingClientRect();
    const messages = Object.entries(messageRefs.current);

    // Find first message that's fully or partially visible
    for (const [idStr, messageEl] of messages) {
      if (!messageEl) continue;
      const rect = messageEl.getBoundingClientRect();
      
      // Check if message is in viewport
      if (rect.bottom > containerRect.top && rect.top < containerRect.bottom) {
        const messageId = parseInt(idStr);
        const offsetPx = Math.max(0, rect.top - containerRect.top);
        
        return {
          messageId,
          offsetPx,
          scrollTop: container.scrollTop
        };
      }
    }

    // Fallback: use scroll position
    return {
      messageId: -1,
      offsetPx: 0,
      scrollTop: container.scrollTop
    };
  }, [containerRef, messageRefs]);

  /**
   * Save current scroll position to localStorage
   */
  const savePosition = useCallback(() => {
    if (!enabled) return;
    
    const anchor = getVisibleAnchor();
    if (anchor) {
      lastSavedPosition.current = anchor;
      try {
        localStorage.setItem(
          `chat-scroll-${conversationId}`,
          JSON.stringify(anchor)
        );
      } catch (e) {
        logWarning('[ScrollAnchor] Failed to save position', { error: e });
      }
    }
  }, [enabled, conversationId, getVisibleAnchor]);

  /**
   * Restore scroll position from saved anchor (QUEUED)
   */
  const restorePosition = useCallback(() => {
    if (!enabled) return;

    scrollQueue.current.enqueue(() => {
      const container = containerRef.current;
      if (!container) return;

      try {
        const savedStr = localStorage.getItem(`chat-scroll-${conversationId}`);
        if (!savedStr) return;

        const saved: ScrollAnchor = JSON.parse(savedStr);
        lastSavedPosition.current = saved;

        if (saved.messageId > 0) {
          // Try to find the anchor message
          const anchorEl = messageRefs.current[saved.messageId];
          if (anchorEl) {
            // Restore exact position using anchor
            const targetScrollTop = anchorEl.offsetTop - saved.offsetPx;
            container.scrollTop = targetScrollTop;
            return;
          }
        }
        
        // Fallback: restore scrollTop directly
        container.scrollTop = saved.scrollTop;
      } catch (e) {
        logWarning('[ScrollAnchor] Failed to restore position', { error: e });
      }
    });
  }, [enabled, conversationId, containerRef, messageRefs]);

  /**
   * Clear saved position for this conversation
   */
  const clearPosition = useCallback(() => {
    lastSavedPosition.current = null;
    try {
      localStorage.removeItem(`chat-scroll-${conversationId}`);
    } catch (e) {
      logWarning('[ScrollAnchor] Failed to clear position', { error: e });
    }
  }, [conversationId]);

  /**
   * Adjust scroll position after prepending messages (QUEUED)
   * Maintains viewport by adding height delta to scrollTop
   */
  const adjustForPrepend = useCallback((beforeHeight: number) => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    scrollQueue.current.enqueue(() => {
      const afterHeight = container.scrollHeight;
      const heightDelta = afterHeight - beforeHeight;
      
      if (heightDelta > 0) {
        // Add delta to maintain visual position
        container.scrollTop = container.scrollTop + heightDelta;
      }
    });
  }, [containerRef, enabled]);

  /**
   * Check if user is near bottom (for auto-scroll decision)
   */
  const isNearBottom = useCallback((threshold = 120): boolean => {
    const container = containerRef.current;
    if (!container) return false;

    const distance = container.scrollHeight - (container.scrollTop + container.clientHeight);
    return distance < threshold;
  }, [containerRef]);

  /**
   * Smooth scroll to bottom (QUEUED)
   */
  const scrollToBottom = useCallback((smooth = true) => {
    scrollQueue.current.enqueue(() => {
      const container = containerRef.current;
      if (!container) return;

      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    });
  }, [containerRef]);

  /**
   * Scroll to specific message (QUEUED)
   */
  const scrollToMessage = useCallback((messageId: number, behavior: ScrollBehavior = 'smooth') => {
    scrollQueue.current.enqueue(() => {
      const messageEl = messageRefs.current[messageId];
      if (!messageEl) return;

      messageEl.scrollIntoView({
        behavior,
        block: 'center'
      });
    });
  }, [messageRefs]);

  // Auto-save on unmount and cleanup queue
  useEffect(() => {
    return () => {
      if (enabled) {
        savePosition();
      }
      // Clear scroll queue on unmount to prevent memory leaks
      scrollQueue.current.clear();
    };
  }, [enabled, savePosition]);

  return {
    savePosition,
    restorePosition,
    clearPosition,
    adjustForPrepend,
    isNearBottom,
    scrollToBottom,
    scrollToMessage,
    lastSavedPosition: lastSavedPosition.current
  };
}
