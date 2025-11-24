/**
 * Unit Tests: Activity Logger
 * Tests for activity logging utility functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  logUserActivity,
  logPostingActivity,
  logTransactionActivity,
  logChatActivity,
  logAIResponseActivity,
  logQRISPaymentActivity
} from '../../server/utils/activity-logger';
import { storage } from '../../server/storage';
import type { Request } from 'express';

// Mock dependencies
vi.mock('../../server/storage');

describe('Activity Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logUserActivity', () => {
    it('should log user activity successfully', async () => {
      const mockRequest = {
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('Mozilla/5.0')
      } as unknown as Request;

      vi.mocked(storage.createAdminActivityLog).mockResolvedValue({
        id: 1,
        userId: 123,
        action: 'login',
        category: 'user_action',
        details: { test: 'data' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        status: 'success',
        createdAt: new Date()
      } as any);

      await logUserActivity(123, 'login', 'user_action', { test: 'data' }, undefined, mockRequest);

      expect(storage.createAdminActivityLog).toHaveBeenCalledWith({
        userId: 123,
        adminId: undefined,
        action: 'login',
        category: 'user_action',
        details: { test: 'data' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        status: 'success'
      });
    });

    it('should handle null userId', async () => {
      await logUserActivity(null, 'system_check', 'system_action');

      expect(storage.createAdminActivityLog).toHaveBeenCalledWith({
        userId: undefined,
        adminId: undefined,
        action: 'system_check',
        category: 'system_action',
        details: {},
        ipAddress: undefined,
        userAgent: undefined,
        status: 'success'
      });
    });

    it('should handle logging errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(storage.createAdminActivityLog).mockRejectedValue(new Error('Database error'));

      await logUserActivity(123, 'test', 'user_action');

      expect(consoleError).toHaveBeenCalledWith('Failed to log user activity:', expect.any(Error));
      consoleError.mockRestore();
    });

    it('should log with custom status', async () => {
      await logUserActivity(123, 'failed_login', 'user_action', {}, undefined, undefined, 'error');

      expect(storage.createAdminActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error'
        })
      );
    });
  });

  describe('logPostingActivity', () => {
    it('should log posting activity', async () => {
      await logPostingActivity(123, 'product', 456);

      expect(storage.createAdminActivityLog).toHaveBeenCalledWith({
        userId: 123,
        adminId: undefined,
        action: 'posting',
        category: 'user_action',
        details: expect.objectContaining({
          postType: 'product',
          postId: 456,
          timestamp: expect.any(String)
        }),
        ipAddress: undefined,
        userAgent: undefined,
        status: 'success'
      });
    });

    it('should log posting with request metadata', async () => {
      const mockRequest = {
        ip: '192.168.1.1',
        get: vi.fn().mockReturnValue('Chrome')
      } as unknown as Request;

      await logPostingActivity(123, 'news', 789, mockRequest);

      expect(storage.createAdminActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Chrome'
        })
      );
    });
  });

  describe('logTransactionActivity', () => {
    it('should log transaction activity', async () => {
      await logTransactionActivity(123, 'purchase', 999, '500000', 'completed');

      expect(storage.createAdminActivityLog).toHaveBeenCalledWith({
        userId: 123,
        adminId: undefined,
        action: 'transaction',
        category: 'user_action',
        details: expect.objectContaining({
          transactionType: 'purchase',
          transactionId: 999,
          amount: '500000',
          status: 'completed',
          timestamp: expect.any(String)
        }),
        ipAddress: undefined,
        userAgent: undefined,
        status: 'success'
      });
    });

    it('should log failed transaction', async () => {
      await logTransactionActivity(123, 'refund', 111, '100000', 'failed');

      expect(storage.createAdminActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            status: 'failed'
          })
        })
      );
    });
  });

  describe('logChatActivity', () => {
    it('should log chat activity with message ID', async () => {
      await logChatActivity(123, 'send_message', 5, 888);

      expect(storage.createAdminActivityLog).toHaveBeenCalledWith({
        userId: 123,
        adminId: undefined,
        action: 'chat',
        category: 'user_action',
        details: expect.objectContaining({
          chatAction: 'send_message',
          chatId: 5,
          messageId: 888,
          timestamp: expect.any(String)
        }),
        ipAddress: undefined,
        userAgent: undefined,
        status: 'success'
      });
    });

    it('should log chat activity without message ID', async () => {
      await logChatActivity(123, 'create_chat', 10);

      expect(storage.createAdminActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            chatAction: 'create_chat',
            chatId: 10,
            messageId: undefined
          })
        })
      );
    });
  });

  describe('logAIResponseActivity', () => {
    it('should log AI response with truncated prompt and response', async () => {
      const longPrompt = 'A'.repeat(300);
      const longResponse = 'B'.repeat(600);

      await logAIResponseActivity(123, 'generate_poster', longPrompt, longResponse, 1500);

      expect(storage.createAdminActivityLog).toHaveBeenCalledWith({
        userId: 123,
        adminId: undefined,
        action: 'ai_response',
        category: 'ai_action',
        details: expect.objectContaining({
          aiAction: 'generate_poster',
          prompt: longPrompt.substring(0, 200),
          response: longResponse.substring(0, 500),
          processingTime: 1500,
          timestamp: expect.any(String)
        }),
        ipAddress: undefined,
        userAgent: undefined,
        status: 'success'
      });
    });

    it('should log AI response without processing time', async () => {
      await logAIResponseActivity(123, 'chat_moderation', 'test prompt', 'test response');

      expect(storage.createAdminActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            processingTime: undefined
          })
        })
      );
    });
  });

  describe('logQRISPaymentActivity', () => {
    it('should log QRIS payment activity', async () => {
      await logQRISPaymentActivity(123, 'scan', 'ORDER-12345', '250000', 'pending');

      expect(storage.createAdminActivityLog).toHaveBeenCalledWith({
        userId: 123,
        adminId: undefined,
        action: 'qris_payment',
        category: 'user_action',
        details: expect.objectContaining({
          paymentAction: 'scan',
          paymentId: 'ORDER-12345',
          amount: '250000',
          status: 'pending',
          timestamp: expect.any(String)
        }),
        ipAddress: undefined,
        userAgent: undefined,
        status: 'success'
      });
    });
  });
});
