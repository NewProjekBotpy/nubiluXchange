import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/authorization';
import { FraudAlertService } from '../../services/FraudAlertService';
import { RedisService } from '../../services/RedisService';
import { logError } from '../../utils/logger';

const router = Router();

// Fraud Alert Management API Endpoints
router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;
    const severity = req.query.severity as string;
    const alertType = req.query.alertType as string;
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Get alerts from FraudAlertService
    let alerts = await FraudAlertService.getActiveAlerts(limit * 3, 0); // Get more for filtering
    
    // Apply filters
    if (status) {
      alerts = alerts.filter(alert => alert.status === status);
    }
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    if (alertType) {
      alerts = alerts.filter(alert => alert.alertType === alertType);
    }
    
    // Apply pagination after filtering
    const paginatedAlerts = alerts.slice(offset, offset + limit);
    
    res.json({
      alerts: paginatedAlerts,
      pagination: {
        page,
        limit,
        total: alerts.length,
        totalPages: Math.ceil(alerts.length / limit)
      }
    });
  } catch (error: any) {
    logError(error as Error, 'Get fraud alerts error:');
    res.status(500).json({ error: 'Failed to fetch fraud alerts' });
  }
});

router.get('/stats', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await FraudAlertService.getAlertStats();
    res.json(stats);
  } catch (error: any) {
    logError(error as Error, 'Get fraud alert stats error:');
    res.status(500).json({ error: 'Failed to fetch fraud alert statistics' });
  }
});

router.patch('/:id/acknowledge', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const alertId = parseInt(req.params.id);
    const adminUserId = req.userId!;
    
    if (isNaN(alertId)) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }
    
    const success = await FraudAlertService.acknowledgeAlert(alertId, adminUserId);
    
    if (success) {
      res.json({ message: 'Alert acknowledged successfully' });
    } else {
      res.status(404).json({ error: 'Alert not found or already processed' });
    }
  } catch (error: any) {
    logError(error as Error, 'Acknowledge fraud alert error:');
    res.status(500).json({ error: 'Failed to acknowledge fraud alert' });
  }
});

router.patch('/:id/resolve', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const alertId = parseInt(req.params.id);
    const adminUserId = req.userId!;
    const { resolution, note } = req.body;
    
    if (isNaN(alertId)) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }
    
    if (!['resolved', 'false_positive'].includes(resolution)) {
      return res.status(400).json({ error: 'Invalid resolution type. Must be "resolved" or "false_positive"' });
    }
    
    // Use different methods based on resolution type
    const success = resolution === 'false_positive' 
      ? await FraudAlertService.markAsFalsePositive(alertId, adminUserId, note)
      : await FraudAlertService.resolveAlert(alertId, adminUserId, note);
    
    if (success) {
      res.json({ message: `Alert ${resolution} successfully` });
    } else {
      res.status(404).json({ error: 'Alert not found or already processed' });
    }
  } catch (error: any) {
    logError(error as Error, 'Resolve fraud alert error:');
    res.status(500).json({ error: 'Failed to resolve fraud alert' });
  }
});

router.get('/notifications', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const adminUserId = req.userId!;
    
    // Get recent notifications for this admin from Redis
    if (RedisService.isAvailable()) {
      const notificationKey = `admin_notifications:${adminUserId}`;
      const notifications = await RedisService.instance.lrange(notificationKey, 0, 19); // Get last 20 notifications
      
      // Parse notification data
      const parsedNotifications = notifications.map(notification => {
        try {
          return JSON.parse(notification);
        } catch (error) {
          logError(error as Error, 'Failed to parse notification:');
          return null;
        }
      }).filter(Boolean);
      
      res.json({
        notifications: parsedNotifications,
        total: parsedNotifications.length,
        hasMore: false // For simplicity, not implementing pagination for notifications
      });
    } else {
      // Fallback when Redis is not available
      res.json({
        notifications: [],
        total: 0,
        hasMore: false,
        message: 'Real-time notifications unavailable - Redis not connected'
      });
    }
  } catch (error: any) {
    logError(error as Error, 'Get fraud alert notifications error:');
    res.status(500).json({ error: 'Failed to fetch fraud alert notifications' });
  }
});

export default router;
