import { Router, Request, Response } from "express";
import { NotificationService } from "../services/NotificationService";
import { requireAuth } from "../middleware/auth";
import { handleError } from "../utils/error-handler";

export const notificationController = Router();

// Get user notifications
notificationController.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const notifications = await NotificationService.getUserNotifications(req.userId!);
    res.json(notifications);
  } catch (error: any) {
    handleError(res, error, 'Get user notifications');
  }
});

// Mark notification as read
notificationController.patch('/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    const result = await NotificationService.markNotificationAsRead(notificationId, req.userId!);
    res.json(result);
  } catch (error: any) {
    handleError(res, error, 'Mark notification as read');
  }
});

// Delete notification
notificationController.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    const result = await NotificationService.deleteNotification(notificationId, req.userId!);
    res.json(result);
  } catch (error: any) {
    handleError(res, error, 'Delete notification');
  }
});

// Mark all notifications as read
notificationController.patch('/mark-all-read', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await NotificationService.markAllNotificationsAsRead(req.userId!);
    res.json(result);
  } catch (error: any) {
    handleError(res, error, 'Mark all notifications as read');
  }
});