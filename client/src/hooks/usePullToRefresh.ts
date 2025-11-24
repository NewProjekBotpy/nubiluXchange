import { useRef, useState, useCallback, useEffect } from "react";
import { logError } from '@/lib/logger';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
  triggerDistance?: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 100,
  disabled = false,
  triggerDistance = 60
}: PullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartRef = useRef<{ y: number; time: number } | null>(null);
  const scrollElementRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const scrollElement = scrollElementRef.current || document.documentElement;
    const isAtTop = scrollElement.scrollTop <= 5;
    
    if (!isAtTop) return;
    
    touchStartRef.current = {
      y: e.touches[0].clientY,
      time: Date.now()
    };
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || !touchStartRef.current) return;
    
    const currentY = e.touches[0].clientY;
    const startY = touchStartRef.current.y;
    const deltaY = currentY - startY;
    
    if (deltaY > 0) {
      setIsPulling(true);
      const distance = Math.min(deltaY * 0.6, threshold * 1.5);
      setPullDistance(distance);
      
      // Prevent default scrolling when pulling down
      e.preventDefault();
    }
  }, [disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || !isPulling) return;
    
    touchStartRef.current = null;
    setIsPulling(false);
    
    if (pullDistance >= triggerDistance) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        logError('Pull to refresh error', error as Error);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, isPulling, pullDistance, triggerDistance, onRefresh]);

  useEffect(() => {
    if (disabled) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled]);

  const pullToRefreshStyle = {
    transform: `translateY(${isPulling || isRefreshing ? pullDistance : 0}px)`,
    transition: isPulling ? 'none' : 'transform 0.3s ease-out'
  };

  const indicatorStyle = {
    opacity: isPulling || isRefreshing ? 1 : 0,
    transform: `translateY(${Math.max(pullDistance - 20, 0)}px) rotate(${pullDistance * 2}deg)`,
    transition: isPulling ? 'none' : 'all 0.3s ease-out'
  };

  return {
    pullToRefreshStyle,
    indicatorStyle,
    isRefreshing,
    isPulling,
    pullDistance,
    isTriggered: pullDistance >= triggerDistance,
    setScrollElement: (element: HTMLElement | null) => {
      scrollElementRef.current = element;
    }
  };
}