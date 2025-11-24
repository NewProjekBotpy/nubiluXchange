/**
 * Unit Tests: PaymentService
 * Tests for payment service methods including Midtrans integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from '../../server/services/PaymentService';
import { storage } from '../../server/storage';
import * as paymentUtils from '../../server/utils/payment';
import { db } from '../../server/db';
import crypto from 'crypto';

// Helper to generate valid Midtrans webhook signature
function generateWebhookSignature(orderId: string, statusCode: string, grossAmount: string): string {
  const serverKey = 'test-server-key-12345';
  const payload = orderId + statusCode + grossAmount + serverKey;
  return crypto.createHash('sha512').update(payload).digest('hex');
}

// Mock dependencies
vi.mock('../../server/storage');
vi.mock('../../server/utils/payment');
vi.mock('../../server/utils/activity-logger');
vi.mock('../../server/services/EscrowRiskService');
vi.mock('../../server/services/FraudAlertService');
vi.mock('../../server/services/RedisService');
vi.mock('../../server/db', () => ({
  db: {
    transaction: vi.fn()
  },
  pool: {
    query: vi.fn(),
    connect: vi.fn()
  }
}));

describe('PaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variable for webhook signature verification
    process.env.MIDTRANS_SERVER_KEY = 'test-server-key-12345';
  });

  describe('createMidtransPayment', () => {
    it('should create payment with valid data', async () => {
      const { EscrowRiskService } = await import('../../server/services/EscrowRiskService');
      
      const paymentData = {
        amount: 100000,
        productId: 1,
        paymentMethod: 'qris',
        payment_type: 'qris'
      };

      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      };

      const mockSnapToken = 'snap_token_123';

      // Mock EscrowRiskService.assessTransactionRisk
      vi.mocked(EscrowRiskService.assessTransactionRisk).mockResolvedValue({
        score: 25,
        level: 'low',
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
      });

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(storage.getTransactionsByUser).mockResolvedValue([]);
      vi.mocked(storage.getProduct).mockResolvedValue({
        id: 1,
        title: 'Test Product',
        price: '100000'
      } as any);
      
      (paymentUtils.snap as any) = {
        createTransaction: vi.fn().mockResolvedValue({ token: mockSnapToken })
      };

      vi.mocked(storage.createTransaction).mockResolvedValue({
        id: 1,
        orderId: 'ORDER-123',
        snapToken: mockSnapToken
      } as any);

      const result = await PaymentService.createMidtransPayment(paymentData, 1);

      expect(result.snapToken).toBe(mockSnapToken);
      expect(storage.createTransaction).toHaveBeenCalled();
    });

    it('should throw error for invalid amount', async () => {
      const paymentData = {
        amount: -1000,
        productId: 1,
        paymentMethod: 'qris',
        payment_type: 'qris'
      };

      await expect(PaymentService.createMidtransPayment(paymentData, 1))
        .rejects.toThrow();
    });

    it('should throw error when payment service unavailable', async () => {
      const paymentData = {
        amount: 100000,
        productId: 1,
        paymentMethod: 'qris',
        payment_type: 'qris'
      };

      (paymentUtils.snap as any) = null;

      await expect(PaymentService.createMidtransPayment(paymentData, 1))
        .rejects.toThrow('Payment service is currently unavailable');
    });

    it('should validate user exists before processing', async () => {
      const paymentData = {
        amount: 100000,
        productId: 1,
        paymentMethod: 'qris',
        payment_type: 'qris'
      };

      vi.mocked(storage.getUser).mockResolvedValue(null);
      (paymentUtils.snap as any) = {};

      await expect(PaymentService.createMidtransPayment(paymentData, 999))
        .rejects.toThrow('User account not found');
    });
  });

  describe('handleMidtransWebhook', () => {
    it('should process settlement webhook correctly', async () => {
      const { db } = await import('../../server/db');
      
      const webhookData = {
        order_id: 'ORDER-123',
        transaction_id: 'TXN-123',
        transaction_status: 'settlement',
        status_code: '200',
        gross_amount: '100000.00',
        payment_type: 'qris',
        signature_key: generateWebhookSignature('ORDER-123', '200', '100000.00')
      };

      const mockTransaction = {
        id: 1,
        paymentId: 'ORDER-123',
        buyerId: 1,
        amount: '100000',
        status: 'pending',
        metadata: {}
      };

      const updatedTransaction = { ...mockTransaction, status: 'completed' };

      vi.mocked(storage.getTransactionByPaymentId).mockResolvedValue(mockTransaction as any);
      
      // Mock db.transaction to execute callback and return result
      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return callback({
          update: () => ({
            set: () => ({
              where: () => ({
                returning: () => Promise.resolve([updatedTransaction])
              })
            })
          }),
          insert: () => ({
            values: () => Promise.resolve()
          })
        });
      });

      const result = await PaymentService.handleMidtransWebhook(webhookData);

      expect(result.status).toBe('completed');
    });

    it('should handle pending webhook', async () => {
      const { db } = await import('../../server/db');
      
      const webhookData = {
        order_id: 'ORDER-124',
        transaction_id: 'TXN-124',
        transaction_status: 'pending',
        status_code: '201',
        gross_amount: '100000.00',
        payment_type: 'qris',
        signature_key: generateWebhookSignature('ORDER-124', '201', '100000.00')
      };

      const mockTransaction = {
        id: 2,
        paymentId: 'ORDER-124',
        buyerId: 1,
        amount: '100000',
        status: 'pending',
        metadata: {}
      };

      const updatedTransaction = { ...mockTransaction, status: 'pending' };

      vi.mocked(storage.getTransactionByPaymentId).mockResolvedValue(mockTransaction as any);
      
      // Mock db.transaction to execute callback and return result
      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return callback({
          update: () => ({
            set: () => ({
              where: () => ({
                returning: () => Promise.resolve([updatedTransaction])
              })
            })
          })
        });
      });

      const result = await PaymentService.handleMidtransWebhook(webhookData);

      expect(result.status).toBe('pending');
    });

    it('should handle failed/denied webhook', async () => {
      const { db } = await import('../../server/db');
      
      const webhookData = {
        order_id: 'ORDER-125',
        transaction_id: 'TXN-125',
        transaction_status: 'deny',
        status_code: '400',
        gross_amount: '100000.00',
        payment_type: 'qris',
        signature_key: generateWebhookSignature('ORDER-125', '400', '100000.00')
      };

      const mockTransaction = {
        id: 3,
        paymentId: 'ORDER-125',
        buyerId: 1,
        amount: '100000',
        status: 'pending',
        metadata: {}
      };

      const updatedTransaction = { ...mockTransaction, status: 'failed' };

      vi.mocked(storage.getTransactionByPaymentId).mockResolvedValue(mockTransaction as any);
      
      // Mock db.transaction to execute callback and return result
      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return callback({
          update: () => ({
            set: () => ({
              where: () => ({
                returning: () => Promise.resolve([updatedTransaction])
              })
            })
          })
        });
      });

      const result = await PaymentService.handleMidtransWebhook(webhookData);

      expect(result.status).toBe('failed');
    });
  });

  describe('getUserTransactions', () => {
    it('should return user transaction history', async () => {
      const userId = 1;
      const mockTransactions = [
        { id: 1, paymentId: 'ORDER-1', amount: '100000', status: 'completed' },
        { id: 2, paymentId: 'ORDER-2', amount: '50000', status: 'pending' }
      ];

      vi.mocked(storage.getTransactionsByUser).mockResolvedValue(mockTransactions as any);

      const result = await PaymentService.getUserTransactions(userId);

      expect(result).toEqual(mockTransactions);
      expect(storage.getTransactionsByUser).toHaveBeenCalledWith(userId);
    });
  });

  describe('getUserWalletBalance', () => {
    it('should return user wallet balance', async () => {
      const userId = 1;
      const mockBalance = '150000';

      vi.mocked(storage.getWalletBalance).mockResolvedValue(mockBalance);

      const result = await PaymentService.getUserWalletBalance(userId);

      expect(result).toBe(mockBalance);
      expect(storage.getWalletBalance).toHaveBeenCalledWith(userId);
    });
  });
});
