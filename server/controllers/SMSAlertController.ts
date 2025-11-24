import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/authorization";
import { SMSAlertService } from "../services/SMSAlertService";
import { SecurityAlertService } from "../services/SecurityAlertService";
import { UserRepository } from "../repositories/UserRepository";
import { SystemRepository } from "../repositories/SystemRepository";
import { logInfo } from "../utils/logger";
import { z } from "zod";
import { hasAdminAccess } from "@shared/auth-utils";
import { handleError, ErrorHandlers } from "../utils/error-handler";

const userRepository = new UserRepository();
const systemRepository = new SystemRepository();

const router = Router();

// Validation schemas
const testSMSSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  message: z.string().min(5).max(200),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('low')
});

const updatePhoneSchema = z.object({
  phoneNumber: z.string().min(10).max(15).optional()
});

const testAlertSchema = z.object({
  alertType: z.enum([
    'suspicious_login',
    'payment_fraud', 
    'unusual_activity',
    'blacklist_hit',
    'admin_privilege_escalation'
  ])
});

/**
 * Get SMS configuration status
 */
router.get('/config', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const status = SMSAlertService.getStatus();
    
    res.json({
      configured: status.configured,
      ready: status.ready,
      accountSid: process.env.TWILIO_ACCOUNT_SID ? 
        process.env.TWILIO_ACCOUNT_SID.substring(0, 8) + '...' : 
        undefined,
      fromPhone: process.env.TWILIO_FROM_PHONE || undefined
    });
  } catch (error: any) {
    handleError(res, error, 'get SMS config status');
  }
});

/**
 * Get admin users with phone numbers
 */
router.get('/admin-users', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const allUsers = await userRepository.getAllUsers();
    const adminUsers = allUsers.filter(user => 
      hasAdminAccess(user)
    );

    const usersWithPhone = adminUsers.map(user => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isAdminApproved: user.isAdminApproved
    }));

    res.json(usersWithPhone);
  } catch (error: any) {
    handleError(res, error, 'get admin users');
  }
});

/**
 * Test SMS functionality
 */
router.post('/test', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message, priority } = testSMSSchema.parse(req.body);
    
    const success = await SMSAlertService.sendSystemAlert(
      phoneNumber,
      'SMS Test from NXE Admin Panel',
      message,
      priority
    );

    if (success) {
      logInfo(`SMS test sent successfully to ${phoneNumber} by admin ${req.userId}`);
      res.json({ 
        success: true,
        message: 'SMS test sent successfully' 
      });
    } else {
      return ErrorHandlers.serverError(res, 'send SMS test. Check SMS configuration');
    }
  } catch (error: any) {
    handleError(res, error, 'send SMS test');
  }
});

/**
 * Update admin phone number
 */
router.patch('/admin-users/:userId/phone', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { phoneNumber } = updatePhoneSchema.parse(req.body);
    
    if (isNaN(userId)) {
      return ErrorHandlers.badRequest(res, 'User ID must be a valid number');
    }

    // Verify user exists and is admin/owner
    const user = await userRepository.getUser(userId);
    if (!user) {
      return ErrorHandlers.notFound(res, 'user');
    }

    // Use helper function for consistent role checking
    if (!hasAdminAccess(user)) {
      return ErrorHandlers.accessDenied(res, 'Can only update phone numbers for approved admin users');
    }

    // Update phone number
    await userRepository.updateUser(userId, { phoneNumber: phoneNumber || null });

    logInfo(`Admin phone number updated for user ${userId} by admin ${req.userId}`);
    
    res.json({ 
      success: true,
      message: 'Phone number updated successfully' 
    });
  } catch (error: any) {
    handleError(res, error, 'update admin phone number');
  }
});

/**
 * Trigger test security alert
 */
router.post('/test-alert', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { alertType } = testAlertSchema.parse(req.body);
    
    const testAlerts: Record<string, { severity: any, description: string }> = {
      'suspicious_login': {
        severity: 'medium' as const,
        description: 'TEST: Suspicious login attempt detected from new location'
      },
      'payment_fraud': {
        severity: 'critical' as const,
        description: 'TEST: Potential payment fraud detected - high risk transaction'
      },
      'unusual_activity': {
        severity: 'medium' as const,
        description: 'TEST: Unusual activity pattern detected - rapid API requests'
      },
      'blacklist_hit': {
        severity: 'high' as const,
        description: 'TEST: Blacklisted IP address attempted to access admin panel'
      },
      'admin_privilege_escalation': {
        severity: 'critical' as const,
        description: 'TEST: Potential privilege escalation attempt detected'
      }
    };

    const alertConfig = testAlerts[alertType];
    if (!alertConfig) {
      return ErrorHandlers.badRequest(res, 'The specified alert type is not supported');
    }

    // Create test security alert
    const alert = await SecurityAlertService.createAlert(
      alertType as any,
      alertConfig.severity,
      alertConfig.description,
      {
        isTest: true,
        triggeredBy: req.userId,
        timestamp: new Date().toISOString()
      },
      req.userId,
      req
    );

    logInfo(`Test security alert triggered: ${alertType} by admin ${req.userId}`);
    
    res.json({ 
      success: true,
      message: 'Test alert triggered successfully',
      alertId: alert.id
    });
  } catch (error: any) {
    handleError(res, error, 'trigger test alert');
  }
});

/**
 * Get SMS logs from database
 */
router.get('/logs', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { phoneNumber, status, alertType, limit, offset } = req.query;
    
    const filters: any = {};
    
    if (phoneNumber && typeof phoneNumber === 'string') {
      filters.phoneNumber = phoneNumber;
    }
    
    if (status && typeof status === 'string') {
      filters.status = status;
    }
    
    if (alertType && typeof alertType === 'string') {
      filters.alertType = alertType;
    }
    
    if (limit && typeof limit === 'string') {
      filters.limit = parseInt(limit);
    }
    
    if (offset && typeof offset === 'string') {
      filters.offset = parseInt(offset);
    }

    const logs = await systemRepository.getSmsLogs(filters);
    
    const formattedLogs = logs.map(log => ({
      id: log.id.toString(),
      timestamp: log.createdAt?.toISOString() || new Date().toISOString(),
      phoneNumber: log.phoneNumber,
      message: log.message,
      status: log.status,
      priority: log.priority,
      alertType: log.alertType,
      errorMessage: log.errorMessage,
      sentAt: log.sentAt?.toISOString()
    }));

    res.json(formattedLogs);
  } catch (error: any) {
    handleError(res, error, 'get SMS logs');
  }
});

export { router as smsAlertRouter };