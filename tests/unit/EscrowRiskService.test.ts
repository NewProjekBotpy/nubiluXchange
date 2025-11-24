/**
 * Unit Tests: EscrowRiskService
 * Tests for transaction risk assessment and fraud detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EscrowRiskService } from '../../server/services/EscrowRiskService';
import { storage } from '../../server/storage';
import { RedisService } from '../../server/services/RedisService';

// Mock dependencies
vi.mock('../../server/storage');
vi.mock('../../server/services/RedisService');
vi.mock('../../server/utils/logger');

describe('EscrowRiskService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('assessTransactionRisk', () => {
    it('should assess low risk for normal transaction', async () => {
      const mockUser = {
        id: 1,
        email: 'seller@example.com',
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year old account
        isVerified: true
      };

      const mockProduct = {
        id: 1,
        sellerId: 1,
        title: 'Normal Product',
        category: 'electronics',
        price: '100000'
      };

      const mockSellerStats = {
        averageRating: 4.5,
        totalReviews: 50
      };

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(storage.getSellerReviewStats).mockResolvedValue(mockSellerStats as any);
      vi.mocked(storage.getTransactionsByUser).mockResolvedValue([]);
      vi.mocked(RedisService.isAvailable).mockReturnValue(false);

      const assessment = await EscrowRiskService.assessTransactionRisk(1, 1, '100000');

      expect(assessment).toBeDefined();
      expect(assessment.level).toBe('low');
      expect(assessment.score).toBeLessThan(50);
      expect(assessment.requiresManualReview).toBe(false);
    });

    it('should assess high risk for new user with high value transaction', async () => {
      const mockUser = {
        id: 2,
        email: 'newuser@example.com',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days old
        isVerified: false
      };

      const mockProduct = {
        id: 2,
        sellerId: 3,
        title: 'Expensive Gaming Account',
        category: 'mobile_legends',
        price: '10000000' // 10 million IDR
      };

      const mockSellerStats = {
        averageRating: 2.5,
        totalReviews: 2
      };

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(storage.getSellerReviewStats).mockResolvedValue(mockSellerStats as any);
      vi.mocked(storage.getTransactionsByUser).mockResolvedValue([]);
      vi.mocked(storage.getChatsByUser).mockResolvedValue([]);

      const assessment = await EscrowRiskService.assessTransactionRisk(2, 2, '10000000');

      expect(assessment.level).toMatch(/high|critical/);
      expect(assessment.score).toBeGreaterThanOrEqual(50);
      expect(assessment.requiresManualReview).toBe(true);
      expect(assessment.factors.some(f => /new.*user/i.test(f))).toBeTruthy();
      expect(assessment.factors.some(f => /high.*value/i.test(f))).toBeTruthy();
    });

    it('should assess critical risk for user with multiple failed transactions', async () => {
      const mockUser = {
        id: 3,
        email: 'suspicious@example.com',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        isVerified: true
      };

      const mockProduct = {
        id: 3,
        sellerId: 4,
        title: 'Rare Limited Account',
        category: 'electronics',
        price: '5500000'
      };

      const mockSellerStats = {
        averageRating: 4.0,
        totalReviews: 10
      };

      const mockFailedTransactions = [
        { id: 1, status: 'failed' },
        { id: 2, status: 'failed' },
        { id: 3, status: 'failed' },
        { id: 4, status: 'failed' },
        { id: 5, status: 'failed' }
      ];

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(storage.getSellerReviewStats).mockResolvedValue(mockSellerStats as any);
      vi.mocked(storage.getTransactionsByUser).mockResolvedValue(mockFailedTransactions as any);
      vi.mocked(storage.getChatsByUser).mockResolvedValue([]);

      const assessment = await EscrowRiskService.assessTransactionRisk(3, 3, '5500000');

      expect(assessment.level).toMatch(/high|critical/);
      expect(assessment.score).toBeGreaterThanOrEqual(50);
      expect(assessment.factors.some(f => /failed.*transaction/i.test(f))).toBeTruthy();
    });

    it('should return critical risk when user not found', async () => {
      vi.mocked(storage.getUser).mockResolvedValue(null);
      vi.mocked(storage.getProduct).mockResolvedValue({ id: 1 } as any);

      const assessment = await EscrowRiskService.assessTransactionRisk(999, 1, '100000');

      expect(assessment.level).toBe('critical');
      expect(assessment.score).toBe(100);
      expect(assessment.requiresManualReview).toBe(true);
      expect(assessment.factors).toContain('User or product not found');
    });

    it('should return critical risk when product not found', async () => {
      vi.mocked(storage.getUser).mockResolvedValue({ id: 1 } as any);
      vi.mocked(storage.getProduct).mockResolvedValue(null);

      const assessment = await EscrowRiskService.assessTransactionRisk(1, 999, '100000');

      expect(assessment.level).toBe('critical');
      expect(assessment.score).toBe(100);
      expect(assessment.requiresManualReview).toBe(true);
    });

    it('should include fraud probability in assessment', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
        isVerified: true
      };

      const mockProduct = {
        id: 1,
        sellerId: 1,
        title: 'Product',
        category: 'electronics',
        price: '200000'
      };

      const mockSellerStats = {
        averageRating: 4.5,
        totalReviews: 30
      };

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(storage.getSellerReviewStats).mockResolvedValue(mockSellerStats as any);
      vi.mocked(storage.getTransactionsByUser).mockResolvedValue([]);

      const assessment = await EscrowRiskService.assessTransactionRisk(1, 1, '200000');

      expect(assessment.fraudProbability).toBeDefined();
      expect(assessment.fraudProbability).toBeGreaterThanOrEqual(0);
      expect(assessment.fraudProbability).toBeLessThanOrEqual(100);
      expect(assessment.confidence).toBeDefined();
    });

    it('should include risk profile breakdown', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        createdAt: new Date(),
        isVerified: true
      };

      const mockProduct = {
        id: 1,
        sellerId: 1,
        title: 'Product',
        category: 'electronics',
        price: '100000'
      };

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(storage.getSellerReviewStats).mockResolvedValue({ averageRating: 4.0, totalReviews: 10 } as any);
      vi.mocked(storage.getTransactionsByUser).mockResolvedValue([]);

      const assessment = await EscrowRiskService.assessTransactionRisk(1, 1, '100000');

      expect(assessment.riskProfile).toBeDefined();
      expect(assessment.riskProfile.deviceRisk).toBeDefined();
      expect(assessment.riskProfile.behavioralRisk).toBeDefined();
      expect(assessment.riskProfile.locationRisk).toBeDefined();
      expect(assessment.riskProfile.velocityRisk).toBeDefined();
    });

    it('should flag high-risk gaming categories', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
        isVerified: true
      };

      const mockProduct = {
        id: 1,
        sellerId: 1,
        title: 'Mobile Legends Account',
        category: 'mobile_legends',
        price: '2000000'
      };

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(storage.getSellerReviewStats).mockResolvedValue({ averageRating: 4.0, totalReviews: 10 } as any);
      vi.mocked(storage.getTransactionsByUser).mockResolvedValue([]);

      const assessment = await EscrowRiskService.assessTransactionRisk(1, 1, '2000000');

      // Gaming categories should add to risk score
      expect(assessment.factors.some(f => f.toLowerCase().includes('category'))).toBeTruthy();
    });
  });

  describe('getCachedRiskAssessment', () => {
    it('should return null when Redis is unavailable', async () => {
      vi.mocked(RedisService.isAvailable).mockReturnValue(false);

      const result = await EscrowRiskService.getCachedRiskAssessment(1, 1);

      expect(result).toBeNull();
    });

    it('should return cached assessment when available', async () => {
      const mockAssessment = {
        score: 30,
        level: 'low' as const,
        factors: [],
        recommendations: [],
        requiresManualReview: false,
        confidence: 85,
        fraudProbability: 15,
        riskProfile: {
          deviceRisk: 0,
          behavioralRisk: 0,
          locationRisk: 0,
          velocityRisk: 0
        },
        alerts: []
      };

      const mockGet = vi.fn().mockResolvedValue(JSON.stringify(mockAssessment));
      vi.mocked(RedisService.isAvailable).mockReturnValue(true);
      (RedisService as any).instance = { get: mockGet };

      const result = await EscrowRiskService.getCachedRiskAssessment(1, 1);

      expect(result).toEqual(mockAssessment);
      expect(mockGet).toHaveBeenCalledWith('risk_assessment:1:1');
    });

    it('should return null when cache key not found', async () => {
      const mockGet = vi.fn().mockResolvedValue(null);
      vi.mocked(RedisService.isAvailable).mockReturnValue(true);
      (RedisService as any).instance = { get: mockGet };

      const result = await EscrowRiskService.getCachedRiskAssessment(1, 1);

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      const mockGet = vi.fn().mockRejectedValue(new Error('Redis error'));
      vi.mocked(RedisService.isAvailable).mockReturnValue(true);
      (RedisService as any).instance = { get: mockGet };

      const result = await EscrowRiskService.getCachedRiskAssessment(1, 1);

      expect(result).toBeNull();
    });
  });

  describe('risk level calculation', () => {
    it('should categorize low risk correctly', async () => {
      const mockUser = {
        id: 1,
        email: 'trusted@example.com',
        createdAt: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000), // 2 years old
        isVerified: true
      };

      const mockProduct = {
        id: 1,
        sellerId: 1,
        title: 'Safe Product',
        category: 'electronics',
        price: '50000'
      };

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(storage.getSellerReviewStats).mockResolvedValue({ averageRating: 4.8, totalReviews: 100 } as any);
      vi.mocked(storage.getTransactionsByUser).mockResolvedValue([
        { id: 1, status: 'completed' },
        { id: 2, status: 'completed' }
      ] as any);
      vi.mocked(storage.getChatsByUser).mockResolvedValue([]);

      const assessment = await EscrowRiskService.assessTransactionRisk(1, 1, '50000');

      expect(assessment.level).toBe('low');
      expect(assessment.recommendations.some(r => /process.*normally/i.test(r))).toBeTruthy();
    });

    it('should categorize medium risk correctly', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days old
        isVerified: true
      };

      const mockProduct = {
        id: 1,
        sellerId: 1,
        title: 'Gaming Account Package',
        category: 'electronics',
        price: '3000000'
      };

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(storage.getSellerReviewStats).mockResolvedValue({ averageRating: 2.8, totalReviews: 4 } as any);
      vi.mocked(storage.getTransactionsByUser).mockResolvedValue([]);
      vi.mocked(storage.getChatsByUser).mockResolvedValue([]);

      const assessment = await EscrowRiskService.assessTransactionRisk(1, 1, '3000000');

      expect(['medium', 'high']).toContain(assessment.level);
      expect(assessment.recommendations.some(r => r.toLowerCase().includes('verification') || r.toLowerCase().includes('monitor'))).toBeTruthy();
    });
  });

  describe('recommendations', () => {
    it('should provide appropriate recommendations for low risk', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        isVerified: true
      };

      const mockProduct = {
        id: 1,
        sellerId: 1,
        title: 'Product',
        category: 'electronics',
        price: '100000'
      };

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(storage.getSellerReviewStats).mockResolvedValue({ averageRating: 4.5, totalReviews: 30 } as any);
      vi.mocked(storage.getTransactionsByUser).mockResolvedValue([]);

      const assessment = await EscrowRiskService.assessTransactionRisk(1, 1, '100000');

      expect(assessment.recommendations).toBeDefined();
      expect(assessment.recommendations.length).toBeGreaterThan(0);
    });

    it('should require manual review for critical risk', async () => {
      vi.mocked(storage.getUser).mockResolvedValue(null);
      vi.mocked(storage.getProduct).mockResolvedValue({ id: 1 } as any);

      const assessment = await EscrowRiskService.assessTransactionRisk(999, 1, '100000');

      expect(assessment.requiresManualReview).toBe(true);
      expect(assessment.recommendations.some(r => /block/i.test(r))).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      vi.mocked(storage.getUser).mockRejectedValue(new Error('Database error'));

      const assessment = await EscrowRiskService.assessTransactionRisk(1, 1, '100000');
      
      expect(assessment.level).toBe('high');
      expect(assessment.factors).toContain('Risk assessment system error');
    });

    it('should handle invalid transaction amounts', async () => {
      const mockUser = { id: 1, email: 'user@example.com', createdAt: new Date(), isVerified: true };
      const mockProduct = { id: 1, sellerId: 1, title: 'Product', category: 'electronics', price: '100000' };

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(storage.getSellerReviewStats).mockResolvedValue({ averageRating: 4.0, totalReviews: 10 } as any);
      vi.mocked(storage.getTransactionsByUser).mockResolvedValue([]);

      // Test with invalid amount
      const assessment = await EscrowRiskService.assessTransactionRisk(1, 1, 'invalid');

      expect(assessment).toBeDefined();
      // Should handle NaN gracefully
    });
  });
});
