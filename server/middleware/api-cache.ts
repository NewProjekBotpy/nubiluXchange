import { Request, Response, NextFunction } from 'express';
import { CacheManager } from '../utils/cache-manager';
import { logError, logInfo } from '../utils/logger';

/**
 * API Response Caching Middleware
 * 
 * Caches GET requests based on URL and query parameters
 * Automatically invalidates cache on mutations (POST, PUT, PATCH, DELETE)
 */

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  keyPrefix?: string; // Prefix for cache key
  varyBy?: string[]; // Additional parameters to vary cache by (e.g., userId)
}

/**
 * Cache middleware for GET requests
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  const { ttl = 5 * 60 * 1000, keyPrefix = 'api', varyBy = [] } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Build cache key from URL, query params, and vary-by parameters
    const keyParts = [
      keyPrefix,
      req.path,
      JSON.stringify(req.query),
      ...varyBy.map(param => {
        if (param === 'userId') return req.userId?.toString() || 'anonymous';
        if (param === 'role') return req.user?.role || 'guest';
        return '';
      })
    ];
    const cacheKey = keyParts.filter(Boolean).join(':');

    // Try to get cached response
    const cached = CacheManager.get<any>(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Key', cacheKey);
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function(body: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        CacheManager.set(cacheKey, body, ttl);
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Cache invalidation middleware for mutations
 * Automatically clears related cache entries on POST, PUT, PATCH, DELETE
 */
export function cacheInvalidation(patterns: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only invalidate on mutations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to invalidate cache after successful mutation
    res.json = function(body: any) {
      // Only invalidate on successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach(pattern => {
          CacheManager.clearPattern(pattern);
        });
        res.setHeader('X-Cache-Invalidated', patterns.join(', '));
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Cache warmup utility - preload commonly accessed data
 */
export async function warmupCache(fetchers: Array<{ key: string; fetcher: () => Promise<any>; ttl?: number }>) {
  const results = await Promise.allSettled(
    fetchers.map(async ({ key, fetcher, ttl }) => {
      try {
        const data = await fetcher();
        CacheManager.set(key, data, ttl);
        return { key, success: true };
      } catch (error) {
        logError(error, `warmupCache:${key}`);
        return { key, success: false, error };
      }
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  logInfo(`Cache warmup complete: ${successful} successful, ${failed} failed`, { context: 'warmupCache' });
  return results;
}

/**
 * Conditional cache middleware - cache based on custom condition
 */
export function conditionalCache(
  condition: (req: Request) => boolean,
  options: CacheOptions = {}
) {
  const middleware = cacheMiddleware(options);

  return (req: Request, res: Response, next: NextFunction) => {
    if (condition(req)) {
      return middleware(req, res, next);
    }
    next();
  };
}
