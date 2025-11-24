import { Router } from 'express';
import { notificationController } from '../controllers/NotificationController';
import { pushNotificationController } from '../controllers/PushNotificationController';

const router = Router();

// Notification routes
router.use('/', notificationController);

// Push notification routes (mounted at /push-notifications separately in index.ts)
export { pushNotificationController };

export default router;
