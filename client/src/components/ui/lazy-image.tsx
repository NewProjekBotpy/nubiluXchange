import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
  sizes?: string;
  priority?: boolean;
}

export function LazyImage({
  src,
  alt,
  className,
  placeholder,
  blurDataURL,
  onLoad,
  onError,
  loading = 'lazy',
  sizes,
  priority = false
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string | undefined>(priority ? src : placeholder);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isInView, setIsInView] = useState(priority);

  useEffect(() => {
    if (priority) {
      setImageSrc(src);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    const currentRef = imgRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [src, priority]);

  useEffect(() => {
    if (isInView && !priority && imageSrc !== src) {
      setImageSrc(src);
    }
  }, [isInView, src, imageSrc, priority]);

  const handleLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setImageError(true);
    onError?.();
  };

  const getPlaceholderSrc = () => {
    if (imageError) {
      return placeholder || `data:image/svg+xml;base64,${btoa(`
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#1A252F"/>
          <text x="50%" y="50%" font-family="Inter, sans-serif" font-size="16" fill="#6B7280" text-anchor="middle" dy=".3em">
            Gambar tidak tersedia
          </text>
        </svg>
      `)}`;
    }
    
    if (blurDataURL && !imageLoaded) {
      return blurDataURL;
    }
    
    return placeholder || `data:image/svg+xml;base64,${btoa(`
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1A252F"/>
        <rect width="100%" height="100%" fill="url(#shimmer)"/>
        <defs>
          <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#1A252F;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#2D3748;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1A252F;stop-opacity:1" />
            <animateTransform attributeName="gradientTransform" type="translate" values="-100 0;100 0;-100 0" dur="2s" repeatCount="indefinite"/>
          </linearGradient>
        </defs>
      </svg>
    `)}`;
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Placeholder/Blur image */}
      {(!imageLoaded || imageError) && (
        <img
          src={getPlaceholderSrc()}
          alt=""
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            imageLoaded ? "opacity-0" : "opacity-100"
          )}
          aria-hidden="true"
        />
      )}
      
      {/* Main image */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          imageLoaded && !imageError ? "opacity-100" : "opacity-0"
        )}
        loading={loading}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        data-testid="lazy-image"
      />
      
      {/* Loading indicator */}
      {!imageLoaded && !imageError && isInView && (
        <div className="absolute inset-0 flex items-center justify-center bg-nxe-surface/20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nxe-primary"></div>
        </div>
      )}
    </div>
  );
}

// Hook for preloading images
export function useImagePreload(src: string) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.src = src;

    return () => {
      img.onload = null;
    };
  }, [src]);

  return loaded;
}

// Utility for generating responsive image sizes
export function generateSrcSet(baseUrl: string, sizes: number[] = [300, 600, 900, 1200]) {
  return sizes
    .map(size => `${baseUrl}?w=${size} ${size}w`)
    .join(', ');
}

// Utility for generating blur data URL
export function generateBlurDataURL(color = '#1A252F') {
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
    </svg>
  `)}`;
}