/**
 * Unit Tests: NotificationService
 * Tests for user notification management and delivery
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../../server/services/NotificationService';
import { storage } from '../../server/storage';
import { RedisService } from '../../server/services/RedisService';

vi.mock('../../server/storage', () => ({
  storage: {
    createNotification: vi.fn(),
    getNotificationsByUser: vi.fn(),
    getNotification: vi.fn(),
    updateNotification: vi.fn(),
    deleteNotification: vi.fn(),
    markNotificationAsRead: vi.fn()
  }
}));
vi.mock('../../server/services/RedisService', () => ({
  RedisService: {
    isAvailable: vi.fn(),
    instance: {
      publish: vi.fn()
    }
  }
}));
vi.mock('../../server/utils/logger');

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const notificationData = {
        userId: 1,
        type: 'message' as const,
        title: 'New Message',
        message: 'You have a new message',
        metadata: { senderId: 2 }
      };

      const mockNotification = {
        id: 1,
        ...notificationData,
        isRead: false,
        createdAt: new Date()
      };

      vi.mocked(storage.createNotification).mockResolvedValue(mockNotification as any);

      const result = await NotificationService.createNotification(notificationData);

      expect(result).toBeDefined();
      expect(result.userId).toBe(1);
      expect(result.type).toBe('message');
      expect(storage.createNotification).toHaveBeenCalledWith(notificationData);
    });

    it('should broadcast notification via WebSocket', async () => {
      const notificationData = {
        userId: 1,
        type: 'payment' as const,
        title: 'Payment Received',
        message: 'Your payment was successful'
      };

      const mockNotification = {
        id: 1,
        ...notificationData,
        isRead: false,
        createdAt: new Date()
      };

      vi.mocked(storage.createNotification).mockResolvedValue(mockNotification as any);
      vi.mocked(RedisService.isAvailable).mockReturnValue(true);
      vi.mocked(RedisService.instance.publish).mockResolvedValue(1);

      await NotificationService.createNotification(notificationData);

      expect(RedisService.instance.publish).toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    it('should retrieve user notifications', async () => {
      const mockNotifications = [
        {
          id: 1,
          userId: 1,
          type: 'message',
          title: 'New Message',
          message: 'Test message',
          isRead: false,
          createdAt: new Date()
        },
        {
          id: 2,
          userId: 1,
          type: 'payment',
          title: 'Payment',
          message: 'Payment received',
          isRead: true,
          createdAt: new Date(Date.now() - 60000)
        }
      ];

      vi.mocked(storage.getNotificationsByUser).mockResolvedValue(mockNotifications as any);

      const result = await NotificationService.getUserNotifications(1);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe(1);
      expect(storage.getNotificationsByUser).toHaveBeenCalledWith(1);
    });

    it('should return empty array for user with no notifications', async () => {
      vi.mocked(storage.getNotificationsByUser).mockResolvedValue([]);

      const result = await NotificationService.getUserNotifications(999);

      expect(result).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = {
        id: 1,
        userId: 1,
        type: 'message' as const,
        title: 'Test',
        message: 'Test',
        isRead: false,
        createdAt: new Date()
      };

      const updatedNotification = {
        ...mockNotification,
        isRead: true
      };

      vi.mocked(storage.getNotification).mockResolvedValue(mockNotification as any);
      vi.mocked(storage.updateNotification).mockResolvedValue(updatedNotification as any);

      const result = await NotificationService.markAsRead(1, 1);

      expect(result?.isRead).toBe(true);
      expect(storage.updateNotification).toHaveBeenCalled();
    });

    it('should not update if notification already read', async () => {
      const mockNotification = {
        id: 1,
        userId: 1,
        type: 'message' as const,
        title: 'Test',
        message: 'Test',
        isRead: true,
        createdAt: new Date()
      };

      vi.mocked(storage.getNotification).mockResolvedValue(mockNotification as any);

      const result = await NotificationService.markAsRead(1, 1);

      expect(result?.isRead).toBe(true);
      expect(storage.updateNotification).not.toHaveBeenCalled();
    });

    it('should return null for non-existent notification', async () => {
      vi.mocked(storage.getNotification).mockResolvedValue(null);

      const result = await NotificationService.markAsRead(999, 1);

      expect(result).toBeNull();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      const mockNotifications = [
        { id: 1, userId: 1, isRead: false },
        { id: 2, userId: 1, isRead: false },
        { id: 3, userId: 1, isRead: true }
      ];

      vi.mocked(storage.getNotificationsByUser).mockResolvedValue(mockNotifications as any);
      vi.mocked(storage.updateNotification).mockResolvedValue({} as any);

      await NotificationService.markAllAsRead(1);

      // Should only update unread notifications
      expect(storage.updateNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUnreadCount', () => {
    it('should count unread notifications', async () => {
      const mockNotifications = [
        { id: 1, isRead: false },
        { id: 2, isRead: false },
        { id: 3, isRead: true },
        { id: 4, isRead: false }
      ];

      vi.mocked(storage.getNotificationsByUser).mockResolvedValue(mockNotifications as any);

      const count = await NotificationService.getUnreadCount(1);

      expect(count).toBe(3);
    });

    it('should return 0 for user with no notifications', async () => {
      vi.mocked(storage.getNotificationsByUser).mockResolvedValue([]);

      const count = await NotificationService.getUnreadCount(999);

      expect(count).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      const mockNotification = {
        id: 1,
        userId: 1,
        type: 'message' as const,
        title: 'Test',
        message: 'Test',
        isRead: true,
        createdAt: new Date()
      };

      vi.mocked(storage.getNotification).mockResolvedValue(mockNotification as any);
      vi.mocked(storage.deleteNotification).mockResolvedValue(true);

      const result = await NotificationService.deleteNotification(1, 1);

      expect(result).toBe(true);
      expect(storage.deleteNotification).toHaveBeenCalledWith(1);
    });

    it('should not delete notification belonging to another user', async () => {
      const mockNotification = {
        id: 1,
        userId: 2, // Different user
        type: 'message' as const,
        title: 'Test',
        message: 'Test',
        isRead: false,
        createdAt: new Date()
      };

      vi.mocked(storage.getNotification).mockResolvedValue(mockNotification as any);

      const result = await NotificationService.deleteNotification(1, 1);

      expect(result).toBe(false);
      expect(storage.deleteNotification).not.toHaveBeenCalled();
    });
  });

  describe('sendBulkNotifications', () => {
    it('should send notifications to multiple users', async () => {
      const userIds = [1, 2, 3];
      const notificationData = {
        type: 'system' as const,
        title: 'System Update',
        message: 'System maintenance scheduled'
      };

      vi.mocked(storage.createNotification).mockResolvedValue({} as any);

      await NotificationService.sendBulkNotifications(userIds, notificationData);

      expect(storage.createNotification).toHaveBeenCalledTimes(3);
    });

    it('should handle errors for individual notifications', async () => {
      const userIds = [1, 2, 3];
      const notificationData = {
        type: 'system' as const,
        title: 'Update',
        message: 'Test'
      };

      vi.mocked(storage.createNotification)
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({} as any);

      // Should not throw even if one fails
      await expect(
        NotificationService.sendBulkNotifications(userIds, notificationData)
      ).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle storage errors when creating notification', async () => {
      vi.mocked(storage.createNotification).mockRejectedValue(new Error('Database error'));

      await expect(
        NotificationService.createNotification({
          userId: 1,
          type: 'message',
          title: 'Test',
          message: 'Test'
        })
      ).rejects.toThrow('Database error');
    });

    it('should handle Redis errors gracefully', async () => {
      const notificationData = {
        userId: 1,
        type: 'message' as const,
        title: 'Test',
        message: 'Test'
      };

      vi.mocked(storage.createNotification).mockResolvedValue({ id: 1 } as any);
      vi.mocked(RedisService.isAvailable).mockReturnValue(true);
      vi.mocked(RedisService.instance.publish).mockRejectedValue(new Error('Redis error'));

      // Should still create notification even if broadcast fails
      await expect(
        NotificationService.createNotification(notificationData)
      ).resolves.toBeDefined();
    });
  });
});
