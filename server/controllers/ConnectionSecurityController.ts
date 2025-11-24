import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/authorization";
import { ConnectionSecurityService } from "../services/ConnectionSecurityService";
import { logInfo } from "../utils/logger";
import { UserRepository } from "../repositories/UserRepository";
import { handleError, ErrorHandlers } from "../utils/error-handler";

const userRepository = new UserRepository();
const router = Router();

/**
 * Get connection security metrics
 */
router.get('/metrics', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const metrics = ConnectionSecurityService.getConnectionMetrics();
    res.json(metrics);
  } catch (error: any) {
    handleError(res, error, 'get connection security metrics');
  }
});

/**
 * Get security alerts
 */
router.get('/alerts', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const alerts = ConnectionSecurityService.getActiveAlerts();
    res.json(alerts);
  } catch (error: any) {
    handleError(res, error, 'get connection security alerts');
  }
});

/**
 * Get active connections
 */
router.get('/connections', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Get real active connections from service
    const activeConnections = ConnectionSecurityService.getActiveConnections();
    
    // Transform to match frontend interface by adding user details
    const connections = await Promise.all(
      activeConnections.map(async (conn) => {
        // Get user details from storage for display
        let username = 'Unknown';
        let displayName = 'Unknown User';
        
        try {
          const user = await userRepository.getUser(conn.userId);
          if (user) {
            username = user.username;
            displayName = user.displayName || user.username;
          }
        } catch (error) {
          // User not found, use defaults
        }
        
        return {
          userId: conn.userId,
          username,
          displayName,
          ipAddress: conn.ipAddress,
          userAgent: conn.userAgent,
          isSecure: conn.isSecure,
          country: conn.country,
          city: conn.city,
          isVPN: conn.isVPN,
          sessionId: conn.sessionId,
          connectedAt: conn.connectedAt.toISOString(),
          lastActivity: conn.lastActivity.toISOString(),
          riskScore: conn.riskScore
        };
      })
    );

    res.json(connections);
  } catch (error: any) {
    handleError(res, error, 'get active connections');
  }
});

/**
 * Resolve security alert
 */
router.patch('/alerts/:alertId/resolve', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const adminId = req.userId!;
    
    const success = ConnectionSecurityService.resolveAlert(alertId, adminId);
    
    if (success) {
      logInfo(`Connection security alert ${alertId} resolved by admin ${adminId}`);
      res.json({ 
        success: true,
        message: 'Alert resolved successfully' 
      });
    } else {
      return ErrorHandlers.notFound(res, 'alert');
    }
  } catch (error: any) {
    handleError(res, error, 'resolve security alert');
  }
});

/**
 * Check current connection security
 */
router.get('/check', requireAuth, async (req: Request, res: Response) => {
  try {
    const validation = await ConnectionSecurityService.validateConnectionSecurity(req);
    const sslCheck = ConnectionSecurityService.checkSSLSecurity(req);
    
    res.json({
      ...validation,
      ssl: sslCheck,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });
  } catch (error: any) {
    handleError(res, error, 'check connection security');
  }
});

export { router as connectionSecurityRouter };