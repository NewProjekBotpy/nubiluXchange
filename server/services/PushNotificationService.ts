import webpush from 'web-push';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { logInfo, logError } from '../utils/logger';

const notificationRepo = new NotificationRepository();

export class PushNotificationService {
  private static isConfigured = false;
  private static configurationAttempted = false;

  private static configure() {
    if (this.configurationAttempted) {
      return; // Don't attempt configuration multiple times
    }
    this.configurationAttempted = true;

    // VAPID keys configuration - require from environment variables
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@nxe-marketplace.com';

    logInfo(`VAPID configuration check - PUBLIC: ${vapidPublicKey ? 'present' : 'missing'}, PRIVATE: ${vapidPrivateKey ? 'present' : 'missing'}`);

    if (!vapidPublicKey || !vapidPrivateKey) {
      logInfo('🔧 VAPID keys not configured - push notifications disabled (development mode)');
      logInfo('💡 To enable push notifications: Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables');
      this.isConfigured = false;
      return;
    }

    try {
      webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
      this.isConfigured = true;
      logInfo('✅ Push notification service configured successfully');
    } catch (error: any) {
      logError(error, 'Failed to configure push notification service');
      this.isConfigured = false;
    }
  }

  /**
   * Initialize push notification service (call this during server startup)
   */
  static initialize(): void {
    this.configure();
  }

  /**
   * Send push notification for new chat message
   */
  static async sendChatNotification(
    recipientId: number,
    senderName: string,
    messageContent: string,
    chatId: number
  ): Promise<boolean> {
    if (!this.isConfigured) {
      logError(new Error('Push notifications not configured'), 'Push notification service not configured');
      return false;
    }

    try {
      // Get user's push subscriptions
      const subscriptions = await notificationRepo.getPushSubscriptionsByUserId(recipientId);
      
      if (!subscriptions || subscriptions.length === 0) {
        logInfo(`No push subscriptions found for user ${recipientId}`);
        return false;
      }

      const notificationPayload = {
        title: `💬 Pesan baru dari ${senderName}`,
        body: messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: {
          type: 'chat_message',
          chatId: chatId,
          senderId: senderName,
          url: `/chat/${chatId}`,
          timestamp: Date.now()
        },
        actions: [
          {
            action: 'reply',
            title: 'Balas'
          },
          {
            action: 'view',
            title: 'Lihat Chat'
          }
        ],
        requireInteraction: true,
        vibrate: [200, 100, 200]
      };

      const promises = subscriptions.map(async (subscription: any) => {
        try {
          // Convert database row to web-push format
          const webPushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          };
          
          await webpush.sendNotification(
            webPushSubscription,
            JSON.stringify(notificationPayload),
            {
              TTL: 24 * 60 * 60, // 24 hours
              urgency: 'normal'
            }
          );
          logInfo(`Push notification sent successfully to user ${recipientId}`);
          return true;
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription expired or invalid, remove it
            await notificationRepo.removePushSubscription(subscription.endpoint);
            logInfo(`Removed expired push subscription for user ${recipientId}`);
          } else {
            logError(error, `Failed to send push notification to user ${recipientId}`);
          }
          return false;
        }
      });

      const results = await Promise.allSettled(promises);
      const successCount = results.filter((result: any) => result.status === 'fulfilled' && result.value).length;
      
      return successCount > 0;
    } catch (error: any) {
      logError(error, `Error sending chat notification to user ${recipientId}`);
      return false;
    }
  }

  /**
   * Send push notification for general notifications
   */
  static async sendGeneralNotification(
    userId: number,
    title: string,
    body: string,
    data: any = {}
  ): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      const subscriptions = await notificationRepo.getPushSubscriptionsByUserId(userId);
      
      if (!subscriptions || subscriptions.length === 0) {
        return false;
      }

      const notificationPayload = {
        title,
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: {
          type: 'general',
          timestamp: Date.now(),
          ...data
        }
      };

      const promises = subscriptions.map(async (subscription: any) => {
        try {
          // Convert database row to web-push format
          const webPushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          };
          
          await webpush.sendNotification(
            webPushSubscription,
            JSON.stringify(notificationPayload)
          );
          return true;
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            await notificationRepo.removePushSubscription(subscription.endpoint);
          }
          return false;
        }
      });

      const results = await Promise.allSettled(promises);
      const successCount = results.filter((result: any) => result.status === 'fulfilled' && result.value).length;
      
      return successCount > 0;
    } catch (error: any) {
      logError(error, `Error sending general notification to user ${userId}`);
      return false;
    }
  }

  /**
   * Subscribe user to push notifications
   */
  static async subscribe(userId: number, subscription: any): Promise<boolean> {
    if (!this.isConfigured) {
      logError(new Error('Push notification service not configured'), 'Cannot subscribe user to push notifications');
      return false;
    }

    try {
      await notificationRepo.savePushSubscription(userId, subscription);
      logInfo(`User ${userId} subscribed to push notifications`);
      return true;
    } catch (error: any) {
      logError(error, `Failed to subscribe user ${userId} to push notifications`);
      return false;
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  static async unsubscribe(userId: number, endpoint: string): Promise<boolean> {
    try {
      await notificationRepo.removePushSubscription(endpoint);
      logInfo(`User ${userId} unsubscribed from push notifications`);
      return true;
    } catch (error: any) {
      logError(error, `Failed to unsubscribe user ${userId} from push notifications`);
      return false;
    }
  }
}