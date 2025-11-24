import { AdminRepository } from "../repositories/AdminRepository";
import { UserRepository } from "../repositories/UserRepository";
import { NotificationRepository } from "../repositories/NotificationRepository";
import { logUserActivity } from "../utils/activity-logger";

const adminRepo = new AdminRepository();
const userRepo = new UserRepository();
const notificationRepo = new NotificationRepository();
import { logError, logWarning, logInfo, logDebug } from '../utils/logger';
import { SMSAlertService } from "./SMSAlertService";
import type { InsertSecurityAlert } from "@shared/schema";
import type { Request } from "express";
import { hasAdminAccess } from "@shared/auth-utils";

export interface SecurityAlert {
  id?: number;
  type: 'suspicious_login' | 'multiple_failed_attempts' | 'unusual_activity' | 'blacklist_hit' | 'admin_privilege_escalation' | 'data_breach_attempt' | 'payment_fraud';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  description: string;
  details: Record<string, any> | null;
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  detectedAt: Date | null;
  resolvedAt?: Date | null;
  resolvedBy?: number | null;
  createdAt?: Date | null;
}

export interface SecurityMetrics {
  totalAlerts: number;
  activeAlerts: number;
  criticalAlerts: number;
  resolvedToday: number;
  averageResolutionTime: number;
  topThreatTypes: Array<{ type: string; count: number }>;
  suspiciousIPs: Array<{ ip: string; alertCount: number; lastSeen: Date }>;
}

export class SecurityAlertService {
  private static readonly ALERT_THRESHOLDS = {
    MAX_FAILED_LOGINS: 5,
    MAX_REQUESTS_PER_MINUTE: 100,
    SUSPICIOUS_LOGIN_WINDOW: 30 * 60 * 1000, // 30 minutes
    IP_REPUTATION_THRESHOLD: 10
  };

  /**
   * Create a new security alert
   */
  static async createAlert(
    type: SecurityAlert['type'],
    severity: SecurityAlert['severity'],
    description: string,
    details: Record<string, any>,
    userId?: number,
    req?: Request
  ): Promise<SecurityAlert> {
    const alert: InsertSecurityAlert = {
      type,
      severity,
      userId: userId || undefined,
      ipAddress: req?.ip || undefined,
      userAgent: req?.get('User-Agent') || undefined,
      description,
      details: details || {},
      status: 'active'
    };

    // Store alert in database
    const createdAlert = await adminRepo.createSecurityAlert(alert as any);

    // Log the security event
    await logUserActivity(
      userId || null,
      'security_alert_created',
      'system_action',
      {
        alertType: type,
        severity,
        description,
        details,
        alertId: createdAlert.id
      },
      undefined,
      req,
      'warning'
    );

    // For critical alerts, notify admins immediately via SMS and push
    if (severity === 'critical') {
      await this.notifyAdmins(createdAlert as any);
    }
    
    // For high severity alerts, also send SMS
    if (severity === 'high' || severity === 'critical') {
      await SMSAlertService.notifyAdminsViaPhone(createdAlert as any);
    }

    logWarning(`🔒 Security Alert [${severity.toUpperCase()}]: ${description}`, {
      service: 'SecurityAlertService',
      type,
      userId,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      details,
      alertId: createdAlert.id
    });

    return createdAlert as any;
  }

  /**
   * Monitor for suspicious login patterns
   */
  static async monitorSuspiciousLogin(
    userId: number,
    ipAddress: string,
    userAgent: string,
    isSuccess: boolean,
    req?: Request
  ): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.ALERT_THRESHOLDS.SUSPICIOUS_LOGIN_WINDOW;

    // Check for multiple failed attempts
    if (!isSuccess) {
      const recentFailures = await this.getRecentFailedAttempts(userId, windowStart);
      
      if (recentFailures >= this.ALERT_THRESHOLDS.MAX_FAILED_LOGINS) {
        await this.createAlert(
          'multiple_failed_attempts',
          'high',
          `${recentFailures} failed login attempts detected for user ${userId}`,
          {
            userId,
            failedAttempts: recentFailures,
            timeWindow: '30 minutes',
            ipAddress,
            userAgent
          },
          userId,
          req
        );
      }
    }

