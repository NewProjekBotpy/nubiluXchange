import { useState, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { usePageTransition } from '@/contexts/PageTransitionContext';

interface SwipeNavigationProps {
  currentPage: 'konten' | 'cari' | 'all_product';
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
}

const pageRoutes = {
  konten: '/video',
  cari: '/search',
  all_product: '/all-products',
};

const pageOrder = ['konten', 'cari', 'all_product'] as const;

export function useSwipeNavigation({ currentPage, onSwipeStart, onSwipeEnd }: SwipeNavigationProps) {
  const [, setLocation] = useLocation();
  const { setDirection, setIsTransitioning } = usePageTransition();
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const isNavigatingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isNavigatingRef.current) return;
    const firstTouch = e.touches[0];
    setTouchStart({ x: firstTouch.clientX, y: firstTouch.clientY });
    onSwipeStart?.();
  }, [onSwipeStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart || isNavigatingRef.current) return;

    const currentTouch = e.touches[0];
    const deltaX = currentTouch.clientX - touchStart.x;
    const deltaY = currentTouch.clientY - touchStart.y;

    // Only handle horizontal swipes (when horizontal movement is greater than vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault();

      // Calculate smooth progress (0 to 1)
      const maxSwipe = 120;
      const progress = Math.max(0, Math.min(1, Math.abs(deltaX) / maxSwipe));
      setSwipeProgress(progress);

      // Get current page index
      const currentIndex = pageOrder.indexOf(currentPage);

      // Swipe right (deltaX > 0) - go to previous page
      if (deltaX > 80 && currentIndex > 0 && !isNavigatingRef.current) {
        isNavigatingRef.current = true;
        setIsTransitioning(true);
        setDirection('right');
        
        const prevPage = pageOrder[currentIndex - 1];
        const targetRoute = pageRoutes[prevPage];
        
        setTimeout(() => {
          setLocation(targetRoute);
          setTimeout(() => {
            setIsTransitioning(false);
            setDirection('none');
            isNavigatingRef.current = false;
          }, 300);
        }, 50);
      }
      // Swipe left (deltaX < 0) - go to next page
      else if (deltaX < -80 && currentIndex < pageOrder.length - 1 && !isNavigatingRef.current) {
        isNavigatingRef.current = true;
        setIsTransitioning(true);
        setDirection('left');
        
        const nextPage = pageOrder[currentIndex + 1];
        const targetRoute = pageRoutes[nextPage];
        
        setTimeout(() => {
          setLocation(targetRoute);
          setTimeout(() => {
            setIsTransitioning(false);
            setDirection('none');
            isNavigatingRef.current = false;
          }, 300);
        }, 50);
      }
    }
  }, [touchStart, currentPage, setLocation, setDirection, setIsTransitioning]);

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
    setSwipeProgress(0);
    onSwipeEnd?.();
  }, [onSwipeEnd]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    swipeProgress,
  };
}
