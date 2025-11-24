import { RefreshCcw, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  variant?: "spinner" | "pulse" | "dots" | "minimal";
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function Loading({ 
  variant = "spinner", 
  size = "md", 
  text,
  className 
}: LoadingProps) {
  
  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  // Clean spinner
  if (variant === "spinner") {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2", className)} data-testid="loading-spinner">
        <RefreshCcw className={cn(
          "animate-spin text-nxe-primary",
          sizeClasses[size]
        )} />
        {text && (
          <p className={cn("text-gray-400 font-medium", textSizeClasses[size])}>{text}</p>
        )}
      </div>
    );
  }

  // Simple pulse
  if (variant === "pulse") {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2", className)} data-testid="loading-pulse">
        <Shield className={cn(
          "text-nxe-primary animate-pulse",
          sizeClasses[size]
        )} />
        {text && (
          <p className={cn("text-gray-400 font-medium", textSizeClasses[size])}>{text}</p>
        )}
      </div>
    );
  }

  // Minimal dots
  if (variant === "dots") {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2", className)} data-testid="loading-dots">
        <div className="flex space-x-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "rounded-full bg-nxe-primary animate-bounce",
                size === "sm" ? "h-1 w-1" : size === "md" ? "h-1.5 w-1.5" : "h-2 w-2"
              )}
              style={{ 
                animationDelay: `${i * 0.15}s`,
                animationDuration: "1s"
              }}
            />
          ))}
        </div>
        {text && (
          <p className={cn("text-gray-400 font-medium", textSizeClasses[size])}>{text}</p>
        )}
      </div>
    );
  }

  // Ultra minimal
  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center justify-center gap-2", className)} data-testid="loading-minimal">
        <div className={cn(
          "rounded-full border border-nxe-primary/20 border-t-nxe-primary animate-spin",
          sizeClasses[size]
        )} />
        {text && (
          <p className={cn("text-gray-400 font-medium", textSizeClasses[size])}>{text}</p>
        )}
      </div>
    );
  }

  // Default fallback
  return (
    <div className={cn("flex items-center justify-center", className)} data-testid="loading-default">
      <div className={cn(
        "rounded-full border border-nxe-primary/20 border-t-nxe-primary animate-spin",
        sizeClasses[size]
      )} />
    </div>
  );
}

// Loading overlay
interface LoadingOverlayProps {
  show: boolean;
  variant?: "spinner" | "pulse" | "dots" | "minimal";
  text?: string;
  blur?: boolean;
}

export function LoadingOverlay({ 
  show, 
  variant = "spinner", 
  text = "Memuat...", 
  blur = true 
}: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-nxe-dark/95",
        blur && "backdrop-blur-sm"
      )}
      data-testid="loading-overlay"
    >
      <div className="text-center bg-nxe-surface/80 rounded-lg p-6 border border-nxe-border/50">
        <Loading variant={variant} size="lg" text={text} />
      </div>
    </div>
  );
}

// Simple skeleton
interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export function LoadingSkeleton({ className, lines = 3 }: LoadingSkeletonProps) {
  return (
    <div className={cn("animate-pulse space-y-2", className)} data-testid="loading-skeleton">
      <div className="h-4 bg-nxe-surface/60 rounded w-3/4" />
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className="h-3 bg-nxe-surface/40 rounded"
          style={{ width: `${85 - i * 10}%` }}
        />
      ))}
    </div>
  );
}