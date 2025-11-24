import { useState, useRef, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { RefreshCw, ArrowDown } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
  maxPullDistance?: number;
  disabled?: boolean;
  className?: string;
}

export default function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  maxPullDistance = 120,
  disabled = false,
  className
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [releaseToRefresh, setReleaseToRefresh] = useState(false);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop || window.scrollY;
    if (scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || disabled || isRefreshing) return;

    const scrollTop = containerRef.current?.scrollTop || window.scrollY;
    if (scrollTop > 0) {
      isDragging.current = false;
      setPullDistance(0);
      setReleaseToRefresh(false);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      e.preventDefault();
      
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, maxPullDistance);
      
      setPullDistance(distance);
      setReleaseToRefresh(distance >= threshold);
    }
  }, [disabled, isRefreshing, threshold, maxPullDistance]);

  const cleanupGesture = useCallback(() => {
    isDragging.current = false;
    setPullDistance(0);
    setReleaseToRefresh(false);
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;

    isDragging.current = false;

    if (releaseToRefresh && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      try {
        await onRefresh();
      } catch (error) {
        // Error handled silently - refresh gesture completed
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setReleaseToRefresh(false);
      }
    } else {
      cleanupGesture();
    }
  }, [releaseToRefresh, isRefreshing, onRefresh, threshold, cleanupGesture]);

  const handleTouchCancel = useCallback(() => {
    cleanupGesture();
  }, [cleanupGesture]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled || isRefreshing) return;
    if (e.pointerType !== "mouse") return;

    const scrollTop = containerRef.current?.scrollTop || window.scrollY;
    if (scrollTop > 0) return;

    startY.current = e.clientY;
    isDragging.current = true;
  }, [disabled, isRefreshing]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || disabled || isRefreshing) return;
    if (e.pointerType !== "mouse") return;

    const scrollTop = containerRef.current?.scrollTop || window.scrollY;
    if (scrollTop > 0) {
      isDragging.current = false;
      setPullDistance(0);
      setReleaseToRefresh(false);
      return;
    }

    const currentY = e.clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      e.preventDefault();
      
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, maxPullDistance);
      
      setPullDistance(distance);
      setReleaseToRefresh(distance >= threshold);
    }
  }, [disabled, isRefreshing, threshold, maxPullDistance]);

  const handlePointerUp = useCallback(async () => {
    if (!isDragging.current) return;

    isDragging.current = false;

    if (releaseToRefresh && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      try {
        await onRefresh();
      } catch (error) {
        // Error handled silently - refresh gesture completed
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setReleaseToRefresh(false);
      }
    } else {
      cleanupGesture();
    }
  }, [releaseToRefresh, isRefreshing, onRefresh, threshold, cleanupGesture]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const indicatorOpacity = Math.min(pullProgress * 1.5, 1);
  const iconRotation = pullProgress * 180;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Pull Indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-50"
        style={{
          height: `${Math.max(pullDistance, 0)}px`,
          opacity: indicatorOpacity,
          transition: isDragging.current ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div 
          className={cn(
            "flex flex-col items-center justify-center space-y-1 px-4 py-2 rounded-full",
            "bg-nxe-surface/90 backdrop-blur-sm border border-nxe-border shadow-lg",
            releaseToRefresh && !isRefreshing && "bg-nxe-primary/20 border-nxe-primary"
          )}
        >
          {isRefreshing ? (
            <RefreshCw className="h-5 w-5 text-nxe-primary animate-spin" />
          ) : (
            <ArrowDown 
              className={cn(
                "h-5 w-5 transition-colors",
                releaseToRefresh ? "text-nxe-primary" : "text-gray-400"
              )}
              style={{
                transform: `rotate(${iconRotation}deg)`,
                transition: isDragging.current ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          )}
          <span className={cn(
            "text-xs font-medium transition-colors",
            releaseToRefresh ? "text-nxe-primary" : "text-gray-400"
          )}>
            {isRefreshing ? "Refreshing..." : releaseToRefresh ? "Release to refresh" : "Pull to refresh"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {children}
      </div>
    </div>
  );
}