    // Check for logins from new locations/devices
    if (isSuccess) {
      const isNewDevice = await this.isNewDevice(userId, userAgent);
      const isNewLocation = await this.isNewLocation(userId, ipAddress);

      if (isNewDevice || isNewLocation) {
        await this.createAlert(
          'suspicious_login',
          'medium',
          `Login from ${isNewDevice ? 'new device' : ''} ${isNewDevice && isNewLocation ? 'and' : ''} ${isNewLocation ? 'new location' : ''}`,
          {
            userId,
            newDevice: isNewDevice,
            newLocation: isNewLocation,
            ipAddress,
            userAgent,
            loginTime: new Date().toISOString()
          },
          userId,
          req
        );
      }
    }
  }

  /**
   * Monitor for unusual activity patterns
   */
  static async monitorUnusualActivity(
    userId: number,
    action: string,
    details: Record<string, any>,
    req?: Request
  ): Promise<void> {
    // Check for rapid fire actions
    const rapidActions = await this.checkRapidActions(userId, action);
    if (rapidActions > this.ALERT_THRESHOLDS.MAX_REQUESTS_PER_MINUTE) {
      await this.createAlert(
        'unusual_activity',
        'medium',
        `Unusual activity pattern: ${rapidActions} ${action} actions in 1 minute`,
        {
          userId,
          action,
          actionsPerMinute: rapidActions,
          details
        },
        userId,
        req
      );
    }

    // Check for privilege escalation attempts
    if (action.includes('admin') || action.includes('owner') || action.includes('role')) {
      await this.createAlert(
        'admin_privilege_escalation',
        'critical',
        `Potential privilege escalation attempt: ${action}`,
        {
          userId,
          action,
          details,
          timestamp: new Date().toISOString()
        },
        userId,
        req
      );
    }
  }

  /**
   * Monitor for blacklist hits
   */
  static async monitorBlacklistHit(
    type: 'user' | 'product' | 'keyword' | 'ip_address',
    value: string,
    details: Record<string, any>,
    req?: Request
  ): Promise<void> {
    await this.createAlert(
      'blacklist_hit',
      'high',
      `Blacklist hit detected: ${type} - ${value}`,
      {
        blacklistType: type,
        blacklistValue: value,
        details,
        timestamp: new Date().toISOString()
      },
      undefined,
      req
    );
  }

  /**
   * Get security metrics for dashboard
   */
  static async getSecurityMetrics(): Promise<SecurityMetrics> {
    const alerts = await adminRepo.getSecurityAlerts();
    const activeAlerts = await adminRepo.getActiveSecurityAlerts();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const resolvedToday = alerts.filter(alert => 
      alert.status === 'resolved' && 
      alert.resolvedAt && 
      alert.resolvedAt >= today
    ).length;
    
    const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical').length;
    
    // Calculate average resolution time
    const resolvedAlerts = alerts.filter(alert => alert.status === 'resolved' && alert.resolvedAt && alert.detectedAt);
    const avgResolutionTime = resolvedAlerts.length > 0 ? 
      resolvedAlerts.reduce((sum, alert) => {
        const resolutionTime = alert.resolvedAt!.getTime() - alert.detectedAt!.getTime();
        return sum + (resolutionTime / (1000 * 60 * 60)); // Convert to hours
      }, 0) / resolvedAlerts.length : 0;
    
    // Group by threat types
    const threatTypeCounts = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topThreatTypes = Object.entries(threatTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Group by IP addresses
    const ipCounts = alerts.reduce((acc, alert) => {
      if (alert.ipAddress) {
        acc[alert.ipAddress] = (acc[alert.ipAddress] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const suspiciousIPs = Object.entries(ipCounts)
      .filter(([, count]) => count > 2) // Only IPs with more than 2 alerts
      .map(([ip, alertCount]) => ({
        ip,
        alertCount,
        lastSeen: alerts
          .filter(alert => alert.ipAddress === ip && alert.detectedAt)
          .sort((a, b) => (b.detectedAt?.getTime() || 0) - (a.detectedAt?.getTime() || 0))[0]
          ?.detectedAt || new Date()
      }))
      .sort((a, b) => b.alertCount - a.alertCount)
      .slice(0, 10);
    
    return {
      totalAlerts: alerts.length,
      activeAlerts: activeAlerts.length,
      criticalAlerts,
      resolvedToday,
      averageResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      topThreatTypes,
      suspiciousIPs
    };
  }

  /**
   * Resolve a security alert
   */
  static async resolveAlert(
    alertId: number,
    resolvedBy: number,
    status: 'resolved' | 'false_positive',
    notes?: string
  ): Promise<void> {
    // Update alert in database
    await adminRepo.updateSecurityAlert(alertId, {
      status,
      resolvedAt: new Date(),
      resolvedBy
    });

    await logUserActivity(
      resolvedBy,
      'security_alert_resolved',
      'user_action',
      {
        alertId,
        status,
        notes,
        resolvedAt: new Date().toISOString()
      }
    );

    logInfo(`🔒 Security Alert ${alertId} ${status} by user ${resolvedBy}`, { service: 'SecurityAlertService', alertId, status, resolvedBy });
  }

  // Helper methods
  private static async getRecentFailedAttempts(userId: number, since: number): Promise<number> {
    try {
      const sinceDate = new Date(since);
      const logs = await adminRepo.getAdminActivityLogs({
        userId,
        action: 'login_failed',
        createdAtFrom: sinceDate
      });
      return logs.length;
    } catch (error) {
      logError(error, 'Error getting recent failed attempts', { service: 'SecurityAlertService', userId });
      return 0;
    }
  }

  private static async isNewDevice(userId: number, userAgent: string): Promise<boolean> {
    try {
      // Get recent successful login activities for this user
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const loginLogs = await adminRepo.getAdminActivityLogs({
        userId,
        action: 'login_success',
        createdAtFrom: oneDayAgo
      });
      
      // Check if this user agent has been seen before in login logs
      const deviceSeen = loginLogs.some(log => 
        log.userAgent && log.userAgent === userAgent
      );
      
      return !deviceSeen;
    } catch (error) {
      logError(error, 'Error checking new device', { service: 'SecurityAlertService', userId, userAgent });
      return false;
    }
  }

  private static async isNewLocation(userId: number, ipAddress: string): Promise<boolean> {
    try {
      // Get recent successful login activities for this user
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const loginLogs = await adminRepo.getAdminActivityLogs({
        userId,
        action: 'login_success',
        createdAtFrom: oneDayAgo
      });
      
      // Check if this IP address has been seen before in login logs
      const locationSeen = loginLogs.some(log => 
        log.ipAddress && log.ipAddress === ipAddress
      );
      
      return !locationSeen;
    } catch (error) {
      logError(error, 'Error checking new location', { service: 'SecurityAlertService', userId, ipAddress });
      return false;
    }
  }

  private static async checkRapidActions(userId: number, action: string): Promise<number> {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const logs = await adminRepo.getAdminActivityLogs({
        userId,
        action,
        createdAtFrom: oneMinuteAgo
      });
      return logs.length;
    } catch (error) {
      logError(error, 'Error checking rapid actions', { service: 'SecurityAlertService', userId, action });
      return 0;
    }
  }

  private static async notifyAdmins(alert: SecurityAlert): Promise<void> {
    // Send push notifications to admins
    try {
      const allUsers = await userRepo.getAllUsers();
      const admins = allUsers.filter(user => 
        hasAdminAccess(user)
      );

      // Create notifications for admins
      for (const admin of admins) {
        await notificationRepo.createNotification({
          userId: admin.id,
          title: `🔒 Security Alert: ${alert.type.replace(/_/g, ' ').toUpperCase()}`,
          message: alert.description,
          type: alert.severity === 'critical' ? 'error' : 'warning',
          metadata: { 
            alertId: alert.id,
            severity: alert.severity,
            alertType: alert.type 
          }
        });
      }

      logError(new Error(`SECURITY ALERT [${alert.severity.toUpperCase()}]: ${alert.description}`), 'Security alert notification', { 
        service: 'SecurityAlertService', 
        alertId: alert.id,
        severity: alert.severity,
        type: alert.type
      });
    } catch (error: any) {
      logError(error, 'Failed to notify admins', { service: 'SecurityAlertService', alertId: alert.id });
    }
  }
}