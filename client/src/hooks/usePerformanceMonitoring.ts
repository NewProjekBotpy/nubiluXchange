import { useEffect, useRef, useState } from 'react';
import { logDebug, logWarning } from '@/lib/logger';

interface PerformanceMetrics {
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
  loadTime: number | null;
  networkType: string | null;
  deviceMemory: number | null;
}

interface PerformanceThresholds {
  fcp: { good: number; needs_improvement: number };
  lcp: { good: number; needs_improvement: number };
  fid: { good: number; needs_improvement: number };
  cls: { good: number; needs_improvement: number };
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  fcp: { good: 1800, needs_improvement: 3000 },
  lcp: { good: 2500, needs_improvement: 4000 },
  fid: { good: 100, needs_improvement: 300 },
  cls: { good: 0.1, needs_improvement: 0.25 }
};

export function usePerformanceMonitoring(enabled: boolean = true) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    loadTime: null,
    networkType: null,
    deviceMemory: null
  });

  const observerRef = useRef<PerformanceObserver | null>(null);
  const startTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof performance === 'undefined') return;

    const collectMetrics = () => {
      // Basic timing metrics
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        setMetrics(prev => ({
          ...prev,
          ttfb: navigation.responseStart - navigation.requestStart,
          loadTime: navigation.loadEventEnd - navigation.fetchStart
        }));
      }

      // Device and network info
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      setMetrics(prev => ({
        ...prev,
        networkType: connection?.effectiveType || null,
        deviceMemory: (navigator as any).deviceMemory || null
      }));
    };

    // Collect Core Web Vitals
    const handlePerformanceEntry = (list: PerformanceObserverEntryList) => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
            }
            break;
          
          case 'largest-contentful-paint':
            setMetrics(prev => ({ ...prev, lcp: entry.startTime }));
            break;
          
          case 'first-input':
            setMetrics(prev => ({ 
              ...prev, 
              fid: (entry as any).processingStart - entry.startTime 
            }));
            break;
          
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              setMetrics(prev => ({ 
                ...prev, 
                cls: (prev.cls || 0) + (entry as any).value 
              }));
            }
            break;
        }
      }
    };

    // Set up performance observer
    try {
      observerRef.current = new PerformanceObserver(handlePerformanceEntry);
      
      // Observe different entry types
      const entryTypes = ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'];
      entryTypes.forEach(type => {
        try {
          observerRef.current!.observe({ type, buffered: true });
        } catch (e) {
          // Some browsers might not support certain entry types
          logWarning(`Performance observation for ${type} not supported`);
        }
      });
    } catch (e) {
      logWarning('PerformanceObserver not supported');
    }

    // Collect initial metrics
    collectMetrics();

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled]);

  const getScore = (metric: keyof PerformanceMetrics, value: number | null): 'good' | 'needs_improvement' | 'poor' | null => {
    if (value === null) return null;
    
    const threshold = DEFAULT_THRESHOLDS[metric as keyof PerformanceThresholds];
    if (!threshold) return null;
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.needs_improvement) return 'needs_improvement';
    return 'poor';
  };

  const getOverallScore = (): 'good' | 'needs_improvement' | 'poor' => {
    const scores = [
      getScore('fcp', metrics.fcp),
      getScore('lcp', metrics.lcp),
      getScore('fid', metrics.fid),
      getScore('cls', metrics.cls)
    ].filter(Boolean);

    if (scores.length === 0) return 'good';

    const poorCount = scores.filter(s => s === 'poor').length;
    const needsImprovementCount = scores.filter(s => s === 'needs_improvement').length;

    if (poorCount > 0) return 'poor';
    if (needsImprovementCount > 0) return 'needs_improvement';
    return 'good';
  };

  const logMetrics = () => {
    logDebug('Performance Metrics', {
      FCP: metrics.fcp ? `${metrics.fcp.toFixed(2)}ms` : 'N/A',
      LCP: metrics.lcp ? `${metrics.lcp.toFixed(2)}ms` : 'N/A',
      FID: metrics.fid ? `${metrics.fid.toFixed(2)}ms` : 'N/A',
      CLS: metrics.cls ? metrics.cls.toFixed(3) : 'N/A',
      TTFB: metrics.ttfb ? `${metrics.ttfb.toFixed(2)}ms` : 'N/A',
      'Load Time': metrics.loadTime ? `${metrics.loadTime.toFixed(2)}ms` : 'N/A',
      Network: metrics.networkType || 'N/A',
      'Device Memory': metrics.deviceMemory ? `${metrics.deviceMemory}GB` : 'N/A',
      'Overall Score': getOverallScore()
    });
  };

  return {
    metrics,
    getScore,
    getOverallScore,
    logMetrics,
    isLoading: Object.values(metrics).every(value => value === null)
  };
}

export interface UsePerformanceMonitoringResult {
  metrics: PerformanceMetrics;
  getScore: (metric: keyof PerformanceMetrics, value: number | null) => 'good' | 'needs_improvement' | 'poor' | null;
  getOverallScore: () => 'good' | 'needs_improvement' | 'poor';
  logMetrics: () => void;
  isLoading: boolean;
}