import { useEffect, useRef, useCallback, useState } from 'react';

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

interface GestureOptions {
  threshold?: number;
  swipeThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  enableHapticFeedback?: boolean;
  preventBrowserGestures?: boolean;
}

interface GestureCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  onPinch?: (scale: number) => void;
  onRotate?: (rotation: number) => void;
  onPullDown?: (distance: number) => void;
  onPullUp?: (distance: number) => void;
}

interface TouchState {
  isActive: boolean;
  startPoint: TouchPoint | null;
  currentPoint: TouchPoint | null;
  lastTap: number;
  tapCount: number;
  scale: number;
  rotation: number;
  pullDistance: number;
}

const DEFAULT_OPTIONS: Required<GestureOptions> = {
  threshold: 10,
  swipeThreshold: 50,
  longPressDelay: 600,
  doubleTapDelay: 300,
  enableHapticFeedback: true,
  preventBrowserGestures: false
};

export function useAdvancedMobileGestures(
  options: GestureOptions = {},
  callbacks: GestureCallbacks = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const touchStateRef = useRef<TouchState>({
    isActive: false,
    startPoint: null,
    currentPoint: null,
    lastTap: 0,
    tapCount: 0,
    scale: 1,
    rotation: 0,
    pullDistance: 0
  });

  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const doubleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const [gestureState, setGestureState] = useState({
    isLongPressing: false,
    isPulling: false,
    currentScale: 1,
    currentRotation: 0
  });

  const triggerHapticFeedback = useCallback((pattern: number | number[] = 50) => {
    if (typeof window !== 'undefined' && opts.enableHapticFeedback && navigator?.vibrate) {
      navigator.vibrate(pattern);
    }
  }, [opts.enableHapticFeedback]);

  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getAngle = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    const now = Date.now();

    if (opts.preventBrowserGestures) {
      e.preventDefault();
    }

    touchStateRef.current = {
      ...touchStateRef.current,
      isActive: true,
      startPoint: { x: touch.clientX, y: touch.clientY, time: now },
      currentPoint: { x: touch.clientX, y: touch.clientY, time: now }
    };

    // Handle double tap
    if (now - touchStateRef.current.lastTap < opts.doubleTapDelay) {
      touchStateRef.current.tapCount++;
      if (touchStateRef.current.tapCount === 2) {
        callbacks.onDoubleTap?.();
        triggerHapticFeedback([50, 50]);
        touchStateRef.current.tapCount = 0;
        
        if (doubleTapTimeoutRef.current) {
          clearTimeout(doubleTapTimeoutRef.current);
          doubleTapTimeoutRef.current = null;
        }
      }
    } else {
      touchStateRef.current.tapCount = 1;
      touchStateRef.current.lastTap = now;
      
      // Set timeout for single tap
      doubleTapTimeoutRef.current = setTimeout(() => {
        touchStateRef.current.tapCount = 0;
        doubleTapTimeoutRef.current = null;
      }, opts.doubleTapDelay);
    }

    // Start long press timer
    longPressTimeoutRef.current = setTimeout(() => {
      if (touchStateRef.current.isActive) {
        setGestureState(prev => ({ ...prev, isLongPressing: true }));
        callbacks.onLongPress?.();
        triggerHapticFeedback([100, 50, 100]);
      }
    }, opts.longPressDelay);

  }, [opts, callbacks, triggerHapticFeedback]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStateRef.current.isActive || !touchStateRef.current.startPoint) return;

    const touch = e.touches[0];
    const now = Date.now();

    if (opts.preventBrowserGestures) {
      e.preventDefault();
    }

    touchStateRef.current.currentPoint = { x: touch.clientX, y: touch.clientY, time: now };

    const deltaX = touch.clientX - touchStateRef.current.startPoint.x;
    const deltaY = touch.clientY - touchStateRef.current.startPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Cancel long press if moved too much
    if (distance > opts.threshold && longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
      setGestureState(prev => ({ ...prev, isLongPressing: false }));
    }

    // Handle pull gestures
    if (Math.abs(deltaY) > opts.threshold) {
      const pullDistance = Math.abs(deltaY);
      touchStateRef.current.pullDistance = pullDistance;
      setGestureState(prev => ({ ...prev, isPulling: true }));

      if (deltaY > 0) {
        callbacks.onPullDown?.(pullDistance);
      } else {
        callbacks.onPullUp?.(pullDistance);
      }
    }

    // Handle multi-touch gestures
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      // Pinch gesture
      const currentDistance = getDistance(touch1, touch2);
      if (touchStateRef.current.scale === 1) {
        touchStateRef.current.scale = currentDistance;
      } else {
        const scale = currentDistance / touchStateRef.current.scale;
        setGestureState(prev => ({ ...prev, currentScale: scale }));
        callbacks.onPinch?.(scale);
      }

      // Rotation gesture
      const currentAngle = getAngle(touch1, touch2);
      if (touchStateRef.current.rotation === 0) {
        touchStateRef.current.rotation = currentAngle;
      } else {
        const rotation = currentAngle - touchStateRef.current.rotation;
        setGestureState(prev => ({ ...prev, currentRotation: rotation }));
        callbacks.onRotate?.(rotation);
      }
    }

  }, [opts, callbacks, getDistance, getAngle]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStateRef.current.isActive || !touchStateRef.current.startPoint || !touchStateRef.current.currentPoint) {
      return;
    }

    const deltaX = touchStateRef.current.currentPoint.x - touchStateRef.current.startPoint.x;
    const deltaY = touchStateRef.current.currentPoint.y - touchStateRef.current.startPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Handle swipe gestures
    if (distance > opts.swipeThreshold) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
      
      if (angle >= -45 && angle <= 45) {
        callbacks.onSwipeRight?.();
        triggerHapticFeedback(75);
      } else if (angle >= 135 || angle <= -135) {
        callbacks.onSwipeLeft?.();
        triggerHapticFeedback(75);
      } else if (angle > 45 && angle < 135) {
        callbacks.onSwipeDown?.();
        triggerHapticFeedback(75);
      } else if (angle > -135 && angle < -45) {
        callbacks.onSwipeUp?.();
        triggerHapticFeedback(75);
      }
    }

    // Cleanup
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    touchStateRef.current = {
      isActive: false,
      startPoint: null,
      currentPoint: null,
      lastTap: touchStateRef.current.lastTap,
      tapCount: touchStateRef.current.tapCount,
      scale: 1,
      rotation: 0,
      pullDistance: 0
    };

    setGestureState({
      isLongPressing: false,
      isPulling: false,
      currentScale: 1,
      currentRotation: 0
    });

  }, [opts, callbacks, triggerHapticFeedback]);

  const bindGestures = useCallback((element: HTMLElement | null) => {
    if (elementRef.current) {
      elementRef.current.removeEventListener('touchstart', handleTouchStart);
      elementRef.current.removeEventListener('touchmove', handleTouchMove);
      elementRef.current.removeEventListener('touchend', handleTouchEnd);
    }

    if (element) {
      elementRef.current = element;
      element.addEventListener('touchstart', handleTouchStart, { passive: false });
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      element.addEventListener('touchend', handleTouchEnd);
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
      if (doubleTapTimeoutRef.current) {
        clearTimeout(doubleTapTimeoutRef.current);
      }
      if (elementRef.current) {
        const element = elementRef.current;
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    bindGestures,
    gestureState,
    isSupported: typeof window !== 'undefined' && 'ontouchstart' in window
  };
}

// Quick gesture hook for common patterns
export function useSwipeGestures(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void
) {
  return useAdvancedMobileGestures(
    { swipeThreshold: 50 },
    { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown }
  );
}

// Pull to refresh hook
export function usePullToAction(
  onPullDown?: (distance: number) => void,
  onPullUp?: (distance: number) => void,
  threshold: number = 100
) {
  return useAdvancedMobileGestures(
    { threshold },
    { onPullDown, onPullUp }
  );
}