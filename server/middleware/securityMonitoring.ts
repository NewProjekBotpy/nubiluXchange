import { Request, Response, NextFunction } from "express";
import { SecurityAlertService } from "../services/SecurityAlertService";
import { BlacklistService } from "../services/BlacklistService";
import { storage } from "../storage";
import { logError } from "../utils/logger";

/**
 * Security monitoring middleware that tracks user activities
 * and detects suspicious behavior patterns
 */
export function securityMonitoring() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent') || '';
      const path = req.path;
      const method = req.method;

      // Skip monitoring for static assets and health checks
      if (path.startsWith('/assets') || 
          path.startsWith('/favicon') || 
          path === '/health' || 
          path === '/ping') {
        return next();
      }

      // Monitor login attempts
      if (path === '/api/auth/login' && method === 'POST') {
        // This will be handled in the auth controller after login result
        req.securityContext = {
          monitorLogin: true,
          userId,
          ipAddress,
          userAgent
        };
      }

      // Monitor admin panel access
      if (path.startsWith('/api/admin') && userId) {
        await SecurityAlertService.monitorUnusualActivity(
          userId,
          `admin_access_${path.replace('/api/admin/', '')}`,
          {
            path,
            method,
            timestamp: new Date().toISOString()
          },
          req
        );
      }

      // Monitor sensitive operations
      const sensitiveOperations = [
        '/api/users/promote',
        '/api/users/demote', 
        '/api/admin/blacklist',
        '/api/admin/configs',
        '/api/owner/'
      ];

      if (sensitiveOperations.some(op => path.startsWith(op)) && userId) {
        await SecurityAlertService.monitorUnusualActivity(
          userId,
          `sensitive_operation_${method.toLowerCase()}_${path.split('/').pop()}`,
          {
            path,
            method,
            body: req.body ? Object.keys(req.body) : [],
            timestamp: new Date().toISOString()
          },
          req
        );
      }

      // Check IP blacklist
      if (ipAddress) {
        try {
          const blacklistCheck = await BlacklistService.checkIpBlacklist(storage, ipAddress);
          if (blacklistCheck.isBlacklisted) {
            await SecurityAlertService.monitorBlacklistHit(
              'ip_address',
              ipAddress,
              {
                path,
                method,
                userAgent,
                blacklistEntries: blacklistCheck.entries
              },
              req
            );

            return res.status(403).json({
              error: 'Access denied',
              message: 'Your IP address has been blacklisted'
            });
          }
        } catch (error) {
          logError('Error checking IP blacklist', { error, context: 'securityMonitoring' });
          // Continue processing - don't block on blacklist check errors
        }
      }

      // Monitor file uploads
      if (path.includes('/upload') && method === 'POST' && userId) {
        await SecurityAlertService.monitorUnusualActivity(
          userId,
          'file_upload',
          {
            path,
            contentType: req.get('Content-Type'),
            contentLength: req.get('Content-Length'),
            timestamp: new Date().toISOString()
          },
          req
        );
      }

      next();
    } catch (error) {
      logError('Security monitoring error', { error, context: 'securityMonitoring' });
      // Don't block requests on monitoring errors
      next();
    }
  };
}

/**
 * Post-authentication security monitoring
 * Call this after successful/failed login attempts
 */
export async function monitorAuthAttempt(
  userId: number | null,
  email: string,
  success: boolean,
  req: Request
): Promise<void> {
  try {
    const ipAddress = req.ip || '';
    const userAgent = req.get('User-Agent') || '';

    if (success && userId) {
      await SecurityAlertService.monitorSuspiciousLogin(
        userId,
        ipAddress,
        userAgent,
        true,
        req
      );
    } else {
      // Failed login attempt
      await SecurityAlertService.monitorSuspiciousLogin(
        userId || 0, // Use 0 for failed attempts without valid user ID
        ipAddress,
        userAgent,
        false,
        req
      );

      // Also create a general security alert for failed attempts
      await SecurityAlertService.createAlert(
        'multiple_failed_attempts',
        'medium',
        `Failed login attempt for email: ${email}`,
        {
          email,
          ipAddress,
          userAgent,
          timestamp: new Date().toISOString()
        },
        userId || undefined,
        req
      );
    }
  } catch (error) {
    logError('Error monitoring auth attempt', { error, context: 'monitorAuthAttempt' });
  }
}

/**
 * Monitor user verification activities
 */
export async function monitorVerificationActivity(
  userId: number,
  activity: string,
  details: Record<string, any>,
  req: Request
): Promise<void> {
  try {
    await SecurityAlertService.monitorUnusualActivity(
      userId,
      `verification_${activity}`,
      {
        ...details,
        timestamp: new Date().toISOString()
      },
      req
    );
  } catch (error) {
    logError('Error monitoring verification activity', { error, context: 'monitorVerificationActivity' });
  }
}

/**
 * Monitor admin actions on users
 */
export async function monitorAdminAction(
  adminId: number,
  action: string,
  targetUserId?: number,
  details: Record<string, any> = {},
  req?: Request
): Promise<void> {
  try {
    await SecurityAlertService.monitorUnusualActivity(
      adminId,
      `admin_action_${action}`,
      {
        targetUserId,
        ...details,
        timestamp: new Date().toISOString()
      },
      req
    );

    // Create alert for sensitive admin actions
    const criticalActions = ['delete_user', 'promote_to_admin', 'blacklist_user', 'ban_user'];
    if (criticalActions.includes(action)) {
      await SecurityAlertService.createAlert(
        'admin_privilege_escalation',
        'high',
        `Admin performed critical action: ${action}`,
        {
          adminId,
          action,
          targetUserId,
          ...details
        },
        adminId,
        req
      );
    }
  } catch (error) {
    logError('Error monitoring admin action', { error, context: 'monitorAdminAction' });
  }
}

// Extend Request interface to include security context
declare global {
  namespace Express {
    interface Request {
      securityContext?: {
        monitorLogin?: boolean;
        userId?: number;
        ipAddress?: string;
        userAgent?: string;
      };
    }
  }
}