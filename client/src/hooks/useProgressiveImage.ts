import { useState, useEffect, useRef } from 'react';
import { logError } from '@/lib/logger';

interface UseProgressiveImageOptions {
  src: string;
  lowQualitySrc?: string;
  placeholder?: string;
  threshold?: number;
}

export function useProgressiveImage({
  src,
  lowQualitySrc,
  placeholder,
  threshold = 0.1
}: UseProgressiveImageOptions) {
  const [currentSrc, setCurrentSrc] = useState(placeholder || lowQualitySrc || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Reset states when src changes
    setLoading(true);
    setError(false);
    setCurrentSrc(placeholder || lowQualitySrc || '');

    const imageElement = imgRef.current;
    if (!imageElement) return;

    // Create intersection observer for lazy loading
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImages();
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    observerRef.current.observe(imageElement);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, lowQualitySrc, placeholder, threshold]);

  const loadImages = async () => {
    try {
      // First load low quality image if available
      if (lowQualitySrc && currentSrc !== lowQualitySrc) {
        await loadImage(lowQualitySrc);
        setCurrentSrc(lowQualitySrc);
      }

      // Then load high quality image
      await loadImage(src);
      setCurrentSrc(src);
      setLoading(false);
    } catch (err) {
      setError(true);
      setLoading(false);
      logError('Failed to load image', err as Error);
    }
  };

  const loadImage = (imageSrc: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = imageSrc;
    });
  };

  return {
    src: currentSrc,
    loading,
    error,
    ref: imgRef
  };
}

export interface ProgressiveImageHookResult {
  src: string;
  loading: boolean;
  error: boolean;
  ref: React.RefObject<HTMLImageElement>;
}