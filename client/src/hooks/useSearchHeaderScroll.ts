import { useEffect, RefObject } from 'react';

interface UseSearchHeaderScrollOptions {
  triggerRef?: RefObject<HTMLDivElement>;
  collapseDistance?: number;
  snapThreshold?: number;
  snapDuration?: number;
}

export function useSearchHeaderScroll({
  triggerRef,
  collapseDistance = 60,
  snapThreshold = 0.4,
  snapDuration = 200
}: UseSearchHeaderScrollOptions = {}) {
  useEffect(() => {
    let animationId: number | null = null;
    let lastScrollY = 0;
    let lastTime = 0;
    let scrollEndTimer: NodeJS.Timeout | null = null;
    let triggerBottom = 0;
    
    // Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      // Skip smooth animations if user prefers reduced motion
      document.documentElement.style.setProperty('--scroll-progress', '0');
      return;
    }
    
    // Calculate trigger section bottom position
    const updateTriggerPosition = () => {
      if (triggerRef?.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        triggerBottom = rect.bottom + scrollTop;
      } else {
        // If no trigger ref provided, use immediate start (backward compatibility)
        triggerBottom = 0;
      }
    };
    
    // Update position on mount and resize
    updateTriggerPosition();
    window.addEventListener('resize', updateTriggerPosition);
    
    const handleScroll = () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      
      animationId = requestAnimationFrame((currentTime) => {
        const currentScrollY = window.scrollY;
        const deltaTime = currentTime - lastTime;
        const deltaY = currentScrollY - lastScrollY;
        
        // Animation starts when scroll passes trigger section bottom
        const animationStartPoint = triggerBottom;
        
        let progress = 0;
        
        // Only start animation after passing trigger section
        if (currentScrollY > animationStartPoint) {
          // Calculate progress from animation start point
          const effectiveScroll = currentScrollY - animationStartPoint;
          progress = Math.min(Math.max(effectiveScroll / collapseDistance, 0), 1);
          
          // Apply smoothstep easing for consistent ultra-smooth animation
          progress = progress * progress * (3.0 - 2.0 * progress);
        }
        
        // Set CSS variable with high precision for smooth animation
        document.documentElement.style.setProperty('--scroll-progress', progress.toFixed(3));
        
        // Enhanced velocity detection for smooth fast scrolling
        if (deltaTime > 0 && currentScrollY > animationStartPoint) {
          const velocity = deltaY / deltaTime; // pixels per ms
          
          // Fast upward scroll - smooth snap to collapsed state
          if (velocity > 0.8) {
            const targetProgress = Math.min(progress + (velocity * 0.02), 1);
            document.documentElement.style.setProperty('--scroll-progress', targetProgress.toFixed(3));
          }
          // Fast downward scroll - smooth snap to expanded state  
          else if (velocity < -0.8 && currentScrollY <= animationStartPoint + 20) {
            const targetProgress = Math.max(progress + (velocity * 0.02), 0);
            document.documentElement.style.setProperty('--scroll-progress', targetProgress.toFixed(3));
          }
        }
        
        // Clear existing scroll end timer
        if (scrollEndTimer) {
          clearTimeout(scrollEndTimer);
        }
        
        // Smooth snap to nearest end state when scroll stops
        scrollEndTimer = setTimeout(() => {
          const currentProgress = parseFloat(document.documentElement.style.getPropertyValue('--scroll-progress') || '0');
          
          // If we're below animation start point, always snap to 0
          if (currentScrollY <= animationStartPoint) {
            document.documentElement.style.setProperty('--scroll-progress', '0');
          } else {
            // Smooth snap to nearest end with easing
            const snappedProgress = currentProgress >= snapThreshold ? 1 : 0;
            
            // Animate the snap for extra smoothness
            const startProgress = currentProgress;
            const targetProgress = snappedProgress;
            const snapStartTime = performance.now();
            
            const animateSnap = (time: number) => {
              const elapsed = time - snapStartTime;
              const snapProgress = Math.min(elapsed / snapDuration, 1);
              
              // Smooth easing for snap animation
              const easedProgress = snapProgress * snapProgress * (3.0 - 2.0 * snapProgress);
              const interpolatedProgress = startProgress + (targetProgress - startProgress) * easedProgress;
              
              document.documentElement.style.setProperty('--scroll-progress', interpolatedProgress.toFixed(3));
              
              if (snapProgress < 1) {
                requestAnimationFrame(animateSnap);
              }
            };
            
            requestAnimationFrame(animateSnap);
          }
        }, 150);
        
        lastScrollY = currentScrollY;
        lastTime = currentTime;
        animationId = null;
      });
    };

    // Initialize CSS variable
    document.documentElement.style.setProperty('--scroll-progress', '0');
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateTriggerPosition);
      document.documentElement.style.removeProperty('--scroll-progress');
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (scrollEndTimer) {
        clearTimeout(scrollEndTimer);
      }
    };
  }, [triggerRef, collapseDistance, snapThreshold, snapDuration]);
}