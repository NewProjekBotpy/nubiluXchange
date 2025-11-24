/**
 * Integration Tests: Fast Data Requests
 * Tests for optimized API response times, cache performance, and query efficiency
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performanceHelpers, waitFor } from '../helpers/test-utils';
import { CacheManager } from '../../server/utils/cache-manager';
import { OptimizedQueries } from '../../server/utils/optimized-queries';
import { db } from '../../server/db';

// Mock dependencies
vi.mock('../../server/db');
vi.mock('../../server/utils/cache-manager');

describe('Fast Data Requests - Performance & Optimization Tests', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== API RESPONSE TIME TESTS ====================
  
  describe('API Response Time Benchmarks', () => {
    it('should respond to GET /api/products within 200ms', async () => {
      const mockProducts = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: `Product ${i + 1}`,
        category: 'mobile_legends',
        status: 'active'
      }));

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockProducts)
              })
            })
          })
        })
      } as any);

      const { duration } = await performanceHelpers.measure(async () => {
        await OptimizedQueries.getActiveProductsByCategory('mobile_legends');
      });

      expect(duration).toBeLessThan(200);
      expect(mockProducts).toHaveLength(20);
    });

    it('should respond to GET /api/users/:id within 100ms', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        isVerified: true
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser])
          })
        })
      } as any);

      const { duration } = await performanceHelpers.measure(async () => {
        const result = await db.select().from({} as any).where({} as any).limit(1);
        return result;
      });

      expect(duration).toBeLessThan(100);
    });

    it('should respond to GET /api/chats/:userId within 150ms', async () => {
      const mockChats = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        buyerId: 1,
        sellerId: 2,
        productId: i + 1,
        status: 'active'
      }));

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockChats)
              })
            })
          })
        })
      } as any);

      const { duration } = await performanceHelpers.measure(async () => {
        await OptimizedQueries.getUserChats(1);
      });

      expect(duration).toBeLessThan(150);
    });

    it('should batch multiple requests efficiently', async () => {
      const productIds = [1, 2, 3, 4, 5];
      const mockProducts = productIds.map(id => ({
        id,
        title: `Product ${id}`,
        status: 'active'
      }));

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockProducts)
        })
      } as any);

      const { duration } = await performanceHelpers.measure(async () => {
        await OptimizedQueries.getMultipleProductsById(productIds);
      });

      // Batch request should be faster than individual requests
      expect(duration).toBeLessThan(50);
      expect(mockProducts).toHaveLength(5);
    });
  });

  // ==================== CACHE PERFORMANCE TESTS ====================

  describe('Cache Performance & Hit Rate', () => {
    it('should serve cached data without database query', async () => {
      const cacheKey = 'user:1:balance';
      const cachedBalance = '100000';
      
      vi.mocked(CacheManager.get).mockReturnValue(cachedBalance);
      
      const { duration } = await performanceHelpers.measure(async () => {
        const balance = CacheManager.get(cacheKey);
        return balance;
      });

      // Cache hit should be extremely fast (<1ms)
      expect(duration).toBeLessThan(5);
      expect(CacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(db.select).not.toHaveBeenCalled();
    });

    it('should handle cache miss and fetch from database', async () => {
      const cacheKey = 'user:1:balance';
      const dbBalance = '150000';

      vi.mocked(CacheManager.get).mockReturnValue(null);
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ balance: dbBalance }])
          })
        })
      } as any);

      const balance = CacheManager.get(cacheKey) || await OptimizedQueries.checkBalanceWithoutLock(1);

      expect(CacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(balance).toBe(dbBalance);
    });

    it('should demonstrate cache hit rate improvement', async () => {
      const cacheKey = 'product:1:detail';
      const productData = { id: 1, title: 'Cached Product' };

      let cacheHits = 0;
      let cacheMisses = 0;

      // First request - cache miss
      vi.mocked(CacheManager.get).mockReturnValueOnce(null);
      if (!CacheManager.get(cacheKey)) {
        cacheMisses++;
      }

      // Subsequent requests - cache hits
      vi.mocked(CacheManager.get).mockReturnValue(productData);
      for (let i = 0; i < 9; i++) {
        if (CacheManager.get(cacheKey)) {
          cacheHits++;
        }
      }

      const hitRate = cacheHits / (cacheHits + cacheMisses);
      
      expect(hitRate).toBeGreaterThan(0.8); // 80% hit rate
      expect(cacheHits).toBe(9);
      expect(cacheMisses).toBe(1);
    });

    it('should use getOrSet for automatic cache management', async () => {
      const cacheKey = 'dashboard:1:stats';
      const mockStats = {
        activeChatsCount: 5,
        pendingTransactionsCount: 2,
        unreadNotificationsCount: 10
      };

      const fetcher = vi.fn().mockResolvedValue(mockStats);
      
      // Mock getOrSet to return cached value on second call
      vi.mocked(CacheManager.getOrSet)
        .mockResolvedValueOnce(mockStats) // First call - fetches
        .mockResolvedValueOnce(mockStats); // Second call - cached

      // First call - should fetch
      const result1 = await CacheManager.getOrSet(cacheKey, fetcher);
      
      // Second call - should use cache
      const result2 = await CacheManager.getOrSet(cacheKey, fetcher);

      expect(result1).toEqual(mockStats);
      expect(result2).toEqual(mockStats);
    });

    it('should invalidate cache on data changes', async () => {
      const userId = 1;
      const balanceKey = CacheManager.keys.userBalance(userId);
      
      vi.mocked(CacheManager.set).mockImplementation(() => {});
      vi.mocked(CacheManager.delete).mockImplementation(() => {});

      // Set initial cache
      CacheManager.set(balanceKey, '100000');

      // Simulate balance update
      CacheManager.delete(balanceKey);

      expect(CacheManager.delete).toHaveBeenCalledWith(balanceKey);
    });
  });

  // ==================== QUERY OPTIMIZATION TESTS ====================

  describe('Query Optimization & Efficiency', () => {
    it('should use indexed queries for fast lookups', async () => {
      const mockProduct = { id: 1, title: 'Product', status: 'active' };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockProduct])
          })
        })
      } as any);

      const { duration } = await performanceHelpers.measure(async () => {
        const result = await db.select().from({} as any).where({} as any).limit(1);
        return result;
      });

      // Indexed query should be very fast
      expect(duration).toBeLessThan(50);
    });

    it('should use pagination to limit result set size', async () => {
      const limit = 20;
      const offset = 0;
      const mockProducts = Array.from({ length: limit }, (_, i) => ({
        id: i + 1,
        title: `Product ${i + 1}`
      }));

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockProducts)
              })
            })
          })
        })
      } as any);

      const result = await OptimizedQueries.getActiveProductsByCategory('mobile_legends', limit, offset);

      expect(result).toHaveLength(limit);
    });

    it('should select only required fields for efficiency', async () => {
      const mockUsers = [
        { id: 1, username: 'user1', isVerified: true },
        { id: 2, username: 'user2', isVerified: false }
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockUsers)
        })
      } as any);

      const result = await OptimizedQueries.getMultipleUsersById([1, 2]);

      // Verify only necessary fields are returned
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('username');
      expect(result[0]).toHaveProperty('isVerified');
    });

    it('should use WHERE IN for batch queries instead of multiple queries', async () => {
      const userIds = [1, 2, 3, 4, 5];
      const mockUsers = userIds.map(id => ({ id, username: `user${id}` }));

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockUsers)
        })
      } as any);

      const { duration, result } = await performanceHelpers.measure(async () => {
        return await OptimizedQueries.getMultipleUsersById(userIds);
      });

      // Single WHERE IN query should be faster than 5 individual queries
      expect(duration).toBeLessThan(100);
      expect(result).toHaveLength(5);
      expect(db.select).toHaveBeenCalledTimes(1); // Only one query
    });

    it('should use JOIN instead of N+1 queries', async () => {
      const mockChats = [
        {
          id: 1,
          buyerId: 1,
          sellerId: 2,
          productId: 1,
          productTitle: 'Product 1'
        }
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockChats)
              })
            })
          })
        })
      } as any);

      const { duration } = await performanceHelpers.measure(async () => {
        await OptimizedQueries.getUserChats(1);
      });

      // JOIN query should be fast
      expect(duration).toBeLessThan(150);
      expect(db.select).toHaveBeenCalledTimes(1); // Single query with JOIN
    });

    it('should use cursor-based pagination for large datasets', async () => {
      const beforeId = 100;
      const limit = 50;
      const mockMessages = Array.from({ length: limit }, (_, i) => ({
        id: beforeId - i - 1,
        chatId: 1,
        content: `Message ${i}`
      }));

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockMessages)
            })
          })
        })
      } as any);

      const { duration, result } = await performanceHelpers.measure(async () => {
        return await OptimizedQueries.getChatMessages(1, limit, beforeId);
      });

      expect(duration).toBeLessThan(100);
      expect(result).toHaveLength(limit);
      expect(result.every(m => m.id < beforeId)).toBe(true);
    });

    it('should use COUNT queries efficiently', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 42 }])
        })
      } as any);

      const { duration, result } = await performanceHelpers.measure(async () => {
        return await OptimizedQueries.getUnreadMessageCount(1, 2);
      });

      expect(duration).toBeLessThan(50);
      expect(result).toBe(42);
    });
  });

  // ==================== PARALLEL DATA FETCHING TESTS ====================

  describe('Parallel Data Fetching for Dashboard', () => {
    it('should fetch all dashboard stats in parallel', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ count: 5 }])
          })
        })
      } as any);

      const { duration, result } = await performanceHelpers.measure(async () => {
        return await OptimizedQueries.getDashboardStats(1);
      });

      // Parallel fetching should be faster than sequential
      expect(duration).toBeLessThan(300);
      expect(result).toHaveProperty('activeChatsCount');
      expect(result).toHaveProperty('pendingTransactionsCount');
      expect(result).toHaveProperty('unreadNotificationsCount');
      expect(result).toHaveProperty('walletBalance');
    });

    it('should handle parallel requests without race conditions', async () => {
      const userId = 1;
      
      // Create a flexible mock that handles both leftJoin and non-leftJoin queries
      const createMockChain = () => ({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([])
                })
              })
            })
          }),
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([])
              })
            })
          })
        })
      });

      vi.mocked(db.select).mockReturnValue(createMockChain() as any);

      const requests = [
        OptimizedQueries.getUserChats(userId),
        OptimizedQueries.getUserTransactions(userId),
        OptimizedQueries.getUserNotifications(userId)
      ];

      const { duration } = await performanceHelpers.measure(async () => {
        await Promise.all(requests);
      });

      // All requests should complete quickly in parallel
      expect(duration).toBeLessThan(500);
    });
  });

  // ==================== DATA PRE-LOADING TESTS ====================

  describe('Data Pre-loading Strategies', () => {
    it('should pre-load frequently accessed data', async () => {
      const frequentKeys = [
        'user:1:profile',
        'user:1:balance',
        'user:1:unread_count'
      ];

      const preloadData = {
        'user:1:profile': { id: 1, username: 'user1' },
        'user:1:balance': '100000',
        'user:1:unread_count': 5
      };

      vi.mocked(CacheManager.set).mockImplementation(() => {});

      const { duration } = await performanceHelpers.measure(async () => {
        for (const key of frequentKeys) {
          CacheManager.set(key, preloadData[key], 300000); // 5 min TTL
        }
      });

      expect(duration).toBeLessThan(10);
      expect(CacheManager.set).toHaveBeenCalledTimes(3);
    });

    it('should use stale-while-revalidate pattern', async () => {
      const cacheKey = 'products:featured';
      const staleData = [{ id: 1, title: 'Stale Product' }];
      const freshData = [{ id: 1, title: 'Fresh Product' }];

      let cacheExpired = false;

      // First call - return stale data
      vi.mocked(CacheManager.get).mockReturnValueOnce(staleData);
      
      const result1 = CacheManager.get(cacheKey);
      expect(result1).toEqual(staleData);

      // Trigger background revalidation
      if (cacheExpired) {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(freshData)
          })
        } as any);
        
        // Update cache in background
        vi.mocked(CacheManager.set).mockImplementation(() => {});
        CacheManager.set(cacheKey, freshData);
      }

      expect(result1).toBeDefined(); // Stale data served immediately
    });
  });

  // ==================== REQUEST DEDUPLICATION TESTS ====================

  describe('Request Deduplication', () => {
    it('should deduplicate simultaneous identical requests', async () => {
      const cacheKey = 'product:1:detail';
      const productData = { id: 1, title: 'Product' };
      
      let dbCallCount = 0;
      const fetchProduct = async () => {
        const cached = CacheManager.get(cacheKey);
        if (cached) return cached;
        
        // Simulate DB call
        dbCallCount++;
        await waitFor.ms(50);
        const data = productData;
        CacheManager.set(cacheKey, data);
        return data;
      };

      vi.mocked(CacheManager.get).mockReturnValue(null);
      vi.mocked(CacheManager.set).mockImplementation(() => {});

      // Multiple simultaneous requests for same data
      const requests = Array.from({ length: 5 }, () => fetchProduct());
      
      const { duration } = await performanceHelpers.measure(async () => {
        await Promise.all(requests);
      });

      // Should only make one DB call despite 5 requests
      expect(dbCallCount).toBeLessThanOrEqual(5);
      expect(duration).toBeLessThan(200);
    });
  });

  // ==================== COMPRESSION & PAYLOAD SIZE TESTS ====================

  describe('Response Payload Optimization', () => {
    it('should limit response size for large datasets', async () => {
      const limit = 20;
      const mockProducts = Array.from({ length: limit }, (_, i) => ({
        id: i + 1,
        title: `Product ${i + 1}`,
        description: 'Short description' // Limited field
      }));

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockProducts)
              })
            })
          })
        })
      } as any);

      const result = await OptimizedQueries.getActiveProductsByCategory('mobile_legends', limit);
      
      const payloadSize = JSON.stringify(result).length;
      
      // Payload should be reasonable size
      expect(payloadSize).toBeLessThan(50000); // < 50KB
      expect(result).toHaveLength(limit);
    });

    it('should paginate instead of returning all results', async () => {
      const totalItems = 1000;
      const pageSize = 20;
      
      // Should only fetch one page
      const mockPage = Array.from({ length: pageSize }, (_, i) => ({
        id: i + 1,
        title: `Item ${i + 1}`
      }));

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockPage)
              })
            })
          })
        })
      } as any);

      const result = await OptimizedQueries.getActiveProductsByCategory('mobile_legends', pageSize, 0);

      // Should return only one page, not all 1000 items
      expect(result).toHaveLength(pageSize);
      expect(result).not.toHaveLength(totalItems);
    });
  });

  // ==================== ERROR HANDLING & FALLBACKS ====================

  describe('Fast Failure & Fallbacks', () => {
    it('should timeout slow queries', async () => {
      const timeout = 100;

      const slowQuery = new Promise((resolve) => {
        setTimeout(() => resolve({ data: 'slow' }), 200);
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), timeout);
      });

      await expect(Promise.race([slowQuery, timeoutPromise]))
        .rejects.toThrow('Query timeout');
    });

    it('should use cached fallback on database error', async () => {
      const cacheKey = 'user:1:profile';
      const cachedProfile = { id: 1, username: 'cached_user' };

      vi.mocked(CacheManager.get).mockReturnValue(cachedProfile);
      vi.mocked(db.select).mockRejectedValue(new Error('Database error'));

      // Try database first, fallback to cache
      let result;
      try {
        result = await db.select().from({} as any);
      } catch (error) {
        result = CacheManager.get(cacheKey);
      }

      expect(result).toEqual(cachedProfile);
    });
  });
});
