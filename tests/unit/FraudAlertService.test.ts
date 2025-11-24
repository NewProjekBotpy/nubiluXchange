/**
 * Unit Tests: FraudAlertService
 * Tests for fraud alert creation, management, and notification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FraudAlertService } from '../../server/services/FraudAlertService';
import { storage } from '../../server/storage';
import { RedisService } from '../../server/services/RedisService';

vi.mock('../../server/storage', () => ({
  storage: {
    createFraudAlert: vi.fn(),
    getFraudAlert: vi.fn(),
    updateFraudAlert: vi.fn(),
    acknowledgeFraudAlert: vi.fn(),
    resolveFraudAlert: vi.fn(),
    getFraudAlerts: vi.fn(),
    getFraudAlertStats: vi.fn(),
    getAllUsers: vi.fn()
  }
}));
vi.mock('../../server/services/RedisService', () => ({
  RedisService: {
    isAvailable: vi.fn(),
    instance: {
      publish: vi.fn(),
      setex: vi.fn(),
      lpush: vi.fn(),
      expire: vi.fn(),
      ltrim: vi.fn()
    }
  }
}));
vi.mock('../../server/utils/logger');
vi.mock('../../server/utils/activity-logger');

describe('FraudAlertService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processRiskAssessment', () => {
    it('should create critical alert for critical risk assessment', async () => {
      const riskAssessment = {
        score: 95,
        level: 'critical' as const,
        factors: ['High value transaction', 'New user account'],
        recommendations: ['Block transaction'],
        requiresManualReview: true,
        confidence: 90,
        fraudProbability: 95,
        riskProfile: {
          deviceRisk: 30,
          behavioralRisk: 40,
          locationRisk: 15,
          velocityRisk: 10
        },
        alerts: []
      };

      const mockAlert = {
        id: 1,
        userId: 1,
        transactionId: 100,
        alertType: 'critical_risk' as const,
        severity: 'critical' as const,
        title: 'Critical Fraud Risk Detected',
        message: 'High-risk transaction blocked',
        riskScore: 95,
        riskFactors: ['High value transaction', 'New user account'],
        metadata: {},
        status: 'active' as const,
        createdAt: new Date()
      };

      vi.mocked(storage.createFraudAlert).mockResolvedValue(mockAlert as any);
      vi.mocked(RedisService.isAvailable).mockReturnValue(false);

      const alerts = await FraudAlertService.processRiskAssessment(
        1,
        100,
        riskAssessment,
        '5000000'
      );

      expect(alerts).toBeDefined();
      expect(alerts.length).toBeGreaterThan(0);
      expect(storage.createFraudAlert).toHaveBeenCalled();
    });

    it('should create high risk alert for high risk assessment', async () => {
      const riskAssessment = {
        score: 78,
        level: 'high' as const,
        factors: ['Recent account', 'Low seller reputation'],
        recommendations: ['Manual review required'],
        requiresManualReview: true,
        confidence: 85,
        fraudProbability: 70,
        riskProfile: {
          deviceRisk: 20,
          behavioralRisk: 30,
          locationRisk: 18,
          velocityRisk: 10
        },
        alerts: []
      };

      const mockAlert = {
        id: 2,
        userId: 2,
        transactionId: 101,
        alertType: 'high_risk' as const,
        severity: 'high' as const,
        title: 'High Fraud Risk Detected',
        message: 'Transaction requires review',
        riskScore: 78,
        riskFactors: ['Recent account', 'Low seller reputation'],
        metadata: {},
        status: 'active' as const,
        createdAt: new Date()
      };

      vi.mocked(storage.createFraudAlert).mockResolvedValue(mockAlert as any);

      const alerts = await FraudAlertService.processRiskAssessment(
        2,
        101,
        riskAssessment,
        '2000000'
      );

      expect(alerts.length).toBeGreaterThan(0);
      expect(storage.createFraudAlert).toHaveBeenCalled();
    });

    it('should not create alerts for low risk assessment', async () => {
      const riskAssessment = {
        score: 25,
        level: 'low' as const,
        factors: [],
        recommendations: ['Process normally'],
        requiresManualReview: false,
        confidence: 95,
        fraudProbability: 10,
        riskProfile: {
          deviceRisk: 0,
          behavioralRisk: 0,
          locationRisk: 0,
          velocityRisk: 0
        },
        alerts: []
      };

      const alerts = await FraudAlertService.processRiskAssessment(
        1,
        100,
        riskAssessment,
        '100000'
      );

      expect(alerts.length).toBe(0);
      expect(storage.createFraudAlert).not.toHaveBeenCalled();
    });

    it('should broadcast alert when created', async () => {
      const riskAssessment = {
        score: 92,
        level: 'critical' as const,
        factors: ['Suspicious activity'],
        recommendations: ['Block transaction'],
        requiresManualReview: true,
        confidence: 88,
        fraudProbability: 90,
        riskProfile: {
          deviceRisk: 25,
          behavioralRisk: 35,
          locationRisk: 20,
          velocityRisk: 12
        },
        alerts: []
      };

      const mockAlert = {
        id: 3,
        userId: 3,
        transactionId: 102,
        alertType: 'critical_risk' as const,
        severity: 'critical' as const,
        title: 'Critical Alert',
        message: 'High risk detected',
        riskScore: 92,
        riskFactors: ['Suspicious activity'],
        metadata: {},
        status: 'active' as const,
        createdAt: new Date()
      };

      vi.mocked(storage.createFraudAlert).mockResolvedValue(mockAlert as any);
      vi.mocked(storage.getAllUsers).mockResolvedValue([
        { id: 1, username: 'admin', role: 'admin' } as any
      ]);
      vi.mocked(RedisService.isAvailable).mockReturnValue(true);
      vi.mocked(RedisService.instance.publish).mockResolvedValue(1);

      await FraudAlertService.processRiskAssessment(
        3,
        102,
        riskAssessment,
        '3000000'
      );

      expect(RedisService.instance.publish).toHaveBeenCalled();
    });
  });

  describe('getAlertStats', () => {
    it('should calculate alert statistics correctly', async () => {
      const mockAlerts = [
        {
          id: 1,
          severity: 'critical',
          status: 'active',
          alertType: 'critical_risk',
          createdAt: new Date(),
          acknowledgedAt: null,
          resolvedAt: null
        },
        {
          id: 2,
          severity: 'high',
          status: 'resolved',
          alertType: 'high_risk',
          createdAt: new Date(Date.now() - 60 * 60 * 1000),
          acknowledgedAt: new Date(Date.now() - 50 * 60 * 1000),
          resolvedAt: new Date(Date.now() - 30 * 60 * 1000)
        },
        {
          id: 3,
          severity: 'medium',
          status: 'false_positive',
          alertType: 'velocity',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          acknowledgedAt: null,
          resolvedAt: null
        }
      ];

      const mockStats = {
        totalActive: 1,
        totalToday: 2,
        highPriority: 1,
        byType: { critical_risk: 1, high_risk: 1, velocity: 1 },
        byStatus: { active: 1, resolved: 1, false_positive: 1 },
        averageResponseTime: 20,
        falsePositiveRate: 33.33
      };

      vi.mocked(storage.getFraudAlertStats).mockResolvedValue(mockStats as any);

      const stats = await FraudAlertService.getAlertStats();

      expect(stats).toBeDefined();
      expect(stats.totalActive).toBeGreaterThanOrEqual(0);
      expect(stats.totalToday).toBeGreaterThanOrEqual(0);
      expect(stats.byType).toBeDefined();
      expect(stats.byStatus).toBeDefined();
    });

    it('should handle empty alerts list', async () => {
      const emptyStats = {
        totalActive: 0,
        totalToday: 0,
        highPriority: 0,
        byType: {},
        byStatus: {},
        averageResponseTime: 0,
        falsePositiveRate: 0
      };

      vi.mocked(storage.getFraudAlertStats).mockResolvedValue(emptyStats as any);

      const stats = await FraudAlertService.getAlertStats();

      expect(stats.totalActive).toBe(0);
      expect(stats.totalToday).toBe(0);
      expect(stats.highPriority).toBe(0);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge alert successfully', async () => {
      const mockAlert = {
        id: 1,
        userId: 1,
        status: 'active' as const,
        acknowledgedBy: null,
        acknowledgedAt: null
      };

      const updatedAlert = {
        ...mockAlert,
        status: 'acknowledged' as const,
        acknowledgedBy: 1,
        acknowledgedAt: new Date()
      };

      vi.mocked(storage.acknowledgeFraudAlert).mockResolvedValue(true);
      vi.mocked(storage.getFraudAlert).mockResolvedValue(updatedAlert as any);

      const result = await FraudAlertService.acknowledgeAlert(1, 1);

      expect(result).toBeDefined();
      expect(result?.status).toBe('acknowledged');
      expect(result?.acknowledgedBy).toBe(1);
      expect(storage.acknowledgeFraudAlert).toHaveBeenCalled();
    });

    it('should return null for non-existent alert', async () => {
      vi.mocked(storage.acknowledgeFraudAlert).mockResolvedValue(false);

      const result = await FraudAlertService.acknowledgeAlert(999, 1);

      expect(result).toBeNull();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert with note', async () => {
      const mockAlert = {
        id: 1,
        userId: 1,
        status: 'acknowledged' as const
      };

      const resolvedAlert = {
        ...mockAlert,
        status: 'resolved' as const,
        resolvedBy: 1,
        resolvedAt: new Date(),
        metadata: { resolutionNote: 'Verified legitimate transaction' }
      };

      vi.mocked(storage.resolveFraudAlert).mockResolvedValue(true);
      vi.mocked(storage.getFraudAlert).mockResolvedValue(resolvedAlert as any);

      const result = await FraudAlertService.resolveAlert(
        1,
        1,
        'Verified legitimate transaction'
      );

      expect(result).toBeDefined();
      expect(result?.status).toBe('resolved');
      expect(result?.metadata?.resolutionNote).toBe('Verified legitimate transaction');
    });
  });

  describe('markAsFalsePositive', () => {
    it('should mark alert as false positive', async () => {
      const mockAlert = {
        id: 1,
        userId: 1,
        status: 'active' as const
      };

      const updatedAlert = {
        ...mockAlert,
        status: 'false_positive' as const,
        resolvedBy: 1,
        resolvedAt: new Date(),
        metadata: { resolutionNote: 'False positive - normal transaction' }
      };

      vi.mocked(storage.resolveFraudAlert).mockResolvedValue(true);
      vi.mocked(storage.getFraudAlert).mockResolvedValue(updatedAlert as any);

      const result = await FraudAlertService.markAsFalsePositive(
        1,
        1,
        'False positive - normal transaction'
      );

      expect(result).toBeDefined();
      expect(result?.status).toBe('false_positive');
    });
  });

  describe('error handling', () => {
    it('should handle storage errors when creating alerts', async () => {
      const riskAssessment = {
        score: 95,
        level: 'critical' as const,
        factors: ['High risk'],
        recommendations: ['Block'],
        requiresManualReview: true,
        confidence: 90,
        fraudProbability: 95,
        riskProfile: {
          deviceRisk: 30,
          behavioralRisk: 30,
          locationRisk: 20,
          velocityRisk: 15
        },
        alerts: []
      };

      vi.mocked(storage.createFraudAlert).mockRejectedValue(new Error('Database error'));

      const alerts = await FraudAlertService.processRiskAssessment(
        1,
        100,
        riskAssessment,
        '1000000'
      );

      // Should return empty array on error
      expect(alerts).toEqual([]);
    });

    it('should handle Redis broadcast errors gracefully', async () => {
      const riskAssessment = {
        score: 95,
        level: 'critical' as const,
        factors: ['Test'],
        recommendations: ['Test'],
        requiresManualReview: true,
        confidence: 90,
        fraudProbability: 95,
        riskProfile: {
          deviceRisk: 0,
          behavioralRisk: 0,
          locationRisk: 0,
          velocityRisk: 0
        },
        alerts: []
      };

      const mockAlert = {
        id: 1,
        userId: 1,
        transactionId: 100,
        alertType: 'critical_risk' as const,
        severity: 'critical' as const,
        title: 'Test',
        message: 'Test',
        riskScore: 95,
        riskFactors: [],
        metadata: {},
        status: 'active' as const,
        createdAt: new Date()
      };

      vi.mocked(storage.createFraudAlert).mockResolvedValue(mockAlert as any);
      vi.mocked(storage.getAllUsers).mockResolvedValue([
        { id: 1, username: 'admin', role: 'admin' } as any
      ]);
      vi.mocked(RedisService.isAvailable).mockReturnValue(true);
      vi.mocked(RedisService.instance.publish).mockRejectedValue(new Error('Redis error'));

      // Should still create alert even if broadcast fails
      const alerts = await FraudAlertService.processRiskAssessment(
        1,
        100,
        riskAssessment,
        '1000000'
      );

      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});
