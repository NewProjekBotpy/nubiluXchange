import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingFallbackProps {
  className?: string;
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingFallback({ 
  className, 
  message = "Loading...", 
  size = "md" 
}: LoadingFallbackProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  return (
    <div className={cn(
      "min-h-screen bg-nxe-dark flex flex-col items-center justify-center",
      className
    )}>
      <Loader2 className={cn("animate-spin text-nxe-primary mb-4", sizeClasses[size])} />
      <div className="text-nxe-text text-sm font-medium">{message}</div>
    </div>
  );
}

// Specialized loading components for different contexts
export function PageLoadingFallback() {
  return (
    <LoadingFallback 
      message="Loading page..."
      size="lg"
    />
  );
}

export function ComponentLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-nxe-primary mr-2" />
      <span className="text-nxe-text text-sm">Loading component...</span>
    </div>
  );
}

export function ModalLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-5 w-5 animate-spin text-nxe-primary mr-2" />
      <span className="text-nxe-text text-xs">Loading...</span>
    </div>
  );
}