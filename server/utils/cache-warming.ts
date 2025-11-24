import { RedisService } from '../services/RedisService';
import { OptimizedQueries } from './optimized-queries';
import { db } from '../db';
import { products, transactions } from '@shared/schema';
import { desc, eq, sql, and, gte } from 'drizzle-orm';
import { logInfo, logError } from './logger';

/**
 * Cache Warming Utility
 * Preloads frequently accessed data into Redis cache on startup or periodically
 */
export class CacheWarming {
  private static warmingInterval: NodeJS.Timeout | null = null;
  private static initialWarmingTimeout: NodeJS.Timeout | null = null;

  /**
   * Warm all caches
   */
  static async warmAllCaches(): Promise<void> {
    if (!RedisService.isAvailable()) {
      logInfo('Redis not available - skipping cache warming');
      return;
    }

    logInfo('🔥 Starting cache warming process...');
    const startTime = Date.now();

    try {
      await Promise.allSettled([
        this.warmPopularProducts(),
        this.warmCategories(),
        this.warmAnalyticsSummaries(),
        this.warmLeaderboards()
      ]);

      const duration = Date.now() - startTime;
      logInfo(`✅ Cache warming completed in ${duration}ms`);
    } catch (error) {
      logError(error, 'Cache warming failed');
    }
  }

  /**
   * Warm popular products cache
   */
  static async warmPopularProducts(): Promise<void> {
    try {
      logInfo('Warming popular products cache...');

      // Get top 50 premium products
      const popularProducts = await db
        .select()
        .from(products)
        .where(and(
          eq(products.status, 'active'),
          eq(products.isPremium, true)
        ))
        .orderBy(desc(products.rating), desc(products.reviewCount))
        .limit(50);

      await RedisService.cachePopularProducts(popularProducts, 1800); // 30 minutes

      // Cache individual popular products
      const cachePromises = popularProducts.slice(0, 20).map(product =>
        RedisService.cacheProduct(product.id, product, 1800)
      );

      await Promise.all(cachePromises);

      logInfo(`Cached ${popularProducts.length} popular products`);
    } catch (error) {
      logError(error, 'Failed to warm popular products cache');
    }
  }

  /**
   * Warm category caches
   */
  static async warmCategories(): Promise<void> {
    try {
      logInfo('Warming category caches...');

      const categories = [
        'mobile_legends',
        'pubg_mobile',
        'free_fire',
        'valorant',
        'genshin_impact',
        'honkai_star_rail'
      ];

      const cachePromises = categories.map(async (category) => {
        const categoryProducts = await OptimizedQueries.getActiveProductsByCategory(
          category,
          20,
          0
        );

        if (categoryProducts.length > 0) {
          await RedisService.cacheProductsByCategory(category, categoryProducts, 600);
        }
      });

      await Promise.all(cachePromises);

      logInfo(`Cached ${categories.length} product categories`);
    } catch (error) {
      logError(error, 'Failed to warm category caches');
    }
  }

  /**
   * Warm analytics summaries
   */
  static async warmAnalyticsSummaries(): Promise<void> {
    try {
      logInfo('Warming analytics caches...');

      // Get today's transaction summary
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayTransactions = await db
        .select({
          count: sql<number>`count(*)`,
          total: sql<number>`sum(${transactions.amount})`,
          commission: sql<number>`sum(${transactions.commission})`
        })
        .from(transactions)
        .where(
          gte(transactions.createdAt, today)
        );

      const summary = {
        count: Number(todayTransactions[0]?.count || 0),
        total: Number(todayTransactions[0]?.total || 0),
        commission: Number(todayTransactions[0]?.commission || 0),
        date: today.toISOString()
      };

      await RedisService.cacheTransactionSummary('today', summary, 300); // 5 minutes

      // Cache weekly summary
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weeklyTransactions = await db
        .select({
          count: sql<number>`count(*)`,
          total: sql<number>`sum(${transactions.amount})`,
          commission: sql<number>`sum(${transactions.commission})`
        })
        .from(transactions)
        .where(
          gte(transactions.createdAt, weekAgo)
        );

      const weeklySummary = {
        count: Number(weeklyTransactions[0]?.count || 0),
        total: Number(weeklyTransactions[0]?.total || 0),
        commission: Number(weeklyTransactions[0]?.commission || 0),
        period: 'week',
        startDate: weekAgo.toISOString(),
        endDate: today.toISOString()
      };

      await RedisService.cacheTransactionSummary('week', weeklySummary, 1800); // 30 minutes

      logInfo('Cached analytics summaries (today, week)');
    } catch (error) {
      logError(error, 'Failed to warm analytics caches');
    }
  }

