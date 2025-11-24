import { NotificationRepository } from "../repositories/NotificationRepository";
import { insertNotificationSchema } from "@shared/schema";
import { logError, logWarning, logInfo, logDebug } from '../utils/logger';
import type { Request } from "express";
import { RedisService } from "./RedisService";

const notificationRepo = new NotificationRepository();

export class NotificationService {
  static async createNotification(notificationData: any) {
    try {
      const validatedData = insertNotificationSchema.parse(notificationData);
      const notification = await notificationRepo.createNotification(validatedData);
      
      // Broadcast notification via WebSocket if Redis is available
      if (RedisService.isAvailable()) {
        try {
          await RedisService.instance.publish(
            `notifications:${notification.userId}`,
            JSON.stringify(notification)
          );
        } catch (error) {
          logError(error, 'Failed to broadcast notification', { service: 'NotificationService', userId: notification.userId });
        }
      }
      
      return notification;
    } catch (error: any) {
      logError(error, 'Create notification error', { service: 'NotificationService' });
      
      if (error.name === 'ZodError') {
        throw new Error('Invalid notification data. Please check your input.');
      }
      
      throw new Error('Failed to create notification. Please try again.');
    }
  }

  static async getUserNotifications(userId: number) {
    try {
      return await notificationRepo.getNotificationsByUser(userId);
    } catch (error: any) {
      logError(error, 'Get user notifications error', { service: 'NotificationService', userId });
      throw new Error('Failed to retrieve notifications. Please try again.');
    }
  }

  static async markAsRead(notificationId: number, userId: number) {
    try {
      const notification = await notificationRepo.getNotification(notificationId);
      
      if (!notification) {
        return null;
      }
      
      if (notification.userId !== userId) {
        return null;
      }
      
      if (notification.isRead) {
        return notification;
      }
      
      return await notificationRepo.updateNotification(notificationId, { isRead: true });
    } catch (error: any) {
      logError(error, 'Mark notification as read error', { service: 'NotificationService', notificationId, userId });
      throw new Error('Failed to mark notification as read. Please try again.');
    }
  }

  static async markAllAsRead(userId: number) {
    try {
      const notifications = await notificationRepo.getNotificationsByUser(userId);
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      for (const notification of unreadNotifications) {
        await notificationRepo.updateNotification(notification.id, { isRead: true });
      }
      
      return { count: unreadNotifications.length };
    } catch (error: any) {
      logError(error, 'Mark all notifications as read error', { service: 'NotificationService', userId });
      throw new Error('Failed to mark all notifications as read. Please try again.');
    }
  }

  static async getUnreadCount(userId: number) {
    try {
      const notifications = await notificationRepo.getNotificationsByUser(userId);
      return notifications.filter(n => !n.isRead).length;
    } catch (error: any) {
      logError(error, 'Get unread count error', { service: 'NotificationService', userId });
      throw new Error('Failed to retrieve unread notification count. Please try again.');
    }
  }

  static async sendBulkNotifications(userIds: number[], notificationData: any) {
    try {
      const results = [];
      
      for (const userId of userIds) {
        try {
          const notification = await this.createNotification({
            ...notificationData,
            userId
          });
          results.push(notification);
        } catch (error) {
          logError(error, `Failed to send notification to user ${userId}`, { service: 'NotificationService', userId });
          // Continue with other users even if one fails
        }
      }
      
      return results;
    } catch (error: any) {
      logError(error, 'Send bulk notifications error', { service: 'NotificationService', userIdsCount: userIds?.length });
      throw new Error('Failed to send bulk notifications. Please try again.');
    }
  }

  static async markNotificationAsRead(notificationId: number, userId: number) {
    try {
      // Verify notification belongs to user
      const notifications = await notificationRepo.getNotificationsByUser(userId);
      const notification = notifications.find(n => n.id === notificationId);
      
      if (!notification) {
        throw new Error('Notification not found or access denied');
      }
      
      await notificationRepo.markNotificationAsRead(notificationId);
      return { message: 'Notification marked as read' };
    } catch (error: any) {
      logError(error, 'Mark notification as read error (duplicate method)', { service: 'NotificationService', notificationId, userId });
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        throw error;
      }
      
      throw new Error('Failed to mark notification as read. Please try again.');
    }
  }

  static async markAllNotificationsAsRead(userId: number) {
    try {
      const notifications = await notificationRepo.getNotificationsByUser(userId);
      
      // Mark all unread notifications as read
      const unreadNotifications = notifications.filter(n => !n.isRead);
      for (const notification of unreadNotifications) {
        await notificationRepo.markNotificationAsRead(notification.id);
      }
      
      return { 
        message: 'All notifications marked as read',
        count: unreadNotifications.length
      };
    } catch (error: any) {
      logError(error, 'Mark all notifications as read error (duplicate method)', { service: 'NotificationService', userId });
      throw new Error('Failed to mark all notifications as read. Please try again.');
    }
  }

  static async deleteNotification(notificationId: number, userId: number) {
    try {
      const notification = await notificationRepo.getNotification(notificationId);
      
      if (!notification) {
        return false;
      }
      
      if (notification.userId !== userId) {
        return false;
      }
      
      await notificationRepo.deleteNotification(notificationId);
      return true;
    } catch (error: any) {
      logError(error, 'Delete notification error', { service: 'NotificationService', notificationId, userId });
      throw new Error('Failed to delete notification. Please try again.');
    }
  }

  static async createSystemNotification(
    userId: number,
    title: string,
    message: string,
    type: 'info' | 'warning' | 'success' | 'error' = 'info'
  ) {
    try {
      return await this.createNotification({
        userId,
        title,
        message,
        type,
        data: {}
      });
    } catch (error: any) {
      logError(error, 'Create system notification error', { service: 'NotificationService', userId, title, type });
      throw new Error('Failed to create system notification. Please try again.');
    }
  }

  static async createTransactionNotification(
    userId: number,
    transactionId: number,
    type: 'payment_completed' | 'payment_failed' | 'escrow_created' | 'escrow_completed'
  ) {
    try {
      let title = '';
      let message = '';
      
      switch (type) {
        case 'payment_completed':
          title = 'Payment Completed';
          message = `Your payment has been processed successfully.`;
          break;
        case 'payment_failed':
          title = 'Payment Failed';
          message = `Your payment could not be processed. Please try again.`;
          break;
        case 'escrow_created':
          title = 'Escrow Created';
          message = `An escrow transaction has been created.`;
          break;
        case 'escrow_completed':
          title = 'Escrow Completed';
          message = `Your escrow transaction has been completed.`;
          break;
      }
      
      return await this.createNotification({
        userId,
        title,
        message,
        type: 'info',
        data: { transactionId, notificationType: type }
      });
    } catch (error: any) {
      logError(error, 'Create transaction notification error', { service: 'NotificationService', userId, transactionId, notificationType: type });
      throw new Error('Failed to create transaction notification. Please try again.');
    }
  }

  static async createChatNotification(
    userId: number,
    chatId: number,
    messageContent: string,
    senderName: string
  ) {
    try {
      return await this.createNotification({
        userId,
        title: 'New Message',
        message: `${senderName}: ${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}`,
        type: 'info',
        data: { chatId, notificationType: 'new_message' }
      });
    } catch (error: any) {
      logError(error, 'Create chat notification error', { service: 'NotificationService', userId, chatId, senderName });
      throw new Error('Failed to create chat notification. Please try again.');
    }
  }
}
