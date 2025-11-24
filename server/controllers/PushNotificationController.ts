import { Router, Request, Response } from 'express';
import { PushNotificationService } from '../services/PushNotificationService';
import { insertPushSubscriptionSchema } from '@shared/schema';
import { requireAuth } from '../middleware/auth';
import { logInfo, logError } from '../utils/logger';
import { handleError, ErrorHandlers } from '../utils/error-handler';

const router = Router();

/**
 * Subscribe to push notifications
 */
router.post('/subscribe', requireAuth, async (req: Request, res: Response) => {
  try {
    const { subscription } = req.body;
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return ErrorHandlers.badRequest(res, 'Subscription must include endpoint and keys');
    }

    const success = await PushNotificationService.subscribe(req.userId!, subscription);
    
    if (success) {
      logInfo(`User ${req.userId} subscribed to push notifications`);
      res.json({ 
        success: true,
        message: 'Successfully subscribed to push notifications' 
      });
    } else {
      return ErrorHandlers.serverError(res, 'save push subscription');
    }
  } catch (error: any) {
    handleError(res, error, 'subscribe to push notifications');
  }
});

/**
 * Unsubscribe from push notifications
 */
router.post('/unsubscribe', requireAuth, async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return ErrorHandlers.missingField(res, 'endpoint');
    }

    const success = await PushNotificationService.unsubscribe(req.userId!, endpoint);
    
    if (success) {
      logInfo(`User ${req.userId} unsubscribed from push notifications`);
      res.json({ 
        success: true,
        message: 'Successfully unsubscribed from push notifications' 
      });
    } else {
      return ErrorHandlers.serverError(res, 'remove push subscription');
    }
  } catch (error: any) {
    handleError(res, error, 'unsubscribe from push notifications');
  }
});

/**
 * Get VAPID public key for client configuration
 */
router.get('/vapid-public-key', (req: Request, res: Response) => {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  
  if (!vapidPublicKey) {
    return ErrorHandlers.serverError(res, 'Push notifications are not configured');
  }
  
  res.json({ 
    publicKey: vapidPublicKey 
  });
});

/**
 * Test push notification (for development/testing)
 */
router.post('/test', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, message } = req.body;
    
    const success = await PushNotificationService.sendGeneralNotification(
      req.userId!,
      title || 'Test Notification',
      message || 'This is a test push notification',
      { type: 'test' }
    );
    
    if (success) {
      res.json({ 
        success: true,
        message: 'Test notification sent successfully' 
      });
    } else {
      return ErrorHandlers.notFound(res, 'active push subscriptions');
    }
  } catch (error: any) {
    handleError(res, error, 'send test push notification');
  }
});

export const pushNotificationController = router;