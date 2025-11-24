/**
 * Simple in-memory cache for frequently accessed data
 * Reduces database load and improves response times
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class CacheManager {
  private static cache = new Map<string, CacheEntry<any>>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 1000; // Prevent memory overflow
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Set cache entry with TTL
   */
  static set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    // Clear old entries if cache is getting too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get cache entry if not expired
   */
  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Delete cache entry
   */
  static delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear expired entries
   */
  static cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache entries
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Get or set pattern for common caching scenarios
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Cache keys for common data types
   */
  static keys = {
    userBalance: (userId: number) => `user:${userId}:balance`,
    userProfile: (userId: number) => `user:${userId}:profile`,
    productDetail: (productId: number) => `product:${productId}:detail`,
    chatExists: (buyerId: number, sellerId: number, productId?: number) => 
      `chat:exists:${buyerId}:${sellerId}${productId ? `:${productId}` : ''}`,
    unreadCount: (userId: number) => `user:${userId}:unread_count`,
    dashboardStats: (userId: number) => `user:${userId}:dashboard_stats`
  };

  /**
   * Invalidate user-related cache entries
   */
  static invalidateUserCache(userId: number): void {
    const userKeys = [
      this.keys.userBalance(userId),
      this.keys.userProfile(userId),
      this.keys.unreadCount(userId),
      this.keys.dashboardStats(userId)
    ];

    userKeys.forEach(key => this.delete(key));
  }

  /**
   * Invalidate product-related cache entries
   */
  static invalidateProductCache(productId: number): void {
    this.delete(this.keys.productDetail(productId));
  }

  /**
   * Clear cache entries matching a pattern
   */
  static clearPattern(pattern: string): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * Get cache statistics
   */
  static getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let validCount = 0;

    this.cache.forEach((entry) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++;
      } else {
        validCount++;
      }
    });

    return {
      total: this.cache.size,
      valid: validCount,
      expired: expiredCount,
      hitRatio: validCount / this.cache.size || 0
    };
  }

  /**
   * Start periodic cleanup (called on initialization)
   */
  static startCleanup(): void {
    if (this.cleanupInterval) return; // Already started
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Stop periodic cleanup (for graceful shutdown)
   */
  static stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Setup periodic cache cleanup
CacheManager.startCleanup();