  /**
   * Warm leaderboards
   */
  static async warmLeaderboards(): Promise<void> {
    try {
      logInfo('Warming leaderboard caches...');

      // Top sellers by transaction count (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const topSellers = await db
        .select({
          sellerId: transactions.sellerId,
          count: sql<number>`count(*)`,
          revenue: sql<number>`sum(${transactions.amount})`
        })
        .from(transactions)
        .where(and(
          eq(transactions.status, 'completed'),
          gte(transactions.createdAt, thirtyDaysAgo)
        ))
        .groupBy(transactions.sellerId)
        .orderBy(desc(sql`count(*)`))
        .limit(20);

      await RedisService.cacheLeaderboard('top_sellers', topSellers, 3600); // 1 hour

      // Top products by sales
      const topProducts = await db
        .select({
          productId: transactions.productId,
          salesCount: sql<number>`count(*)`,
          revenue: sql<number>`sum(${transactions.amount})`
        })
        .from(transactions)
        .where(and(
          eq(transactions.status, 'completed'),
          gte(transactions.createdAt, thirtyDaysAgo)
        ))
        .groupBy(transactions.productId)
        .orderBy(desc(sql`count(*)`))
        .limit(20);

      await RedisService.cacheLeaderboard('top_products', topProducts, 3600); // 1 hour

      logInfo('Cached leaderboards (top_sellers, top_products)');
    } catch (error) {
      logError(error, 'Failed to warm leaderboard caches');
    }
  }

  /**
   * Warm specific user data (for active users)
   */
  static async warmUserData(userId: number): Promise<void> {
    try {
      const dashboardStats = await OptimizedQueries.getDashboardStats(userId);
      await RedisService.cacheDashboardStats(userId, dashboardStats, 300); // 5 minutes

      logInfo(`Warmed cache for user ${userId}`);
    } catch (error) {
      logError(error, `Failed to warm user data for ${userId}`);
    }
  }

  /**
   * Schedule periodic cache warming
   */
  static startPeriodicWarming(intervalMinutes: number = 30): void {
    // Don't start if already running
    if (this.warmingInterval) return;
    
    logInfo(`🔥 Starting periodic cache warming every ${intervalMinutes} minutes`);

    // Initial warming after a short delay to let services initialize
    this.initialWarmingTimeout = setTimeout(() => {
      logInfo('Running initial cache warming...');
      this.warmAllCaches();
    }, 10000); // Wait 10 seconds

    // Schedule periodic warming
    this.warmingInterval = setInterval(() => {
      logInfo('🔄 Running scheduled cache warming...');
      this.warmAllCaches();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop periodic cache warming (for graceful shutdown)
   */
  static stopPeriodicWarming(): void {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
    }
    if (this.initialWarmingTimeout) {
      clearTimeout(this.initialWarmingTimeout);
      this.initialWarmingTimeout = null;
    }
  }

  /**
   * Warm specific data type
   */
  static async warmSpecificCache(type: 'products' | 'categories' | 'analytics' | 'leaderboards'): Promise<void> {
    if (!RedisService.isAvailable()) {
      logInfo('Redis not available - skipping specific cache warming');
      return;
    }

    logInfo(`Warming ${type} cache...`);
    
    try {
      switch (type) {
        case 'products':
          await this.warmPopularProducts();
          break;
        case 'categories':
          await this.warmCategories();
          break;
        case 'analytics':
          await this.warmAnalyticsSummaries();
          break;
        case 'leaderboards':
          await this.warmLeaderboards();
          break;
      }
      logInfo(`✅ ${type} cache warmed successfully`);
    } catch (error) {
      logError(error, `Failed to warm ${type} cache`);
    }
  }
}
