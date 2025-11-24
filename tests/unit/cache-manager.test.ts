/**
 * Unit Tests: Cache Manager
 * Tests for cache management utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CacheManager } from '../../server/utils/cache-manager';

describe('CacheManager', () => {
  beforeEach(() => {
    CacheManager.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    CacheManager.clear();
  });

  describe('set and get', () => {
    it('should store and retrieve cache entry', () => {
      const key = 'test-key';
      const data = { value: 'test-data' };

      CacheManager.set(key, data);
      const result = CacheManager.get(key);

      expect(result).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      const result = CacheManager.get('non-existent');

      expect(result).toBeNull();
    });

    it('should handle different data types', () => {
      CacheManager.set('string', 'value');
      CacheManager.set('number', 42);
      CacheManager.set('boolean', true);
      CacheManager.set('object', { key: 'value' });
      CacheManager.set('array', [1, 2, 3]);

      expect(CacheManager.get('string')).toBe('value');
      expect(CacheManager.get('number')).toBe(42);
      expect(CacheManager.get('boolean')).toBe(true);
      expect(CacheManager.get('object')).toEqual({ key: 'value' });
      expect(CacheManager.get('array')).toEqual([1, 2, 3]);
    });

    it('should respect custom TTL', () => {
      vi.useFakeTimers();
      
      const key = 'ttl-test';
      const data = 'test-data';
      const ttl = 1000; // 1 second

      CacheManager.set(key, data, ttl);
      expect(CacheManager.get(key)).toBe(data);

      vi.advanceTimersByTime(1001);
      expect(CacheManager.get(key)).toBeNull();

      vi.useRealTimers();
    });

    it('should use default TTL when not specified', () => {
      vi.useFakeTimers();

      const key = 'default-ttl';
      const data = 'test';

      CacheManager.set(key, data);
      expect(CacheManager.get(key)).toBe(data);

      // Default TTL is 5 minutes
      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(CacheManager.get(key)).toBe(data);

      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(CacheManager.get(key)).toBeNull();

      vi.useRealTimers();
    });

    it('should overwrite existing key', () => {
      const key = 'overwrite';

      CacheManager.set(key, 'original');
      expect(CacheManager.get(key)).toBe('original');

      CacheManager.set(key, 'updated');
      expect(CacheManager.get(key)).toBe('updated');
    });
  });

  describe('delete', () => {
    it('should delete cache entry', () => {
      const key = 'delete-test';
      const data = 'test-data';

      CacheManager.set(key, data);
      expect(CacheManager.get(key)).toBe(data);

      CacheManager.delete(key);
      expect(CacheManager.get(key)).toBeNull();
    });

    it('should handle deleting non-existent key', () => {
      expect(() => CacheManager.delete('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', () => {
      CacheManager.set('key1', 'value1');
      CacheManager.set('key2', 'value2');
      CacheManager.set('key3', 'value3');

      expect(CacheManager.get('key1')).toBe('value1');
      expect(CacheManager.get('key2')).toBe('value2');
      expect(CacheManager.get('key3')).toBe('value3');

      CacheManager.clear();

      expect(CacheManager.get('key1')).toBeNull();
      expect(CacheManager.get('key2')).toBeNull();
      expect(CacheManager.get('key3')).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      vi.useFakeTimers();

      CacheManager.set('expired1', 'data1', 1000);
      CacheManager.set('expired2', 'data2', 1000);
      CacheManager.set('valid', 'data3', 10000);

      vi.advanceTimersByTime(1500);
      CacheManager.cleanup();

      expect(CacheManager.get('expired1')).toBeNull();
      expect(CacheManager.get('expired2')).toBeNull();
      expect(CacheManager.get('valid')).toBe('data3');

      vi.useRealTimers();
    });

    it('should keep valid entries', () => {
      CacheManager.set('key1', 'value1', 10000);
      CacheManager.set('key2', 'value2', 10000);

      CacheManager.cleanup();

      expect(CacheManager.get('key1')).toBe('value1');
      expect(CacheManager.get('key2')).toBe('value2');
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const key = 'cached';
      const cachedData = 'cached-value';
      const fetcher = vi.fn().mockResolvedValue('fetched-value');

      CacheManager.set(key, cachedData);
      const result = await CacheManager.getOrSet(key, fetcher);

      expect(result).toBe(cachedData);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should fetch and cache if not exists', async () => {
      const key = 'not-cached';
      const fetchedData = 'fetched-value';
      const fetcher = vi.fn().mockResolvedValue(fetchedData);

      const result = await CacheManager.getOrSet(key, fetcher);

      expect(result).toBe(fetchedData);
      expect(fetcher).toHaveBeenCalled();
      expect(CacheManager.get(key)).toBe(fetchedData);
    });

    it('should handle fetcher errors', async () => {
      const key = 'error-key';
      const error = new Error('Fetch failed');
      const fetcher = vi.fn().mockRejectedValue(error);

      await expect(CacheManager.getOrSet(key, fetcher)).rejects.toThrow('Fetch failed');
      expect(CacheManager.get(key)).toBeNull();
    });

    it('should respect custom TTL in getOrSet', async () => {
      vi.useFakeTimers();

      const key = 'ttl-getorset';
      const data = 'test-data';
      const ttl = 2000;
      const fetcher = vi.fn().mockResolvedValue(data);

      await CacheManager.getOrSet(key, fetcher, ttl);
      expect(CacheManager.get(key)).toBe(data);

      vi.advanceTimersByTime(2500);
      expect(CacheManager.get(key)).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('cache keys helpers', () => {
    it('should generate user balance key', () => {
      const key = CacheManager.keys.userBalance(123);
      expect(key).toBe('user:123:balance');
    });

    it('should generate user profile key', () => {
      const key = CacheManager.keys.userProfile(456);
      expect(key).toBe('user:456:profile');
    });

    it('should generate product detail key', () => {
      const key = CacheManager.keys.productDetail(789);
      expect(key).toBe('product:789:detail');
    });

    it('should generate chat exists key with product', () => {
      const key = CacheManager.keys.chatExists(1, 2, 3);
      expect(key).toBe('chat:exists:1:2:3');
    });

    it('should generate chat exists key without product', () => {
      const key = CacheManager.keys.chatExists(1, 2);
      expect(key).toBe('chat:exists:1:2');
    });

    it('should generate unread count key', () => {
      const key = CacheManager.keys.unreadCount(123);
      expect(key).toBe('user:123:unread_count');
    });

    it('should generate dashboard stats key', () => {
      const key = CacheManager.keys.dashboardStats(123);
      expect(key).toBe('user:123:dashboard_stats');
    });
  });

  describe('invalidateUserCache', () => {
    it('should invalidate all user-related cache', () => {
      const userId = 123;

      CacheManager.set(CacheManager.keys.userBalance(userId), '1000');
      CacheManager.set(CacheManager.keys.userProfile(userId), { name: 'Test' });
      CacheManager.set(CacheManager.keys.unreadCount(userId), 5);
      CacheManager.set(CacheManager.keys.dashboardStats(userId), { stats: 'data' });

      CacheManager.invalidateUserCache(userId);

      expect(CacheManager.get(CacheManager.keys.userBalance(userId))).toBeNull();
      expect(CacheManager.get(CacheManager.keys.userProfile(userId))).toBeNull();
      expect(CacheManager.get(CacheManager.keys.unreadCount(userId))).toBeNull();
      expect(CacheManager.get(CacheManager.keys.dashboardStats(userId))).toBeNull();
    });
  });

  describe('invalidateProductCache', () => {
    it('should invalidate product cache', () => {
      const productId = 456;

      CacheManager.set(CacheManager.keys.productDetail(productId), { title: 'Product' });
      CacheManager.invalidateProductCache(productId);

      expect(CacheManager.get(CacheManager.keys.productDetail(productId))).toBeNull();
    });
  });

  describe('clearPattern', () => {
    it('should clear cache entries matching pattern', () => {
      CacheManager.set('user:1:balance', '100');
      CacheManager.set('user:1:profile', { name: 'User 1' });
      CacheManager.set('user:2:balance', '200');
      CacheManager.set('product:1:detail', { title: 'Product' });

      CacheManager.clearPattern('user:1:');

      expect(CacheManager.get('user:1:balance')).toBeNull();
      expect(CacheManager.get('user:1:profile')).toBeNull();
      expect(CacheManager.get('user:2:balance')).toBe('200');
      expect(CacheManager.get('product:1:detail')).toEqual({ title: 'Product' });
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      vi.useFakeTimers();

      CacheManager.set('valid1', 'data1', 10000);
      CacheManager.set('valid2', 'data2', 10000);
      CacheManager.set('expired', 'data3', 1000);

      vi.advanceTimersByTime(1500);

      const stats = CacheManager.getStats();

      expect(stats.total).toBe(3);
      expect(stats.valid).toBe(2);
      expect(stats.expired).toBe(1);
      expect(stats.hitRatio).toBeCloseTo(0.67, 1);

      vi.useRealTimers();
    });

    it('should handle empty cache', () => {
      const stats = CacheManager.getStats();

      expect(stats.total).toBe(0);
      expect(stats.valid).toBe(0);
      expect(stats.expired).toBe(0);
      expect(stats.hitRatio).toBe(0);
    });
  });

  describe('MAX_CACHE_SIZE limit', () => {
    it('should cleanup when cache size exceeds limit', () => {
      vi.useFakeTimers();
      const cleanupSpy = vi.spyOn(CacheManager, 'cleanup');

      // Set max cache size entries
      for (let i = 0; i < 1000; i++) {
        CacheManager.set(`key${i}`, `value${i}`);
      }

      expect(cleanupSpy).not.toHaveBeenCalled();

      // Adding one more should trigger cleanup
      CacheManager.set('key1000', 'value1000');
      
      expect(cleanupSpy).toHaveBeenCalled();

      vi.useRealTimers();
      cleanupSpy.mockRestore();
    });
  });
});
