import { useEffect } from 'react';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';

interface ProgressiveImageProps {
  src: string;
  lowQualitySrc?: string;
  placeholder?: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  [key: string]: any;
}

export function ProgressiveImage({
  src,
  lowQualitySrc,
  placeholder,
  alt,
  className = '',
  onLoad,
  onError,
  ...props
}: ProgressiveImageProps) {
  const { src: currentSrc, loading, error, ref } = useProgressiveImage({
    src,
    lowQualitySrc,
    placeholder
  });

  useEffect(() => {
    if (!loading && !error && onLoad) {
      onLoad();
    }
    if (error && onError) {
      onError();
    }
  }, [loading, error, onLoad, onError]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        ref={ref}
        src={currentSrc}
        alt={alt}
        className={`
          w-full h-full object-cover transition-all duration-500
          ${loading ? 'blur-sm scale-105' : 'blur-0 scale-100'}
          ${error ? 'opacity-50' : 'opacity-100'}
        `}
        {...props}
      />
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-gray-800/20 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 bg-gray-800/50 flex items-center justify-center">
          <div className="text-white text-sm">Failed to load</div>
        </div>
      )}
    </div>
  );
}