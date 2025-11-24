import Redis from 'ioredis';
import { logInfo, logError, logWarning } from '../utils/logger';

export interface ChatMessage {
  id: number;
  chatId: number;
  senderId: number;
  content: string;
  messageType: string;
  timestamp: string;
  metadata?: any;
}

export interface ActiveUser {
  userId: number;
  username: string;
  socketId: string;
  chatRooms: number[];
  lastActivity: number;
}

export class RedisService {
  public static instance: Redis;
  private static pubClient: Redis;
  private static subClient: Redis;
  private static initPromise: Promise<void> | null = null;
  private static isInitialized = false;

  /**
   * Initialize Redis connections
   * FIX: Uses Promise-based locking to prevent race conditions during initialization
   */
  static async initialize(): Promise<void> {
    // Return existing initialization promise if already in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.isInitialized) {
      return;
    }

    // Create initialization promise and store it
    this.initPromise = this._initializeInternal();
    
    try {
      await this.initPromise;
      this.isInitialized = true;
    } finally {
      this.initPromise = null;
    }
  }

  private static async _initializeInternal(): Promise<void> {
    // Check if Redis should be enabled
    const enableRedis = process.env.ENABLE_REDIS === 'true';
    const hasRedisUrl = !!process.env.REDIS_URL;
    
    logInfo(`Redis configuration check - ENABLE_REDIS: ${enableRedis}, REDIS_URL: ${hasRedisUrl ? 'present' : 'missing'}`);
    
    // Short-circuit if Redis is not configured or enabled
    if (!enableRedis && !hasRedisUrl) {
      logInfo('⚡ Redis not configured - skipping initialization (chat scaling and caching features disabled)');
      logInfo('🔧 To enable Redis features: Set REDIS_URL environment variable or ENABLE_REDIS=true');
      this.instance = null as any;
      this.pubClient = null as any;
      this.subClient = null as any;
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      // Log Redis configuration
      logInfo(`Attempting Redis connection to: ${redisUrl.split('@')[1] || redisUrl}`);
      
      // Create main Redis client
      this.instance = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 5000,
        commandTimeout: 3000,
      });

      // Create pub/sub clients for real-time messaging
      this.pubClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.subClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      // Test connections
      await Promise.all([
        this.instance.ping(),
        this.pubClient.ping(),
        this.subClient.ping()
      ]);

      logInfo('✅ Redis services initialized successfully');
    } catch (error) {
      logError(error, '❌ Redis initialization failed - all caching and scaling features disabled');
      
      // Disconnect any clients that were created to prevent auto-reconnect attempts
      try {
        if (this.instance) await this.instance.disconnect();
        if (this.pubClient) await this.pubClient.disconnect();
        if (this.subClient) await this.subClient.disconnect();
      } catch (disconnectError) {
        // Ignore disconnect errors
      }
      
      // Set to null to prevent retry attempts
      this.instance = null as any;
      this.pubClient = null as any;
      this.subClient = null as any;
      
      // Alert about Redis unavailability  
      logWarning('🚨 SCALING WARNING: Redis not available. Chat scaling, caching, and advanced risk assessment features are DISABLED.', { service: 'RedisService' });
      logWarning('🔧 To enable Redis features: Set REDIS_URL environment variable to a valid Redis connection string.', { service: 'RedisService' });
    }
  }

  /**
   * FIX BUG #6: Check if Redis is available with proper error handling
   * Prevents race condition where connection fails after status check
   */
  static isAvailable(): boolean {
    try {
      return this.instance && 
             this.instance.status === 'ready' &&
             this.pubClient && 
             this.pubClient.status === 'ready' &&
             this.subClient && 
             this.subClient.status === 'ready';
    } catch (error) {
      // If any error occurs during check, Redis is not available
      return false;
    }
  }

  /**
   * Cache active user sessions with TTL
   */
  static async setActiveUser(userId: number, userInfo: ActiveUser): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      const key = `user:${userId}:session`;
      await this.instance.setex(key, 3600, JSON.stringify(userInfo)); // 1 hour TTL
    } catch (error) {
      logError(error, `Failed to cache active user ${userId}`);
    }
  }

  /**
   * Get active user session
   */
  static async getActiveUser(userId: number): Promise<ActiveUser | null> {
    if (!this.isAvailable()) return null;
    
    try {
      const key = `user:${userId}:session`;
      const cached = await this.instance.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logError(error, `Failed to get active user ${userId}`);
      return null;
    }
  }

  /**
   * Remove user session on disconnect
   */
  static async removeActiveUser(userId: number): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      const key = `user:${userId}:session`;
      await this.instance.del(key);
    } catch (error) {
      logError(error, `Failed to remove active user ${userId}`);
    }
  }

  /**
   * Cache chat room participants for quick lookup
   */
  static async setChatParticipants(chatId: number, participants: number[]): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      const key = `chat:${chatId}:participants`;
      await this.instance.setex(key, 7200, JSON.stringify(participants)); // 2 hours TTL
    } catch (error) {
      logError(error, `Failed to cache chat participants for chat ${chatId}`);
    }
  }

  /**
   * Get cached chat participants
   */
  static async getChatParticipants(chatId: number): Promise<number[] | null> {
    if (!this.isAvailable()) return null;
    
    try {
      const key = `chat:${chatId}:participants`;
      const cached = await this.instance.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logError(error, `Failed to get chat participants for chat ${chatId}`);
      return null;
    }
  }

  /**
   * Publish message to subscribers (for scaling across multiple servers)
   */
  static async publishMessage(chatId: number, message: ChatMessage): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      const channel = `chat:${chatId}:messages`;
      await this.pubClient.publish(channel, JSON.stringify(message));
    } catch (error) {
      logError(error, `Failed to publish message to chat ${chatId}`);
    }
  }

  private static globalMessageHandlers = new Map<string, (message: ChatMessage) => void>();
  private static subscribedChannels = new Set<string>();
  
  /**
   * Initialize global Redis message subscriber
   */
  static async initializeGlobalSubscription(): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      // Set up single message handler for all chat channels
      this.subClient.on('message', (channel: string, data: string) => {
        try {
          const message = JSON.parse(data);
          
          // Route message to appropriate handler
          const handler = this.globalMessageHandlers.get(channel);
          if (handler) {
            handler(message);
            logInfo(`Message routed from Redis channel: ${channel}`);
          }
        } catch (parseError) {
          logError(parseError, 'Failed to parse Redis message');
        }
      });
      
      logInfo('Global Redis message subscription initialized');
    } catch (error) {
      logError(error, 'Failed to initialize global Redis subscription');
    }
  }

  /**
   * Subscribe to chat messages (for real-time updates)
   * FIX BUG #3: Made idempotent to prevent duplicate subscriptions and race conditions
   */
  static async subscribeToChatMessages(
    chatId: number, 
    callback: (message: ChatMessage) => void
  ): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      const channel = `chat:${chatId}:messages`;
      
      // FIX BUG #3: Check if already subscribed to prevent race condition
      if (this.subscribedChannels.has(channel)) {
        logInfo(`Already subscribed to Redis channel: ${channel}, updating callback only`);
        this.globalMessageHandlers.set(channel, callback);
        return;
      }
      
      // Mark as subscribed first to prevent race condition
      this.subscribedChannels.add(channel);
      
      // Register callback handler
      this.globalMessageHandlers.set(channel, callback);
      
      // Subscribe to the channel
      await this.subClient.subscribe(channel);
      logInfo(`Subscribed to Redis channel: ${channel}`);
    } catch (error) {
      logError(error, `Failed to subscribe to chat ${chatId}`);
      // Remove from tracking if subscription failed
      const channel = `chat:${chatId}:messages`;
      this.subscribedChannels.delete(channel);
      this.globalMessageHandlers.delete(channel);
    }
  }

  /**
   * Unsubscribe from chat messages
   * FIX BUG #3: Properly track unsubscriptions
   */
  static async unsubscribeFromChatMessages(chatId: number): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      const channel = `chat:${chatId}:messages`;
      
      // Check if actually subscribed
      if (!this.subscribedChannels.has(channel)) {
        logInfo(`Not subscribed to Redis channel: ${channel}, skipping unsubscribe`);
        return;
      }
      
      // Remove from tracking
      this.subscribedChannels.delete(channel);
      
      // Remove handler
      this.globalMessageHandlers.delete(channel);
      
      // Unsubscribe from channel
      await this.subClient.unsubscribe(channel);
      logInfo(`Unsubscribed from Redis channel: ${channel}`);
    } catch (error) {
      logError(error, `Failed to unsubscribe from chat ${chatId}`);
    }
  }

  /**
   * Subscribe to fraud alerts (for real-time admin notifications)
   */
  static async subscribeToFraudAlerts(
    callback: (alert: any) => void
  ): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      const channel = 'fraud_alerts';
      
      // Register callback handler
      this.globalMessageHandlers.set(channel, callback);
      
      // Subscribe to the channel
      await this.subClient.subscribe(channel);
      logInfo(`Subscribed to Redis channel: ${channel}`);
    } catch (error) {
      logError(error, 'Failed to subscribe to fraud alerts');
    }
  }

  /**
   * Unsubscribe from fraud alerts
   */
  static async unsubscribeFromFraudAlerts(): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      const channel = 'fraud_alerts';
      
      // Remove handler
      this.globalMessageHandlers.delete(channel);
      
      // Unsubscribe from channel
      await this.subClient.unsubscribe(channel);
      logInfo(`Unsubscribed from Redis channel: ${channel}`);
    } catch (error) {
      logError(error, 'Failed to unsubscribe from fraud alerts');
    }
  }

  /**
   * Cache recent messages for quick loading
   */
  static async cacheRecentMessages(chatId: number, messages: ChatMessage[]): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      const key = `chat:${chatId}:recent`;
      await this.instance.setex(key, 1800, JSON.stringify(messages)); // 30 minutes TTL
    } catch (error) {
      logError(error, `Failed to cache recent messages for chat ${chatId}`);
    }
  }

  /**
   * Get cached recent messages
   */
  static async getRecentMessages(chatId: number): Promise<ChatMessage[] | null> {
    if (!this.isAvailable()) return null;
    
    try {
      const key = `chat:${chatId}:recent`;
      const cached = await this.instance.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logError(error, `Failed to get recent messages for chat ${chatId}`);
      return null;
    }
  }

  /**
   * Track user typing status with TTL
   */
  static async setUserTyping(chatId: number, userId: number, isTyping: boolean): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      const key = `chat:${chatId}:typing:${userId}`;
      
      if (isTyping) {
        await this.instance.setex(key, 5, '1'); // 5 seconds TTL
      } else {
        await this.instance.del(key);
      }
    } catch (error) {
      logError(error, `Failed to set typing status for user ${userId} in chat ${chatId}`);
    }
  }

  /**
   * Get all users currently typing in a chat
   */
  static async getTypingUsers(chatId: number): Promise<number[]> {
    if (!this.isAvailable()) return [];
    
    try {
      const pattern = `chat:${chatId}:typing:*`;
      const keys = await this.instance.keys(pattern);
      
      return keys.map(key => {
        const match = key.match(/chat:\d+:typing:(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }).filter(id => id > 0);
    } catch (error) {
      logError(error, `Failed to get typing users for chat ${chatId}`);
      return [];
    }
  }

  /**
   * Rate limiting for chat messages
   */
  static async checkMessageRateLimit(userId: number): Promise<{ allowed: boolean; remaining: number }> {
    if (!this.isAvailable()) {
      return { allowed: true, remaining: 10 }; // Allow without Redis
    }
    
    try {
      const key = `rate_limit:messages:${userId}`;
      const current = await this.instance.get(key);
      
      const limit = 20; // 20 messages per minute
      const window = 60; // 60 seconds
      
      if (!current) {
        await this.instance.setex(key, window, '1');
        return { allowed: true, remaining: limit - 1 };
      }
      
      const count = parseInt(current);
      if (count >= limit) {
        return { allowed: false, remaining: 0 };
      }
      
      await this.instance.incr(key);
      return { allowed: true, remaining: limit - count - 1 };
    } catch (error) {
      logError(error, `Failed to check rate limit for user ${userId}`);
      return { allowed: true, remaining: 10 }; // Fallback to allow
    }
  }

  /**
   * Cleanup expired data
   */
  static async cleanup(): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      // This is handled automatically by TTL, but we can add manual cleanup if needed
      logInfo('Redis cleanup completed');
    } catch (error) {
      logError(error, 'Redis cleanup failed');
    }
  }

  /**
   * Get Redis connection statistics
   */
  static async getStats(): Promise<any> {
    if (!this.isAvailable()) {
      return { status: 'unavailable', message: 'Redis not connected' };
    }
    
    try {
      const info = await this.instance.info('memory');
      const clientList = await this.instance.client('LIST');
      
      return {
        status: 'connected',
        memory: info,
        clients: typeof clientList === 'string' ? clientList.split('\n').length - 1 : 0,
        lastPing: await this.instance.ping()
      };
    } catch (error: any) {
      logError(error, 'Failed to get Redis stats');
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Publish typing status to Redis for scaling across servers
   */
  static async publishTypingStatus(chatId: number, typingData: { userId: number; isTyping: boolean; timestamp: number }): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      const channel = `chat:${chatId}:typing`;
      await this.pubClient.publish(channel, JSON.stringify(typingData));
    } catch (error) {
      logError(error, `Failed to publish typing status for chat ${chatId}`);
    }
  }

  /**
   * Publish reaction update to Redis for scaling across servers
   */
  static async publishReactionUpdate(chatId: number, reactionData: any): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      const channel = `chat:${chatId}:reactions`;
      await this.pubClient.publish(channel, JSON.stringify(reactionData));
    } catch (error) {
      logError(error, `Failed to publish reaction update for chat ${chatId}`);
    }
  }

  /**
   * Update user activity timestamp
   */
  static async updateUserActivity(userId: number): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      const userInfo = await this.getActiveUser(userId);
      if (userInfo) {
        userInfo.lastActivity = Date.now();
        await this.setActiveUser(userId, userInfo);
      }
    } catch (error) {
      logError(error, `Failed to update activity for user ${userId}`);
    }
  }

  /**
   * Publish user online/offline status to Redis for scaling across servers
   */
  static async publishUserStatus(userId: number, statusData: { status: 'online' | 'offline'; timestamp: number }): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      const channel = `user:${userId}:status`;
      await this.pubClient.publish(channel, JSON.stringify(statusData));
    } catch (error) {
      logError(error, `Failed to publish status for user ${userId}`);
    }
  }

  /**
   * In-memory fallback for idempotency keys when Redis is unavailable
   * Uses Map with automatic TTL cleanup
   */
  private static idempotencyMap = new Map<string, { transactionId: number; expiresAt: number }>();

  /**
   * BUG #22 FIX: Atomic idempotency lock acquisition using Redis SET NX
   * This prevents race conditions in parallel payment requests
   * 
   * @param key - Idempotency key (e.g., hash of userId+productId+amount)
   * @param transactionId - Transaction ID to store if lock acquired
   * @param ttlSeconds - Time-to-live in seconds (default: 300 = 5 minutes)
   * @returns true if lock acquired (first request), false if already exists
   */
  static async acquireIdempotencyLock(key: string, transactionId: number, ttlSeconds: number = 300): Promise<boolean> {
    const redisKey = `payment:idem:${key}`;
    
    if (this.isAvailable()) {
      try {
        const result = await this.instance.set(redisKey, transactionId.toString(), 'EX', ttlSeconds, 'NX');
        
        if (result === 'OK') {
          logInfo(`Idempotency lock acquired in Redis: ${redisKey}`, { 
            transactionId, 
            ttl: ttlSeconds 
          });
          return true;
        }
        
        logInfo(`Idempotency lock already exists in Redis: ${redisKey}`);
        return false;
      } catch (error) {
        logError(error, `Failed to acquire idempotency lock in Redis: ${redisKey}, falling back to in-memory`);
      }
    }
    
    const now = Date.now();
    this.cleanupExpiredIdempotencyKeys();
    
    const existing = this.idempotencyMap.get(key);
    if (existing && existing.expiresAt > now) {
      logInfo(`Idempotency lock already exists in memory: ${key}`);
      return false;
    }
    
    this.idempotencyMap.set(key, {
      transactionId,
      expiresAt: now + (ttlSeconds * 1000)
    });
    
    logInfo(`Idempotency lock acquired in memory: ${key}`, { 
      transactionId, 
      ttl: ttlSeconds 
    });
    return true;
  }

  /**
   * BUG #22 FIX: Get transaction ID for an idempotency key
   * Returns null if key doesn't exist or has expired
   * 
   * @param key - Idempotency key
   * @returns Transaction ID if exists, null otherwise
   */
  static async getIdempotencyKey(key: string): Promise<number | null> {
    const redisKey = `payment:idem:${key}`;
    
    if (this.isAvailable()) {
      try {
        const value = await this.instance.get(redisKey);
        return value ? parseInt(value) : null;
      } catch (error) {
        logError(error, `Failed to get idempotency key from Redis: ${redisKey}, falling back to in-memory`);
      }
    }
    
    const now = Date.now();
    this.cleanupExpiredIdempotencyKeys();
    
    const existing = this.idempotencyMap.get(key);
    if (existing && existing.expiresAt > now) {
      return existing.transactionId;
    }
    
    return null;
  }

  /**
   * BUG #22 FIX: Delete idempotency key (e.g., after failed payment to allow retry)
   * 
   * @param key - Idempotency key
   */
  static async deleteIdempotencyKey(key: string): Promise<void> {
    const redisKey = `payment:idem:${key}`;
    
    if (this.isAvailable()) {
      try {
        await this.instance.del(redisKey);
        logInfo(`Deleted idempotency key from Redis: ${redisKey}`);
      } catch (error) {
        logError(error, `Failed to delete idempotency key from Redis: ${redisKey}`);
      }
    }
    
    this.idempotencyMap.delete(key);
    logInfo(`Deleted idempotency key from memory: ${key}`);
  }

  /**
   * BUG #22 FIX: Cleanup expired idempotency keys from in-memory Map
   * Called automatically before reads/writes
   */
  private static cleanupExpiredIdempotencyKeys(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    const entries = Array.from(this.idempotencyMap.entries());
    for (const [key, value] of entries) {
      if (value.expiresAt <= now) {
        this.idempotencyMap.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logInfo(`Cleaned up ${cleanedCount} expired idempotency keys from memory`);
    }
  }

  /**
   * Graceful shutdown
   */
  static async shutdown(): Promise<void> {
    try {
      if (this.instance) await this.instance.disconnect();
      if (this.pubClient) await this.pubClient.disconnect();
      if (this.subClient) await this.subClient.disconnect();
      
      logInfo('Redis connections closed gracefully');
    } catch (error) {
      logError(error, 'Error during Redis shutdown');
    }
  }

  // ===================================
  // PERFORMANCE OPTIMIZATION METHODS
  // ===================================

  /**
   * Generic cache getter with automatic fallback
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 300 // 5 minutes default
  ): Promise<T> {
    if (!this.isAvailable()) {
      return await fetcher();
    }

    try {
      const cached = await this.instance.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }

      const data = await fetcher();
      await this.instance.setex(key, ttl, JSON.stringify(data));
      return data;
    } catch (error) {
      logError(error, `Failed to get or set cache for key ${key}`);
      return await fetcher();
    }
  }

  /**
   * Cache product details with type safety
   */
  static async cacheProduct<T = Record<string, unknown>>(productId: number, product: T, ttl: number = 600): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      // Validate serializable data
      if (product === undefined || product === null) {
        logError(new Error('Cannot cache undefined or null product'), `Product ${productId}`);
        return;
      }

      const key = `product:${productId}:detail`;
      await this.instance.setex(key, ttl, JSON.stringify(product));
    } catch (error) {
      logError(error, `Failed to cache product ${productId}`);
    }
  }

  /**
   * Get cached product details with type safety
   */
  static async getCachedProduct<T = Record<string, unknown>>(productId: number): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `product:${productId}:detail`;
      const cached = await this.instance.get(key);
      
      if (!cached) return null;

      // Add JSON parse safety
      try {
        return JSON.parse(cached) as T;
      } catch (parseError) {
        logError(parseError, `Failed to parse cached product ${productId}`);
        // Invalidate corrupted cache
        await this.instance.del(key);
        return null;
      }
    } catch (error) {
      logError(error, `Failed to get cached product ${productId}`);
      return null;
    }
  }

  /**
   * Cache products by category with type safety
   */
  static async cacheProductsByCategory<T = Record<string, unknown>>(category: string, products: T[], ttl: number = 300): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      // Validate array data
      if (!Array.isArray(products)) {
        logError(new Error('Products must be an array'), `Category ${category}`);
        return;
      }

      const key = `products:category:${category}`;
      await this.instance.setex(key, ttl, JSON.stringify(products));
    } catch (error) {
      logError(error, `Failed to cache products for category ${category}`);
    }
  }

  /**
   * Get cached products by category with type safety
   */
  static async getCachedProductsByCategory<T = Record<string, unknown>>(category: string): Promise<T[] | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `products:category:${category}`;
      const cached = await this.instance.get(key);
      
      if (!cached) return null;

      try {
        const parsed = JSON.parse(cached) as T[];
        // Validate it's an array
        if (!Array.isArray(parsed)) {
          logError(new Error('Cached data is not an array'), `Category ${category}`);
          await this.instance.del(key);
          return null;
        }
        return parsed;
      } catch (parseError) {
        logError(parseError, `Failed to parse cached products for category ${category}`);
        await this.instance.del(key);
        return null;
      }
    } catch (error) {
      logError(error, `Failed to get cached products for category ${category}`);
      return null;
    }
  }

  /**
   * Cache user profile with type safety
   */
  static async cacheUserProfile<T = Record<string, unknown>>(userId: number, profile: T, ttl: number = 600): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      // Validate serializable data
      if (profile === undefined || profile === null) {
        logError(new Error('Cannot cache undefined or null profile'), `User ${userId}`);
        return;
      }

      const key = `user:${userId}:profile`;
      await this.instance.setex(key, ttl, JSON.stringify(profile));
    } catch (error) {
      logError(error, `Failed to cache user profile ${userId}`);
    }
  }

  /**
   * Get cached user profile with type safety
   */
  static async getCachedUserProfile<T = Record<string, unknown>>(userId: number): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `user:${userId}:profile`;
      const cached = await this.instance.get(key);
      
      if (!cached) return null;

      try {
        return JSON.parse(cached) as T;
      } catch (parseError) {
        logError(parseError, `Failed to parse cached user profile ${userId}`);
        await this.instance.del(key);
        return null;
      }
    } catch (error) {
      logError(error, `Failed to get cached user profile ${userId}`);
      return null;
    }
  }

  /**
   * Cache analytics aggregations with type safety
   */
  static async cacheAnalytics<T = Record<string, unknown>>(key: string, data: T, ttl: number = 1800): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      // Validate serializable data
      if (data === undefined || data === null) {
        logError(new Error('Cannot cache undefined or null analytics data'), `Analytics ${key}`);
        return;
      }

      const cacheKey = `analytics:${key}`;
      await this.instance.setex(cacheKey, ttl, JSON.stringify(data));
    } catch (error) {
      logError(error, `Failed to cache analytics ${key}`);
    }
  }

  /**
   * Get cached analytics with type safety
   */
  static async getCachedAnalytics<T = Record<string, unknown>>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const cacheKey = `analytics:${key}`;
      const cached = await this.instance.get(cacheKey);
      
      if (!cached) return null;

      try {
        return JSON.parse(cached) as T;
      } catch (parseError) {
        logError(parseError, `Failed to parse cached analytics ${key}`);
        await this.instance.del(cacheKey);
        return null;
      }
    } catch (error) {
      logError(error, `Failed to get cached analytics ${key}`);
      return null;
    }
  }

  /**
   * Cache dashboard stats with type safety
   */
  static async cacheDashboardStats<T = Record<string, unknown>>(userId: number, stats: T, ttl: number = 60): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      // Validate serializable data
      if (stats === undefined || stats === null) {
        logError(new Error('Cannot cache undefined or null dashboard stats'), `User ${userId}`);
        return;
      }

      const key = `user:${userId}:dashboard`;
      await this.instance.setex(key, ttl, JSON.stringify(stats));
    } catch (error) {
      logError(error, `Failed to cache dashboard stats for user ${userId}`);
    }
  }

  /**
   * Get cached dashboard stats with type safety
   */
  static async getCachedDashboardStats<T = Record<string, unknown>>(userId: number): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `user:${userId}:dashboard`;
      const cached = await this.instance.get(key);
      
      if (!cached) return null;

      return JSON.parse(cached) as T;
    } catch (error) {
      logError(error, `Failed to get cached dashboard stats for user ${userId}`);
      // Invalidate corrupted cache
      try {
        await this.instance.del(`user:${userId}:dashboard`);
      } catch (deleteError) {
        // Log but don't throw - this is a cleanup operation in an error handler
        logWarning(`Failed to delete corrupted cache for user ${userId}`, { error: deleteError });
      }
      return null;
    }
  }

  /**
   * Invalidate product cache
   */
  static async invalidateProduct(productId: number): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await this.instance.del(`product:${productId}:detail`);
      logInfo(`Invalidated cache for product ${productId}`);
    } catch (error) {
      logError(error, `Failed to invalidate product cache ${productId}`);
    }
  }

  /**
   * Invalidate category cache
   */
  static async invalidateCategory(category: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await this.instance.del(`products:category:${category}`);
      logInfo(`Invalidated cache for category ${category}`);
    } catch (error) {
      logError(error, `Failed to invalidate category cache ${category}`);
    }
  }

  /**
   * Invalidate user cache
   */
  static async invalidateUserCache(userId: number): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const keys = [
        `user:${userId}:profile`,
        `user:${userId}:dashboard`,
        `user:${userId}:session`
      ];
      await this.instance.del(...keys);
      logInfo(`Invalidated cache for user ${userId}`);
    } catch (error) {
      logError(error, `Failed to invalidate user cache ${userId}`);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const keys = await this.instance.keys(pattern);
      if (keys.length > 0) {
        await this.instance.del(...keys);
        logInfo(`Invalidated ${keys.length} cache entries matching pattern ${pattern}`);
      }
    } catch (error) {
      logError(error, `Failed to invalidate cache pattern ${pattern}`);
    }
  }

  /**
   * Cache warming - preload popular data
   */
  static async warmCache(warmers: Array<{
    key: string;
    fetcher: () => Promise<any>;
    ttl?: number;
  }>): Promise<void> {
    if (!this.isAvailable()) {
      logInfo('Redis not available - skipping cache warming');
      return;
    }

    logInfo(`Starting cache warming for ${warmers.length} keys...`);
    
    const results = await Promise.allSettled(
      warmers.map(async ({ key, fetcher, ttl = 300 }) => {
        try {
          const data = await fetcher();
          await this.instance.setex(key, ttl, JSON.stringify(data));
          return { key, success: true };
        } catch (error) {
          logError(error, `Cache warming failed for ${key}`);
          return { key, success: false };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    logInfo(`Cache warming complete: ${successful} successful, ${failed} failed`);
  }

  /**
   * Get cache metrics
   */
  static async getCacheMetrics(): Promise<any> {
    if (!this.isAvailable()) {
      return { available: false, message: 'Redis not connected' };
    }

    try {
      const info = await this.instance.info('stats');
      const memory = await this.instance.info('memory');
      const keyspace = await this.instance.info('keyspace');

      return {
        available: true,
        stats: this.parseRedisInfo(info),
        memory: this.parseRedisInfo(memory),
        keyspace: this.parseRedisInfo(keyspace)
      };
    } catch (error: any) {
      logError(error, 'Failed to get cache metrics');
      return { available: false, error: error.message };
    }
  }

  /**
   * Parse Redis INFO output
   */
  private static parseRedisInfo(info: string): Record<string, any> {
    const result: Record<string, any> = {};
    info.split('\n').forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        result[key.trim()] = value.trim();
      }
    });
    return result;
  }

  /**
   * Batch get multiple cache keys
   */
  static async batchGet(keys: string[]): Promise<Map<string, any>> {
    const result = new Map<string, any>();
    
    if (!this.isAvailable() || keys.length === 0) return result;

    try {
      const values = await this.instance.mget(...keys);
      keys.forEach((key, index) => {
        if (values[index]) {
          try {
            result.set(key, JSON.parse(values[index]!));
          } catch {
            result.set(key, values[index]);
          }
        }
      });
    } catch (error) {
      logError(error, 'Failed to batch get cache keys');
    }

    return result;
  }

  /**
   * Batch set multiple cache keys
   */
  static async batchSet(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const pipeline = this.instance.pipeline();
      
      entries.forEach(({ key, value, ttl = 300 }) => {
        pipeline.setex(key, ttl, JSON.stringify(value));
      });

      await pipeline.exec();
      logInfo(`Batch set ${entries.length} cache entries`);
    } catch (error) {
      logError(error, 'Failed to batch set cache keys');
    }
  }

  // ===================================
  // ANALYTICS & AGGREGATION CACHING
  // ===================================

  /**
   * Cache sales analytics data
   */
  static async cacheSalesAnalytics(period: string, data: any, ttl: number = 3600): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `analytics:sales:${period}`;
      await this.instance.setex(key, ttl, JSON.stringify(data));
      logInfo(`Cached sales analytics for period ${period}`);
    } catch (error) {
      logError(error, `Failed to cache sales analytics for ${period}`);
    }
  }

  /**
   * Get cached sales analytics
   */
  static async getCachedSalesAnalytics(period: string): Promise<any | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `analytics:sales:${period}`;
      const cached = await this.instance.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logError(error, `Failed to get cached sales analytics for ${period}`);
      return null;
    }
  }

  /**
   * Cache user statistics
   */
  static async cacheUserStats(userId: number, stats: any, ttl: number = 600): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `stats:user:${userId}`;
      await this.instance.setex(key, ttl, JSON.stringify(stats));
    } catch (error) {
      logError(error, `Failed to cache user stats for ${userId}`);
    }
  }

  /**
   * Get cached user statistics
   */
  static async getCachedUserStats(userId: number): Promise<any | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `stats:user:${userId}`;
      const cached = await this.instance.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logError(error, `Failed to get cached user stats for ${userId}`);
      return null;
    }
  }

  /**
   * Cache popular products list
   */
  static async cachePopularProducts(products: any[], ttl: number = 1800): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = 'products:popular';
      await this.instance.setex(key, ttl, JSON.stringify(products));
      logInfo('Cached popular products list');
    } catch (error) {
      logError(error, 'Failed to cache popular products');
    }
  }

  /**
   * Get cached popular products
   */
  static async getCachedPopularProducts(): Promise<any[] | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = 'products:popular';
      const cached = await this.instance.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logError(error, 'Failed to get cached popular products');
      return null;
    }
  }

  /**
   * Cache transaction summary for a time period
   */
  static async cacheTransactionSummary(period: string, summary: any, ttl: number = 1800): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `transactions:summary:${period}`;
      await this.instance.setex(key, ttl, JSON.stringify(summary));
    } catch (error) {
      logError(error, `Failed to cache transaction summary for ${period}`);
    }
  }

  /**
   * Get cached transaction summary
   */
  static async getCachedTransactionSummary(period: string): Promise<any | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `transactions:summary:${period}`;
      const cached = await this.instance.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logError(error, `Failed to get cached transaction summary for ${period}`);
      return null;
    }
  }

  /**
   * Cache seller revenue data
   */
  static async cacheSellerRevenue(sellerId: number, period: string, revenue: any, ttl: number = 3600): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `revenue:seller:${sellerId}:${period}`;
      await this.instance.setex(key, ttl, JSON.stringify(revenue));
    } catch (error) {
      logError(error, `Failed to cache seller revenue for ${sellerId}`);
    }
  }

  /**
   * Get cached seller revenue
   */
  static async getCachedSellerRevenue(sellerId: number, period: string): Promise<any | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `revenue:seller:${sellerId}:${period}`;
      const cached = await this.instance.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logError(error, `Failed to get cached seller revenue for ${sellerId}`);
      return null;
    }
  }

  /**
   * Cache category statistics
   */
  static async cacheCategoryStats(category: string, stats: any, ttl: number = 1800): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `stats:category:${category}`;
      await this.instance.setex(key, ttl, JSON.stringify(stats));
    } catch (error) {
      logError(error, `Failed to cache category stats for ${category}`);
    }
  }

  /**
   * Get cached category statistics
   */
  static async getCachedCategoryStats(category: string): Promise<any | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `stats:category:${category}`;
      const cached = await this.instance.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logError(error, `Failed to get cached category stats for ${category}`);
      return null;
    }
  }

  /**
   * Cache search results with query hash
   */
  static async cacheSearchResults(query: string, filters: any, results: any[], ttl: number = 600): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const queryHash = Buffer.from(JSON.stringify({ query, filters })).toString('base64').substring(0, 32);
      const key = `search:${queryHash}`;
      await this.instance.setex(key, ttl, JSON.stringify(results));
    } catch (error) {
      logError(error, 'Failed to cache search results');
    }
  }

  /**
   * Get cached search results
   */
  static async getCachedSearchResults(query: string, filters: any): Promise<any[] | null> {
    if (!this.isAvailable()) return null;

    try {
      const queryHash = Buffer.from(JSON.stringify({ query, filters })).toString('base64').substring(0, 32);
      const key = `search:${queryHash}`;
      const cached = await this.instance.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logError(error, 'Failed to get cached search results');
      return null;
    }
  }

  /**
   * Increment counter with expiry (for rate limiting, view counts, etc.)
   */
  static async incrementCounter(key: string, amount: number = 1, ttl?: number): Promise<number> {
    if (!this.isAvailable()) return amount;

    try {
      const newValue = await this.instance.incrby(key, amount);
      
      // Set TTL if it's a new key
      if (ttl && newValue === amount) {
        await this.instance.expire(key, ttl);
      }
      
      return newValue;
    } catch (error) {
      logError(error, `Failed to increment counter ${key}`);
      return amount;
    }
  }

  /**
   * Get counter value
   */
  static async getCounter(key: string): Promise<number> {
    if (!this.isAvailable()) return 0;

    try {
      const value = await this.instance.get(key);
      return value ? parseInt(value) : 0;
    } catch (error) {
      logError(error, `Failed to get counter ${key}`);
      return 0;
    }
  }

  /**
   * Cache leaderboard data
   */
  static async cacheLeaderboard(type: string, data: any[], ttl: number = 1800): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `leaderboard:${type}`;
      await this.instance.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      logError(error, `Failed to cache leaderboard ${type}`);
    }
  }

  /**
   * Get cached leaderboard
   */
  static async getCachedLeaderboard(type: string): Promise<any[] | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `leaderboard:${type}`;
      const cached = await this.instance.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logError(error, `Failed to get cached leaderboard ${type}`);
      return null;
    }
  }

  /**
   * Invalidate all analytics caches
   */
  static async invalidateAnalytics(): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const patterns = [
        'analytics:*',
        'stats:*',
        'revenue:*',
        'leaderboard:*',
        'transactions:summary:*'
      ];

      for (const pattern of patterns) {
        const keys = await this.instance.keys(pattern);
        if (keys.length > 0) {
          await this.instance.del(...keys);
        }
      }

      logInfo('Invalidated all analytics caches');
    } catch (error) {
      logError(error, 'Failed to invalidate analytics caches');
    }
  }
}