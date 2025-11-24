import { useState, useEffect, useRef } from 'react';

interface UseScrollHideOptions {
  threshold?: number; // Minimum scroll distance to trigger hide/show
  velocityThreshold?: number; // Minimum velocity (pixels/ms) to trigger hide
  enableOnPaths?: string[]; // Only enable on specific paths
  disableOnPaths?: string[]; // Disable on specific paths
}

export function useScrollHide(currentPath: string, options: UseScrollHideOptions = {}) {
  const { 
    threshold = 10, 
    velocityThreshold = 0.5, // pixels per millisecond
    enableOnPaths = ['/chat'], 
    disableOnPaths = [] 
  } = options;

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const scrollDirection = useRef<'up' | 'down' | null>(null);
  const ticking = useRef(false);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prefersReducedMotion = useRef(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Check if scroll hiding should be enabled on current path
  const shouldEnableScrollHide = () => {
    // Disable if user prefers reduced motion
    if (prefersReducedMotion.current) {
      return false;
    }
    
    if (disableOnPaths.some(path => currentPath.startsWith(path))) {
      return false;
    }
    
    // Enable on chat pages (both list and specific chat)
    return enableOnPaths.some(path => currentPath.startsWith(path));
  };

  useEffect(() => {
    // Reset visibility when path changes
    setIsVisible(true);
    lastScrollY.current = 0;
    lastScrollTime.current = Date.now();
    scrollDirection.current = null;

    if (!shouldEnableScrollHide()) {
      return;
    }

    const updateScrollDirection = () => {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const currentTime = Date.now();
      
      // Don't hide at the very top of the page
      if (scrollY < 50) {
        setIsVisible(true);
        lastScrollY.current = scrollY;
        lastScrollTime.current = currentTime;
        ticking.current = false;
        return;
      }

      const scrollDelta = scrollY - lastScrollY.current;
      const timeDelta = currentTime - lastScrollTime.current;
      
      // Calculate velocity (pixels per millisecond)
      const velocity = timeDelta > 0 ? Math.abs(scrollDelta) / timeDelta : 0;
      
      // Determine scroll direction
      const currentDirection = scrollDelta > 0 ? 'down' : scrollDelta < 0 ? 'up' : null;
      
      // Only update if scroll difference exceeds threshold
      if (Math.abs(scrollDelta) > threshold) {
        if (currentDirection === 'down' && velocity >= velocityThreshold) {
          // Hide only when scrolling down with sufficient velocity
          setIsVisible(false);
          scrollDirection.current = 'down';
          
          // Clear any existing timeout
          if (showTimeoutRef.current) {
            clearTimeout(showTimeoutRef.current);
          }
          
          // Show again after a delay if scrolling stops
          showTimeoutRef.current = setTimeout(() => {
            setIsVisible(true);
            showTimeoutRef.current = null;
          }, 2000);
        } else if (currentDirection === 'up') {
          // Show immediately when scrolling up
          setIsVisible(true);
          scrollDirection.current = 'up';
          
          // Clear any existing timeout
          if (showTimeoutRef.current) {
            clearTimeout(showTimeoutRef.current);
            showTimeoutRef.current = null;
          }
        }
      }

      lastScrollY.current = scrollY;
      lastScrollTime.current = currentTime;
      ticking.current = false;
    };

    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      // Clear timeout on cleanup to prevent memory leaks
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }
    };
  }, [currentPath, threshold, velocityThreshold]);

  return {
    isVisible: shouldEnableScrollHide() ? isVisible : true,
    shouldEnableScrollHide: shouldEnableScrollHide()
  };
}