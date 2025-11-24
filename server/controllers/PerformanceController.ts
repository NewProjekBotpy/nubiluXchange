import { Request, Response } from 'express';
import { RedisService } from '../services/RedisService';
import { BackgroundJobService } from '../services/BackgroundJobService';
import {
  getPerformanceSummary,
  getSystemMetrics,
  resetPerformanceMetrics
} from '../middleware/performance-monitoring';
import {
  getQueryStats,
  getQuerySummary,
  getSlowestQueries,
  resetQueryMetrics
} from '../utils/query-performance-tracker';
import {
  getWebSocketMetrics,
  getWebSocketSummary,
  getChatPerformanceMetrics,
  resetWebSocketMetrics
} from '../utils/websocket-performance-tracker';
import { DataCleanupService } from '../services/DataCleanupService';
import { logInfo } from '../utils/logger';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { handleError, ErrorHandlers } from '../utils/error-handler';

/**
 * Performance Monitoring Controller
 * Provides endpoints for performance metrics and monitoring
 */
export class PerformanceController {
  /**
   * Get performance summary
   */
  static async getPerformanceSummary(req: Request, res: Response) {
    try {
      const summary = getPerformanceSummary();
      const systemMetrics = getSystemMetrics();

      res.json({
        performance: summary,
        system: systemMetrics,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'get performance summary');
    }
  }

  /**
   * Get cache metrics
   */
  static async getCacheMetrics(req: Request, res: Response) {
    try {
      const cacheMetrics = await RedisService.getCacheMetrics();
      const cacheStats = await RedisService.getStats();

      res.json({
        metrics: cacheMetrics,
        stats: cacheStats,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'get cache metrics');
    }
  }

  /**
   * Get job queue statistics
   */
  static async getJobQueueStats(req: Request, res: Response) {
    try {
      const stats = await BackgroundJobService.getQueueStats();

      res.json({
        queues: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'get job queue stats');
    }
  }

  /**
   * Get failed jobs
   */
  static async getFailedJobs(req: Request, res: Response) {
    try {
      const queue = req.query.queue as 'email' | 'notification' | 'analytics' || 'email';
      const limit = parseInt(req.query.limit as string) || 10;

      const failedJobs = await BackgroundJobService.getFailedJobs(queue, limit);

      res.json({
        queue,
        failedJobs,
        count: failedJobs.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'get failed jobs');
    }
  }

  /**
   * Retry failed job
   */
  static async retryFailedJob(req: Request, res: Response) {
    try {
      const { queue, jobId } = req.body;

      if (!queue || !jobId) {
        return ErrorHandlers.badRequest(res, 'Queue and jobId are required');
      }

      await BackgroundJobService.retryFailedJob(queue, jobId);

      res.json({
        message: `Job ${jobId} in ${queue} queue has been retried`,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'retry failed job');
    }
  }

  /**
   * Clear completed jobs
   */
  static async clearCompletedJobs(req: Request, res: Response) {
    try {
      const queue = req.body.queue as 'email' | 'notification' | 'analytics';

      if (!queue) {
        return ErrorHandlers.badRequest(res, 'Queue is required');
      }

      await BackgroundJobService.clearCompletedJobs(queue);

      res.json({
        message: `Completed jobs cleared from ${queue} queue`,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'clear completed jobs');
    }
  }

  /**
   * Reset performance metrics
   */
  static async resetMetrics(req: Request, res: Response) {
    try {
      resetPerformanceMetrics();

      res.json({
        message: 'Performance metrics have been reset',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'reset performance metrics');
    }
  }

  /**
   * Invalidate cache
   */
  static async invalidateCache(req: Request, res: Response) {
    try {
      const { type, id, pattern } = req.body;

      if (type === 'product' && id) {
        await RedisService.invalidateProduct(id);
      } else if (type === 'user' && id) {
        await RedisService.invalidateUserCache(id);
      } else if (type === 'category' && id) {
        await RedisService.invalidateCategory(id);
      } else if (pattern) {
        await RedisService.invalidatePattern(pattern);
      } else {
        return ErrorHandlers.badRequest(res, 'Invalid invalidation request');
      }

      res.json({
        message: 'Cache invalidated successfully',
        type,
        id,
        pattern,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'invalidate cache');
    }
  }

  /**
   * Warm cache with popular data
   */
  static async warmCache(req: Request, res: Response) {
    try {
      logInfo('Starting cache warming...');

      // Example cache warmers - customize based on your needs
      const warmers: Array<{
        key: string;
        fetcher: () => Promise<any>;
        ttl?: number;
      }> = [
        // Add your cache warming logic here
        // {
        //   key: 'popular_products',
        //   fetcher: async () => {
        //     // Fetch popular products
        //     return [];
        //   },
        //   ttl: 600
        // }
      ];

      await RedisService.warmCache(warmers);

      res.json({
        message: 'Cache warming completed',
        count: warmers.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'warm cache');
    }
  }

  /**
   * Health check endpoint
   */
  static async healthCheck(req: Request, res: Response) {
    try {
      const redisAvailable = RedisService.isAvailable();
      const jobQueueStats = await BackgroundJobService.getQueueStats();
      const systemMetrics = getSystemMetrics();

      const health = {
        status: 'healthy',
        redis: redisAvailable ? 'connected' : 'disconnected',
        jobQueues: jobQueueStats.initialized ? 'initialized' : 'not initialized',
        system: systemMetrics,
        timestamp: new Date().toISOString()
      };

      res.json(health);
    } catch (error: any) {
      handleError(res, error, 'perform health check');
    }
  }

  /**
   * Get comprehensive dashboard data with recommendations
   */
  static async getDashboard(req: Request, res: Response) {
    try {
      const [
        performanceSummary,
        queryMetrics,
        cacheMetrics,
        jobQueueStats,
        systemMetrics,
        databaseStats
      ] = await Promise.all([
        Promise.resolve(getPerformanceSummary()),
        Promise.resolve(getQuerySummary()),
        RedisService.getCacheMetrics(),
        BackgroundJobService.getQueueStats(),
        Promise.resolve(getSystemMetrics()),
        PerformanceController.getDatabaseStats()
      ]);

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        performance: {
          api: performanceSummary,
          database: queryMetrics,
          system: systemMetrics
        },
        caching: {
          redis: cacheMetrics,
          hitRate: await PerformanceController.calculateCacheHitRate()
        },
        backgroundJobs: jobQueueStats,
        database: databaseStats,
        recommendations: PerformanceController.generateRecommendations({
          performanceSummary,
          queryMetrics,
          cacheMetrics,
          systemMetrics
        })
      });
    } catch (error: any) {
      handleError(res, error, 'get performance dashboard');
    }
  }

  /**
   * Get query performance metrics
   */
  static async getQueryPerformance(req: Request, res: Response) {
    try {
      const stats = getQueryStats();
      const summary = getQuerySummary();
      const slowest = getSlowestQueries(20);

      res.json({
        summary,
        statistics: stats,
        slowestQueries: slowest,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'get query performance');
    }
  }

  /**
   * Get real-time metrics
   */
  static async getRealTimeMetrics(req: Request, res: Response) {
    try {
      const { pool } = await import('../db');
      const memUsage = process.memoryUsage();

      res.json({
        timestamp: new Date().toISOString(),
        database: {
          activeConnections: pool.totalCount - pool.idleCount,
          idleConnections: pool.idleCount,
          waitingRequests: pool.waitingCount
        },
        memory: {
          heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
          rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`
        },
        uptime: {
          seconds: Math.floor(process.uptime()),
          formatted: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`
        },
        redis: {
          available: RedisService.isAvailable(),
          status: RedisService.isAvailable() ? 'connected' : 'disconnected'
        }
      });
    } catch (error: any) {
      handleError(res, error, 'get real-time metrics');
    }
  }

  /**
   * Get performance trends
   */
  static async getPerformanceTrends(req: Request, res: Response) {
    try {
      const { period = '1h' } = req.query;
      const summary = getPerformanceSummary();

      res.json({
        period,
        current: summary,
        message: 'Historical trend data requires time-series storage',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'get performance trends');
    }
  }

  /**
   * Detailed health check
   */
  static async detailedHealthCheck(req: Request, res: Response) {
    try {
      const checks = {
        database: false,
        redis: RedisService.isAvailable(),
        backgroundJobs: false,
        memory: true
      };

      try {
        await db.execute(sql`SELECT 1`);
        checks.database = true;
      } catch (error) {
        checks.database = false;
      }

      const jobStats = await BackgroundJobService.getQueueStats();
      checks.backgroundJobs = jobStats.initialized;

      const memUsage = process.memoryUsage();
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      checks.memory = memoryUsagePercent < 90;

      const isHealthy = Object.values(checks).every(check => check);

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'degraded',
        checks,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'perform detailed health check');
    }
  }

  /**
   * Private helper: Get database stats
   */
  private static async getDatabaseStats(): Promise<any> {
    try {
      const { pool } = await import('../db');
      
      return {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingConnections: pool.waitingCount,
        maxConnections: parseInt(process.env.DB_POOL_MAX || '20'),
        utilization: `${((pool.totalCount / parseInt(process.env.DB_POOL_MAX || '20')) * 100).toFixed(2)}%`
      };
    } catch (error) {
      return { error: 'Unable to fetch database stats' };
    }
  }

  /**
   * Private helper: Calculate cache hit rate
   */
  private static async calculateCacheHitRate(): Promise<string> {
    try {
      if (!RedisService.isAvailable()) {
        return 'N/A (Redis not available)';
      }

      const stats = await RedisService.getCacheMetrics();
      if (stats.stats && stats.stats.keyspace_hits && stats.stats.keyspace_misses) {
        const hits = parseInt(stats.stats.keyspace_hits);
        const misses = parseInt(stats.stats.keyspace_misses);
        const total = hits + misses;
        
        if (total === 0) return '0%';
        
        const hitRate = (hits / total) * 100;
        return `${hitRate.toFixed(2)}%`;
      }

      return 'N/A';
    } catch (error) {
      return 'N/A';
    }
  }

  /**
   * Get WebSocket performance metrics
   */
  static async getWebSocketMetrics(req: Request, res: Response) {
    try {
      const metrics = getWebSocketMetrics();

      res.json({
        websocket: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'get websocket metrics');
    }
  }

  /**
   * Get chat-specific performance metrics
   */
  static async getChatMetrics(req: Request, res: Response) {
    try {
      const chatMetrics = getChatPerformanceMetrics();
      const wsMetrics = getWebSocketSummary();

      res.json({
        chat: chatMetrics,
        websocket: wsMetrics,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'get chat metrics');
    }
  }

  /**
   * Reset WebSocket metrics
   */
  static async resetWebSocketMetrics(req: Request, res: Response) {
    try {
      resetWebSocketMetrics();

      res.json({
        message: 'WebSocket metrics have been reset',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'reset websocket metrics');
    }
  }

  /**
   * Get data cleanup statistics
   */
  static async getCleanupStats(req: Request, res: Response) {
    try {
      const stats = await DataCleanupService.getCleanupStats();

      res.json({
        cleanup: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'get cleanup stats');
    }
  }

  /**
   * Run manual data cleanup
   */
  static async runCleanup(req: Request, res: Response) {
    try {
      const results = await DataCleanupService.runAllCleanups();

      res.json({
        success: true,
        message: 'Data cleanup completed successfully',
        results,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'run data cleanup');
    }
  }

  /**
   * Private helper: Generate performance recommendations
   */
  private static generateRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.performanceSummary.averageResponseTime > 500) {
      recommendations.push('High average response time detected. Consider implementing more caching or optimizing slow endpoints.');
    }

    if (metrics.queryMetrics.slowQueryPercentage && parseFloat(metrics.queryMetrics.slowQueryPercentage) > 10) {
      recommendations.push('High percentage of slow queries. Review database indexes and optimize query patterns.');
    }

    const memoryUsage = parseFloat(metrics.systemMetrics.memory.heapUsed);
    if (memoryUsage > 500) {
      recommendations.push('High memory usage detected. Consider implementing pagination or reducing in-memory caching.');
    }

    if (!RedisService.isAvailable()) {
      recommendations.push('Redis is not available. Enable Redis for better performance with distributed caching.');
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance is optimal. No immediate recommendations.');
    }

    return recommendations;
  }
}
