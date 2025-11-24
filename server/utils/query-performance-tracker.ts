import { logInfo, logWarning, logError } from './logger';

/**
 * Query Performance Tracker
 * Wraps database queries to track execution time and log slow queries
 */

interface QueryMetrics {
  queryName: string;
  duration: number;
  timestamp: Date;
  params?: any;
}

class QueryPerformanceTracker {
  private static metrics: QueryMetrics[] = [];
  private static readonly MAX_METRICS = 1000;
  private static readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private static readonly VERY_SLOW_QUERY_THRESHOLD = 5000; // 5 seconds

  /**
   * Track query execution time
   */
  static async track<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    params?: any
  ): Promise<T> {
    const start = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - start;

      // Record metrics
      this.recordMetric({
        queryName,
        duration,
        timestamp: new Date(),
        params
      });

      // Log slow queries
      if (duration > this.VERY_SLOW_QUERY_THRESHOLD) {
        logError(
          new Error('Very slow query detected'),
          `🐌 CRITICAL: Query "${queryName}" took ${duration}ms`
        );
      } else if (duration > this.SLOW_QUERY_THRESHOLD) {
        logWarning(`⚠️  Slow query: "${queryName}" took ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logError(error, `Query "${queryName}" failed after ${duration}ms`);
      throw error;
    }
  }

  /**
   * Record query metric
   */
  private static recordMetric(metric: QueryMetrics): void {
    this.metrics.push(metric);

    // Keep only recent metrics to prevent memory bloat
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }
  }

  /**
   * Get slowest queries
   */
  static getSlowestQueries(limit: number = 10): QueryMetrics[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get average query time by name
   */
  static getAverageQueryTime(queryName: string): number {
    const relevantMetrics = this.metrics.filter(m => m.queryName === queryName);
    
    if (relevantMetrics.length === 0) return 0;

    const totalDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalDuration / relevantMetrics.length;
  }

  /**
   * Get all query statistics
   */
  static getQueryStats(): Record<string, {
    count: number;
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
  }> {
    const stats: Record<string, any> = {};

    this.metrics.forEach(metric => {
      if (!stats[metric.queryName]) {
        stats[metric.queryName] = {
          count: 0,
          totalDuration: 0,
          maxDuration: 0,
          minDuration: Infinity
        };
      }

      const stat = stats[metric.queryName];
      stat.count++;
      stat.totalDuration += metric.duration;
      stat.maxDuration = Math.max(stat.maxDuration, metric.duration);
      stat.minDuration = Math.min(stat.minDuration, metric.duration);
    });

    // Calculate averages
    Object.keys(stats).forEach(queryName => {
      const stat = stats[queryName];
      stat.avgDuration = stat.totalDuration / stat.count;
      delete stat.totalDuration;
    });

    return stats;
  }

  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = [];
    logInfo('Query performance metrics reset');
  }

  /**
   * Get metrics summary
   */
  static getSummary(): any {
    const totalQueries = this.metrics.length;
    const slowQueries = this.metrics.filter(m => m.duration > this.SLOW_QUERY_THRESHOLD).length;
    const verySlowQueries = this.metrics.filter(m => m.duration > this.VERY_SLOW_QUERY_THRESHOLD).length;

    const avgDuration = totalQueries > 0
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries
      : 0;

    return {
      totalQueries,
      slowQueries,
      verySlowQueries,
      averageDuration: Math.round(avgDuration),
      slowQueryPercentage: totalQueries > 0 ? ((slowQueries / totalQueries) * 100).toFixed(2) + '%' : '0%',
      slowestQueries: this.getSlowestQueries(5)
    };
  }
}

/**
 * Convenience wrapper for tracking queries
 */
export async function trackQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  params?: any
): Promise<T> {
  return QueryPerformanceTracker.track(queryName, queryFn, params);
}

/**
 * Get query performance stats
 */
export function getQueryStats() {
  return QueryPerformanceTracker.getQueryStats();
}

/**
 * Get query performance summary
 */
export function getQuerySummary() {
  return QueryPerformanceTracker.getSummary();
}

/**
 * Get slowest queries
 */
export function getSlowestQueries(limit: number = 10) {
  return QueryPerformanceTracker.getSlowestQueries(limit);
}

/**
 * Reset query metrics
 */
export function resetQueryMetrics() {
  QueryPerformanceTracker.resetMetrics();
}

/**
 * Decorator for tracking query performance
 */
export function TrackQuery(queryName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const trackedQueryName = queryName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return trackQuery(
        trackedQueryName,
        () => originalMethod.apply(this, args),
        args
      );
    };

    return descriptor;
  };
}
