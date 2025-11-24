import { Request, Response, NextFunction } from 'express';
import { logInfo, logError } from '../utils/logger';

/**
 * Performance Metrics Storage
 */
interface PerformanceMetrics {
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
  slowestEndpoints: Array<{
    path: string;
    method: string;
    avgTime: number;
    count: number;
  }>;
  endpointMetrics: Map<string, {
    count: number;
    totalTime: number;
    errors: number;
    slowest: number;
    fastest: number;
  }>;
}

class PerformanceMonitor {
  private static metrics: PerformanceMetrics = {
    totalRequests: 0,
    totalErrors: 0,
    averageResponseTime: 0,
    slowestEndpoints: [],
    endpointMetrics: new Map()
  };

  private static requestTimes: number[] = [];
  private static readonly MAX_REQUEST_TIMES = 1000; // Keep last 1000 request times

  /**
   * Record request performance
   */
  static recordRequest(
    path: string,
    method: string,
    duration: number,
    statusCode: number
  ): void {
    const key = `${method} ${path}`;

    // Update total requests
    this.metrics.totalRequests++;

    // Track request times for average calculation
    this.requestTimes.push(duration);
    if (this.requestTimes.length > this.MAX_REQUEST_TIMES) {
      this.requestTimes.shift();
    }

    // Update average response time
    const sum = this.requestTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = sum / this.requestTimes.length;

    // Update errors
    if (statusCode >= 400) {
      this.metrics.totalErrors++;
    }

    // Update endpoint-specific metrics
    let endpointMetric = this.metrics.endpointMetrics.get(key);
    if (!endpointMetric) {
      endpointMetric = {
        count: 0,
        totalTime: 0,
        errors: 0,
        slowest: 0,
        fastest: Infinity
      };
      this.metrics.endpointMetrics.set(key, endpointMetric);
    }

    endpointMetric.count++;
    endpointMetric.totalTime += duration;
    endpointMetric.slowest = Math.max(endpointMetric.slowest, duration);
    endpointMetric.fastest = Math.min(endpointMetric.fastest, duration);
    
    if (statusCode >= 400) {
      endpointMetric.errors++;
    }

    // Update slowest endpoints (top 10)
    this.updateSlowestEndpoints();
  }

  /**
   * Update slowest endpoints list
   */
  private static updateSlowestEndpoints(): void {
    const endpoints = Array.from(this.metrics.endpointMetrics.entries())
      .map(([key, metric]) => {
        const [method, ...pathParts] = key.split(' ');
        return {
          path: pathParts.join(' '),
          method,
          avgTime: metric.totalTime / metric.count,
          count: metric.count
        };
      })
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    this.metrics.slowestEndpoints = endpoints;
  }

  /**
   * Get all metrics
   */
  static getMetrics(): PerformanceMetrics {
    return {
      ...this.metrics,
      endpointMetrics: new Map(this.metrics.endpointMetrics) // Clone for safety
    };
  }

  /**
   * Get endpoint-specific metrics
   */
  static getEndpointMetrics(path: string, method: string): any {
    const key = `${method} ${path}`;
    const metric = this.metrics.endpointMetrics.get(key);
    
    if (!metric) {
      return null;
    }

    return {
      path,
      method,
      count: metric.count,
      avgTime: metric.totalTime / metric.count,
      errors: metric.errors,
      slowest: metric.slowest,
      fastest: metric.fastest,
      errorRate: (metric.errors / metric.count) * 100
    };
  }

  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      slowestEndpoints: [],
      endpointMetrics: new Map()
    };
    this.requestTimes = [];
    logInfo('Performance metrics reset');
  }

  /**
   * Get summary statistics
   */
  static getSummary(): any {
    const totalEndpoints = this.metrics.endpointMetrics.size;
    const errorRate = (this.metrics.totalErrors / this.metrics.totalRequests) * 100;

    return {
      totalRequests: this.metrics.totalRequests,
      totalErrors: this.metrics.totalErrors,
      errorRate: errorRate.toFixed(2) + '%',
      averageResponseTime: Math.round(this.metrics.averageResponseTime) + 'ms',
      totalEndpoints,
      slowestEndpoints: this.metrics.slowestEndpoints.map(e => ({
        ...e,
        avgTime: Math.round(e.avgTime) + 'ms'
      }))
    };
  }
}

