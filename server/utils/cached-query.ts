import { RedisService } from '../services/RedisService';
import { trackQuery } from './query-performance-tracker';
import { logInfo, logWarning } from './logger';

/**
 * Cached Query Utility
 * Combines query performance tracking with Redis caching for frequently accessed data
 */

interface CachedQueryOptions {
  /**
   * Cache key for the query result
   */
  cacheKey: string;
  
  /**
   * Time to live in seconds (default: 5 minutes)
   */
  ttl?: number;
  
  /**
   * Query name for performance tracking
   */
  queryName?: string;
  
  /**
   * Whether to skip cache and always fetch fresh data
   */
  skipCache?: boolean;
  
  /**
   * Whether to update cache in background after returning stale data
   */
  staleWhileRevalidate?: boolean;
}

export class CachedQuery {
  /**
   * Execute a query with caching and performance tracking
   */
  static async execute<T>(
    options: CachedQueryOptions,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const {
      cacheKey,
      ttl = 300, // 5 minutes default
      queryName = 'unnamed_query',
      skipCache = false,
      staleWhileRevalidate = false
    } = options;

    // If cache is skipped, just track and execute the query
    if (skipCache || !RedisService.isAvailable()) {
      return trackQuery(queryName, queryFn);
    }

    // Try to get from cache
    const cached = await RedisService.getOrSet<T>(
      cacheKey,
      async () => {
        // Track the query execution
        return trackQuery(queryName, queryFn);
      },
      ttl
    );

    // If stale-while-revalidate is enabled, update cache in background
    if (staleWhileRevalidate && cached) {
      this.revalidateInBackground(cacheKey, queryName, queryFn, ttl);
    }

    return cached;
  }

  /**
   * Revalidate cache in background
   */
  private static async revalidateInBackground<T>(
    cacheKey: string,
    queryName: string,
    queryFn: () => Promise<T>,
    ttl: number
  ): Promise<void> {
    try {
      // Execute query without blocking
      setImmediate(async () => {
        try {
          const freshData = await trackQuery(queryName, queryFn);
          await RedisService.instance.setex(cacheKey, ttl, JSON.stringify(freshData));
          logInfo(`Cache revalidated in background for key: ${cacheKey}`);
        } catch (error) {
          logWarning(`Background revalidation failed for ${cacheKey}`);
        }
      });
    } catch (error) {
      // Silently fail background revalidation
    }
  }

  /**
   * Batch execute multiple queries with caching
   */
  static async executeBatch<T>(
    queries: Array<{
      cacheKey: string;
      queryName: string;
      queryFn: () => Promise<T>;
      ttl?: number;
    }>
  ): Promise<T[]> {
    if (!RedisService.isAvailable()) {
      // Execute all queries without caching if Redis is unavailable
      return Promise.all(
        queries.map(({ queryName, queryFn }) => trackQuery(queryName, queryFn))
      );
    }

    // Try to get all from cache first
    const cacheKeys = queries.map(q => q.cacheKey);
    const cachedResults = await RedisService.batchGet(cacheKeys);

    // Execute queries that are not cached
    const uncachedQueries = queries.filter((_, index) => !cachedResults.has(cacheKeys[index]));
    
    if (uncachedQueries.length > 0) {
      const freshResults = await Promise.all(
        uncachedQueries.map(({ queryName, queryFn, ttl = 300 }) => 
          trackQuery(queryName, queryFn)
        )
      );

      // Cache the fresh results
      const cacheEntries = uncachedQueries.map((query, index) => ({
        key: query.cacheKey,
        value: freshResults[index],
        ttl: query.ttl || 300
      }));

      await RedisService.batchSet(cacheEntries);

      // Update cached results map
      uncachedQueries.forEach((query, index) => {
        cachedResults.set(query.cacheKey, freshResults[index]);
      });
    }

    // Return results in original order
    return cacheKeys.map(key => cachedResults.get(key)!);
  }

  /**
   * Invalidate cache for a specific key
   */
  static async invalidate(cacheKey: string): Promise<void> {
    if (RedisService.isAvailable()) {
      await RedisService.instance.del(cacheKey);
      logInfo(`Cache invalidated for key: ${cacheKey}`);
    }
  }

  /**
   * Invalidate cache for multiple keys matching a pattern
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    if (RedisService.isAvailable()) {
      await RedisService.invalidatePattern(pattern);
    }
  }

  /**
   * Create a cached query function
   */
  static createCachedQueryFn<T, Args extends any[]>(
    queryName: string,
    cacheKeyFn: (...args: Args) => string,
    queryFn: (...args: Args) => Promise<T>,
    options: { ttl?: number; staleWhileRevalidate?: boolean } = {}
  ) {
    return async (...args: Args): Promise<T> => {
      const cacheKey = cacheKeyFn(...args);
      return this.execute(
        {
          cacheKey,
          queryName,
          ttl: options.ttl,
          staleWhileRevalidate: options.staleWhileRevalidate
        },
        () => queryFn(...args)
      );
    };
  }

  /**
   * Cache keys factory for common query patterns
   */
  static cacheKeys = {
    user: (userId: number) => `query:user:${userId}`,
    userProducts: (userId: number, status?: string) => 
      `query:user:${userId}:products:${status || 'all'}`,
    product: (productId: number) => `query:product:${productId}`,
    productsByCategory: (category: string, limit: number, offset: number) =>
      `query:products:category:${category}:${limit}:${offset}`,
    userTransactions: (userId: number, status?: string) =>
      `query:user:${userId}:transactions:${status || 'all'}`,
    chatMessages: (chatId: number, limit: number, beforeId?: number) =>
      `query:chat:${chatId}:messages:${limit}:${beforeId || 'latest'}`,
    dashboardStats: (userId: number) => `query:user:${userId}:dashboard`,
    analytics: (type: string, period: string) => `query:analytics:${type}:${period}`
  };
}

/**
 * Convenience wrapper for executing cached queries
 */
export async function cachedQuery<T>(
  cacheKey: string,
  queryName: string,
  queryFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  return CachedQuery.execute({ cacheKey, queryName, ttl }, queryFn);
}

/**
 * Decorator for caching query methods
 */
export function CachedQueryMethod(options: {
  cacheKeyFn: (...args: any[]) => string;
  ttl?: number;
  queryName?: string;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const queryName = options.queryName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = options.cacheKeyFn(...args);
      return CachedQuery.execute(
        {
          cacheKey,
          queryName,
          ttl: options.ttl
        },
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}
