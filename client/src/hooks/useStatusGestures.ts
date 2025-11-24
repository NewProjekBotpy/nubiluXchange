import { useState, useRef } from 'react';

interface UseStatusGesturesProps {
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  onClose: () => void;
}

interface UseStatusGesturesReturn {
  // Zoom state
  isZooming: boolean;
  scale: number;
  translateX: number;
  translateY: number;
  
  // Drag state
  dragY: number;
  isDragging: boolean;
  
  // Touch handlers
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent) => void;
  
  // Mouse handlers (for desktop)
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseUp: (e: React.MouseEvent) => void;
  handleMouseLeave: () => void;
  
  // Cleanup function
  reset: () => void;
}

/**
 * Custom hook for handling status viewer gestures:
 * - Pinch to zoom (2 fingers)
 * - Drag to close (swipe down)
 * - Hold to pause (500ms delay)
 * - Mouse hover to pause (desktop)
 */
export function useStatusGestures({
  isPaused,
  setIsPaused,
  onClose,
}: UseStatusGesturesProps): UseStatusGesturesReturn {
  // Pinch zoom states
  const [isZooming, setIsZooming] = useState(false);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  
  // Drag to close states
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Refs for gesture tracking
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartYRef = useRef<number>(0);
  const initialDistanceRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);
  const initialTouchMidpointRef = useRef<{ x: number; y: number } | null>(null);
  
  // Helper function to calculate distance between 2 touch points
  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper function to get midpoint between 2 touch points
  const getMidpoint = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  // Touch handlers for swipe gestures, hold to pause, drag to close, and pinch zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Two fingers - pinch zoom
      const distance = getDistance(e.touches[0], e.touches[1]);
      initialDistanceRef.current = distance;
      initialScaleRef.current = scale;
      const midpoint = getMidpoint(e.touches[0], e.touches[1]);
      initialTouchMidpointRef.current = midpoint;
      
      // Cancel pause timer if exists
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
      
      setIsZooming(true);
      setIsPaused(true); // Pause when zooming
    } else if (e.touches.length === 1) {
      // One finger - could be tap, swipe, or drag to close
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY
      };
      
      dragStartYRef.current = touch.clientY;
      
      // Set timer to pause after 500ms (only for 1 finger)
      if (!isZooming) {
        pauseTimeoutRef.current = setTimeout(() => {
          setIsPaused(true);
        }, 500);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // BLOCK BROWSER PULL-TO-REFRESH - Prevent default for all touch moves when status modal is open
    // This prevents browser refresh that could be triggered when user swipes from top
    e.preventDefault();
    
    if (e.touches.length === 2 && isZooming) {
      // Two fingers - handle pinch zoom
      
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const currentMidpoint = getMidpoint(e.touches[0], e.touches[1]);
      
      // Calculate new scale based on distance change
      const scaleChange = currentDistance / initialDistanceRef.current;
      let newScale = initialScaleRef.current * scaleChange;
      
      // Limit scale between 1x and 4x
      newScale = Math.max(1, Math.min(4, newScale));
      
      setScale(newScale);
      
      // Calculate pan based on midpoint movement (if zoomed in)
      if (newScale > 1 && initialTouchMidpointRef.current) {
        const deltaX = currentMidpoint.x - initialTouchMidpointRef.current.x;
        const deltaY = currentMidpoint.y - initialTouchMidpointRef.current.y;
        
        setTranslateX(deltaX);
        setTranslateY(deltaY);
      }
    } else if (e.touches.length !== 2 && isZooming) {
      // User lifted one finger from pinch - reset zoom
      setIsZooming(false);
      setScale(1);
      setTranslateX(0);
      setTranslateY(0);
      setIsPaused(false); // Resume status
    } else if (e.touches.length === 1 && !isZooming) {
      const touch = e.touches[0];
      
      if (touchStartRef.current) {
        // If there's movement, cancel pause timer because this isn't a "hold"
        const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
        
        // If movement is more than 10px, cancel pause timer
        if (deltaX > 10 || deltaY > 10) {
          if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current);
            pauseTimeoutRef.current = null;
          }
        }
        
        // Check for vertical drag to close (only if not zoomed)
        const verticalDelta = touch.clientY - dragStartYRef.current;
        
        if (verticalDelta > 10 && deltaX < 50 && scale === 1) {
          // Dragging down - activate drag to close
          setIsDragging(true);
          setDragY(verticalDelta);
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      // All fingers lifted
      
      // Reset zoom if was zooming
      if (isZooming) {
        setIsZooming(false);
        // Always reset zoom to normal state
        setScale(1);
        setTranslateX(0);
        setTranslateY(0);
        setIsPaused(false); // Resume when zoom ends
        return;
      }
      
      // Cancel pause timer if still running
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
      
      // Handle drag to close
      if (isDragging && dragY > 150) {
        // Dragged down enough - close the status
        // Cancel pause timer before closing to prevent state leak
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
          pauseTimeoutRef.current = null;
        }
        onClose();
        setDragY(0);
        setIsDragging(false);
        return;
      } else if (isDragging) {
        // Not dragged enough - reset
        setDragY(0);
        setIsDragging(false);
      }
      
      // Always unpause when touch ends, regardless of gesture type
      setIsPaused(false);
      touchStartRef.current = null;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Set timer to pause after 500ms
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(true);
    }, 500);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Cancel pause timer if still running
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    
    setIsPaused(false);
  };
  
  const handleMouseLeave = () => {
    // Cancel pause timer if still running
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    
    // Always unpause when mouse leaves to prevent stuck pause state
    setIsPaused(false);
  };

  // Reset all gesture state and timers (call this when closing modal)
  const reset = () => {
    // Cancel any pending pause timer
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    
    // Reset all gesture state
    setIsZooming(false);
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
    setDragY(0);
    setIsDragging(false);
    
    // Reset refs
    touchStartRef.current = null;
    initialDistanceRef.current = 0;
    initialScaleRef.current = 1;
    initialTouchMidpointRef.current = null;
    dragStartYRef.current = 0;
  };

  return {
    // Zoom state
    isZooming,
    scale,
    translateX,
    translateY,
    
    // Drag state
    dragY,
    isDragging,
    
    // Touch handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    
    // Mouse handlers
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    
    // Cleanup
    reset,
  };
}