/**
 * Performance monitoring middleware
 */
export function performanceMonitoringMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  // Capture response finish event
  res.on('finish', () => {
    const duration = Date.now() - start;
    const path = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    // Record the request
    PerformanceMonitor.recordRequest(path, method, duration, statusCode);

    // Log slow requests (over 1 second)
    if (duration > 1000) {
      logInfo(`⚠️  Slow request detected: ${method} ${path} - ${duration}ms`);
    }

    // Log errors
    if (statusCode >= 500) {
      logError(
        new Error(`Server error: ${statusCode}`),
        `Error on ${method} ${path}`
      );
    }
  });

  next();
}

/**
 * Query performance tracking middleware
 */
export function queryPerformanceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const queries: Array<{ query: string; duration: number }> = [];
  
  // Store queries in request object for tracking
  (req as any).trackQuery = (query: string, duration: number) => {
    queries.push({ query, duration });
  };

  // Log query performance when response is finished
  res.on('finish', () => {
    if (queries.length > 0) {
      const totalQueryTime = queries.reduce((sum, q) => sum + q.duration, 0);
      
      if (totalQueryTime > 500) {
        logInfo(
          `⚠️  Slow database queries on ${req.method} ${req.path}: ` +
          `${queries.length} queries, ${totalQueryTime}ms total`
        );
      }

      // Log individual slow queries
      queries.forEach(({ query, duration }) => {
        if (duration > 200) {
          logInfo(`⚠️  Slow query (${duration}ms): ${query.substring(0, 100)}...`);
        }
      });
    }
  });

  next();
}

/**
 * Memory monitoring middleware
 */
export function memoryMonitoringMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const memBefore = process.memoryUsage();

  res.on('finish', () => {
    const memAfter = process.memoryUsage();
    const heapDiff = memAfter.heapUsed - memBefore.heapUsed;

    // Log significant memory increases (>10MB)
    if (heapDiff > 10 * 1024 * 1024) {
      logInfo(
        `⚠️  High memory usage on ${req.method} ${req.path}: ` +
        `+${(heapDiff / 1024 / 1024).toFixed(2)}MB`
      );
    }
  });

  next();
}

/**
 * Get performance metrics
 */
export function getPerformanceMetrics(): any {
  return PerformanceMonitor.getMetrics();
}

/**
 * Get performance summary
 */
export function getPerformanceSummary(): any {
  return PerformanceMonitor.getSummary();
}

/**
 * Get endpoint metrics
 */
export function getEndpointMetrics(path: string, method: string): any {
  return PerformanceMonitor.getEndpointMetrics(path, method);
}

/**
 * Reset performance metrics
 */
export function resetPerformanceMetrics(): void {
  PerformanceMonitor.resetMetrics();
}

/**
 * Periodic metrics logging
 */
let performanceLoggingInterval: NodeJS.Timeout | null = null;

export function startPerformanceLogging(intervalMinutes: number = 15): void {
  // Don't start if already running
  if (performanceLoggingInterval) return;
  
  performanceLoggingInterval = setInterval(() => {
    const summary = PerformanceMonitor.getSummary();
    logInfo('📊 Performance Summary:', summary);
  }, intervalMinutes * 60 * 1000);
}

/**
 * Stop periodic metrics logging
 */
export function stopPerformanceLogging(): void {
  if (performanceLoggingInterval) {
    clearInterval(performanceLoggingInterval);
    performanceLoggingInterval = null;
  }
}

/**
 * Get system metrics
 */
export function getSystemMetrics(): any {
  const mem = process.memoryUsage();
  const uptime = process.uptime();

  return {
    memory: {
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      rss: `${(mem.rss / 1024 / 1024).toFixed(2)}MB`,
      external: `${(mem.external / 1024 / 1024).toFixed(2)}MB`
    },
    uptime: {
      seconds: Math.floor(uptime),
      formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
    },
    cpu: process.cpuUsage(),
    nodeVersion: process.version,
    platform: process.platform
  };
}
