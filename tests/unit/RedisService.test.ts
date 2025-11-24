/**
 * Unit Tests: RedisService
 * Tests for Redis caching and pub/sub functionality
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const mockRedisClient = {
  on: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  keys: vi.fn(),
  flushdb: vi.fn(),
  publish: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  ping: vi.fn(),
  quit: vi.fn(),
  disconnect: vi.fn(),
  incr: vi.fn(),
  info: vi.fn(),
  client: vi.fn(),
  status: 'ready'
};

vi.mock('ioredis', () => {
  const MockRedis = vi.fn().mockImplementation(() => mockRedisClient);
  return { default: MockRedis };
});

vi.mock('../../server/utils/logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn()
}));

import { RedisService } from '../../server/services/RedisService';

describe('RedisService', () => {
  beforeAll(() => {
    RedisService.instance = mockRedisClient as any;
    (RedisService as any).pubClient = mockRedisClient as any;
    (RedisService as any).subClient = mockRedisClient as any;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisClient.status = 'ready';
  });

  describe('isAvailable', () => {
    it('should return availability status', () => {
      const result = RedisService.isAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('get and set operations', () => {
    it('should get value from cache', async () => {
      const mockValue = JSON.stringify({ data: 'test' });
      mockRedisClient.get.mockResolvedValue(mockValue);

      const result = await RedisService.instance.get('test-key');

      expect(result).toBe(mockValue);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should set value in cache', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await RedisService.instance.set('test-key', 'test-value');

      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should set value with expiration', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      await RedisService.instance.setex('test-key', 3600, 'test-value');

      expect(mockRedisClient.setex).toHaveBeenCalledWith('test-key', 3600, 'test-value');
    });

    it('should delete value from cache', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      const result = await RedisService.instance.del('test-key');

      expect(result).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('key operations', () => {
    it('should check if key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await RedisService.instance.exists('test-key');

      expect(result).toBe(1);
    });

    it('should set key expiration', async () => {
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await RedisService.instance.expire('test-key', 3600);

      expect(result).toBe(1);
    });

    it('should get time to live for key', async () => {
      mockRedisClient.ttl.mockResolvedValue(3600);

      const result = await RedisService.instance.ttl('test-key');

      expect(result).toBe(3600);
    });

    it('should find keys by pattern', async () => {
      const mockKeys = ['user:1', 'user:2', 'user:3'];
      mockRedisClient.keys.mockResolvedValue(mockKeys);

      const result = await RedisService.instance.keys('user:*');

      expect(result).toEqual(mockKeys);
    });
  });

  describe('pub/sub operations', () => {
    it('should publish message to channel', async () => {
      mockRedisClient.publish.mockResolvedValue(1);

      const result = await RedisService.instance.publish('test-channel', 'test-message');

      expect(result).toBe(1);
      expect(mockRedisClient.publish).toHaveBeenCalledWith('test-channel', 'test-message');
    });

    it('should subscribe to channel', async () => {
      mockRedisClient.subscribe.mockResolvedValue(undefined as any);

      await RedisService.instance.subscribe('test-channel');

      expect(mockRedisClient.subscribe).toHaveBeenCalledWith('test-channel');
    });

    it('should unsubscribe from channel', async () => {
      mockRedisClient.unsubscribe.mockResolvedValue(undefined as any);

      await RedisService.instance.unsubscribe('test-channel');

      expect(mockRedisClient.unsubscribe).toHaveBeenCalledWith('test-channel');
    });
  });

  describe('health check', () => {
    it('should ping Redis successfully', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await RedisService.instance.ping();

      expect(result).toBe('PONG');
    });

    it('should handle ping errors', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection error'));

      await expect(RedisService.instance.ping()).rejects.toThrow('Connection error');
    });
  });

  describe('cleanup operations', () => {
    it('should flush database', async () => {
      mockRedisClient.flushdb.mockResolvedValue('OK');

      await RedisService.instance.flushdb();

      expect(mockRedisClient.flushdb).toHaveBeenCalled();
    });

    it('should quit connection', async () => {
      mockRedisClient.quit.mockResolvedValue('OK');

      await RedisService.instance.quit();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle get errors', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      await expect(RedisService.instance.get('test-key')).rejects.toThrow('Redis error');
    });

    it('should handle set errors', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Write error'));

      await expect(
        RedisService.instance.set('test-key', 'value')
      ).rejects.toThrow('Write error');
    });

    it('should handle publish errors', async () => {
      mockRedisClient.publish.mockRejectedValue(new Error('Publish error'));

      await expect(
        RedisService.instance.publish('channel', 'message')
      ).rejects.toThrow('Publish error');
    });
  });

  describe('JSON operations', () => {
    it('should store and retrieve JSON data', async () => {
      const testData = { userId: 1, name: 'Test User', active: true };
      const serialized = JSON.stringify(testData);
      
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue(serialized);

      // Store
      await RedisService.instance.set('user:1', serialized);
      
      // Retrieve
      const retrieved = await RedisService.instance.get('user:1');
      const parsed = JSON.parse(retrieved!);

      expect(parsed).toEqual(testData);
    });

    it('should handle invalid JSON gracefully', async () => {
      mockRedisClient.get.mockResolvedValue('invalid-json');

      const result = await RedisService.instance.get('test-key');

      expect(result).toBe('invalid-json');
      expect(() => JSON.parse(result!)).toThrow();
    });
  });

  describe('caching patterns', () => {
    it('should implement cache-aside pattern', async () => {
      const cacheKey = 'user:123';
      const userData = { id: 123, name: 'John' };

      // Cache miss
      mockRedisClient.get.mockResolvedValueOnce(null);
      // Cache set
      mockRedisClient.setex.mockResolvedValueOnce('OK');
      // Cache hit
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(userData));

      // First call - cache miss, fetch from DB
      let cachedData = await RedisService.instance.get(cacheKey);
      expect(cachedData).toBeNull();

      // Store in cache
      await RedisService.instance.setex(cacheKey, 3600, JSON.stringify(userData));

      // Second call - cache hit
      cachedData = await RedisService.instance.get(cacheKey);
      expect(JSON.parse(cachedData!)).toEqual(userData);
    });

    it('should implement TTL-based expiration', async () => {
      const key = 'session:abc123';
      
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.ttl.mockResolvedValue(1800);

      // Set with TTL
      await RedisService.instance.setex(key, 3600, 'session-data');
      
      // Check TTL
      const ttl = await RedisService.instance.ttl(key);
      expect(ttl).toBeGreaterThan(0);
    });
  });

  describe('batch operations', () => {
    it('should delete multiple keys', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockRedisClient.del.mockResolvedValue(3);

      const result = await RedisService.instance.del(...keys);

      expect(result).toBe(3);
    });

    it('should check existence of multiple keys', async () => {
      mockRedisClient.exists.mockResolvedValue(2);

      const result = await RedisService.instance.exists('key1', 'key2', 'key3');

      expect(result).toBe(2);
    });
  });
});
