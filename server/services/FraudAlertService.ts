import { AdminRepository } from '../repositories/AdminRepository';
import { UserRepository } from '../repositories/UserRepository';
import { logInfo, logError } from '../utils/logger';

const adminRepo = new AdminRepository();
const userRepo = new UserRepository();
import { logUserActivity } from '../utils/activity-logger';
import { RedisService } from './RedisService';
import { EscrowRiskService, type RiskAssessment } from './EscrowRiskService';
import type { Request } from 'express';
import { hasAdminAccess } from '@shared/auth-utils';

export interface FraudAlert {
  id?: number;
  userId: number;
  transactionId?: number | null;
  alertType: 'high_risk' | 'critical_risk' | 'velocity' | 'device_suspicious' | 'behavioral_anomaly' | 'manual_review';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  riskScore: number;
  riskFactors: string[];
  metadata: Record<string, any> | null;
  status: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
  assignedTo?: number | null; // Admin user ID
  acknowledgedBy?: number | null;
  acknowledgedAt?: Date | null;
  resolvedBy?: number | null;
  resolvedAt?: Date | null;
  resolutionNote?: string | null;
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface AlertStats {
  totalActive: number;
  totalToday: number;
  highPriority: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  averageResponseTime: number; // in minutes
  falsePositiveRate: number; // percentage
}

export interface RealTimeAlert {
  alertId: number;
  type: 'fraud_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  userId: number;
  transactionId?: number;
  riskScore: number;
  timestamp: string;
  requiresAction: boolean;
}

export class FraudAlertService {
  private static readonly SEVERITY_THRESHOLDS = {
    LOW: 25,
    MEDIUM: 50,
    HIGH: 75,
    CRITICAL: 90
  };

  private static readonly ALERT_RETENTION_DAYS = 90;
  private static alertQueue: FraudAlert[] = []; // In-memory queue when Redis unavailable
  private static directBroadcastCallback: ((alert: RealTimeAlert) => void) | null = null; // Fallback for when Redis is unavailable
  
  /**
   * Register a direct broadcast callback for when Redis is not available
   * This is used by the WebSocket server to receive alerts directly
   */
  static registerDirectBroadcast(callback: (alert: RealTimeAlert) => void): void {
    this.directBroadcastCallback = callback;
    logInfo('Direct broadcast callback registered for fraud alerts');
  }
  
  /**
   * Unregister the direct broadcast callback
   */
  static unregisterDirectBroadcast(): void {
    this.directBroadcastCallback = null;
    logInfo('Direct broadcast callback unregistered for fraud alerts');
  }
  
  /**
   * Main entry point: Analyze risk assessment and create alerts if needed
   */
  static async processRiskAssessment(
    userId: number,
    transactionId: number | undefined,
    riskAssessment: RiskAssessment,
    transactionAmount: string,
    req?: Request
  ): Promise<FraudAlert[]> {
    try {
      const alerts: FraudAlert[] = [];

      // Generate alerts based on risk assessment
      if (riskAssessment.level === 'critical' || riskAssessment.score >= this.SEVERITY_THRESHOLDS.CRITICAL) {
        alerts.push(await this.createCriticalRiskAlert(userId, transactionId, riskAssessment, transactionAmount, req));
      } else if (riskAssessment.level === 'high' || riskAssessment.score >= this.SEVERITY_THRESHOLDS.HIGH) {
        alerts.push(await this.createHighRiskAlert(userId, transactionId, riskAssessment, transactionAmount, req));
      }

      // Generate specific alerts based on risk factors
      const specificAlerts = await this.generateSpecificAlerts(userId, transactionId, riskAssessment, req);
      alerts.push(...specificAlerts);

      // Store and broadcast all alerts
      const storedAlerts: FraudAlert[] = [];
      for (const alert of alerts) {
        const storedAlert = await this.storeAlert(alert);
        await this.broadcastAlert(storedAlert);
        await this.logAlertActivity(storedAlert, req);
        storedAlerts.push(storedAlert);
      }

      return storedAlerts;

    } catch (error) {
      logError(error, `Failed to process risk assessment for user ${userId}`);
      return [];
    }
  }

  /**
   * Create critical risk alert
   */
  private static async createCriticalRiskAlert(
    userId: number,
    transactionId: number | undefined,
    riskAssessment: RiskAssessment,
    transactionAmount: string,
    req?: Request
  ): Promise<FraudAlert> {
    return {
      userId,
      transactionId,
      alertType: 'critical_risk',
      severity: 'critical',
      title: '🚨 Critical Fraud Risk Detected',
      message: `High-risk transaction blocked - Score: ${riskAssessment.score}/100. Factors: ${riskAssessment.factors.slice(0, 3).join(', ')}${riskAssessment.factors.length > 3 ? '...' : ''}`,
      riskScore: riskAssessment.score,
      riskFactors: riskAssessment.factors,
      metadata: {
        transactionAmount,
        fraudProbability: riskAssessment.fraudProbability,
        confidence: riskAssessment.confidence,
        riskProfile: riskAssessment.riskProfile,
        ipAddress: req?.ip || 'unknown',
        userAgent: req?.headers['user-agent'] || 'unknown',
        alerts: riskAssessment.alerts
      },
      status: 'active',
      createdAt: new Date()
    };
  }

  /**
   * Create high risk alert
   */
  private static async createHighRiskAlert(
    userId: number,
    transactionId: number | undefined,
    riskAssessment: RiskAssessment,
    transactionAmount: string,
    req?: Request
  ): Promise<FraudAlert> {
    return {
      userId,
      transactionId,
      alertType: 'high_risk',
      severity: 'high',
      title: '⚠️ High Fraud Risk Detected',
      message: `High-risk transaction requires review - Score: ${riskAssessment.score}/100. Manual review ${riskAssessment.requiresManualReview ? 'required' : 'recommended'}.`,
      riskScore: riskAssessment.score,
      riskFactors: riskAssessment.factors,
      metadata: {
        transactionAmount,
        fraudProbability: riskAssessment.fraudProbability,
        confidence: riskAssessment.confidence,
        riskProfile: riskAssessment.riskProfile,
        requiresManualReview: riskAssessment.requiresManualReview,
        ipAddress: req?.ip || 'unknown',
        userAgent: req?.headers['user-agent'] || 'unknown'
      },
      status: 'active',
      createdAt: new Date()
    };
  }

  /**
   * Generate specific alerts based on risk factors
   */
  private static async generateSpecificAlerts(
    userId: number,
    transactionId: number | undefined,
    riskAssessment: RiskAssessment,
    req?: Request
  ): Promise<FraudAlert[]> {
    const alerts: FraudAlert[] = [];
    const factors = riskAssessment.factors.join(' ').toLowerCase();

    // Velocity alerts
    if (factors.includes('velocity') || factors.includes('rapid')) {
      alerts.push({
        userId,
        transactionId,
        alertType: 'velocity',
        severity: 'medium',
        title: '📊 High Transaction Velocity',
        message: 'User showing unusually high transaction frequency patterns',
        riskScore: riskAssessment.riskProfile.velocityRisk,
        riskFactors: riskAssessment.factors.filter(f => f.toLowerCase().includes('velocity') || f.toLowerCase().includes('rapid')),
        metadata: {
          velocityScore: riskAssessment.riskProfile.velocityRisk,
          detectionTime: new Date().toISOString()
        },
        status: 'active',
        createdAt: new Date()
      });
    }

    // Device suspicious alerts
    if (factors.includes('bot') || factors.includes('proxy') || factors.includes('device')) {
      alerts.push({
        userId,
        transactionId,
        alertType: 'device_suspicious',
        severity: 'high',
        title: '🔍 Suspicious Device Activity',
        message: 'Suspicious device or connection patterns detected',
        riskScore: riskAssessment.riskProfile.deviceRisk,
        riskFactors: riskAssessment.factors.filter(f => 
          f.toLowerCase().includes('bot') || 
          f.toLowerCase().includes('proxy') || 
          f.toLowerCase().includes('device') ||
          f.toLowerCase().includes('automated')
        ),
        metadata: {
          deviceScore: riskAssessment.riskProfile.deviceRisk,
          userAgent: req?.headers['user-agent'] || 'unknown',
          ipAddress: req?.ip || 'unknown'
        },
        status: 'active',
        createdAt: new Date()
      });
    }

    // Behavioral anomaly alerts
    if (factors.includes('behavioral') || factors.includes('unusual') || factors.includes('anomaly')) {
      alerts.push({
        userId,
        transactionId,
        alertType: 'behavioral_anomaly',
        severity: 'medium',
        title: '🧠 Behavioral Anomaly Detected',
        message: 'User behavior significantly deviates from established patterns',
        riskScore: riskAssessment.riskProfile.behavioralRisk,
        riskFactors: riskAssessment.factors.filter(f => 
          f.toLowerCase().includes('behavioral') || 
          f.toLowerCase().includes('unusual') ||
          f.toLowerCase().includes('anomaly') ||
          f.toLowerCase().includes('pattern')
        ),
        metadata: {
          behavioralScore: riskAssessment.riskProfile.behavioralRisk,
          analysisDetails: 'Statistical deviation from user baseline'
        },
        status: 'active',
        createdAt: new Date()
      });
    }

    return alerts;
  }

  /**
   * Store alert in database and cache
   */
  private static async storeAlert(alert: FraudAlert): Promise<FraudAlert> {
    try {
      // Store in database permanently
      const storedAlert = await adminRepo.createFraudAlert({
        userId: alert.userId,
        transactionId: alert.transactionId || undefined,
        alertType: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        riskScore: alert.riskScore,
        riskFactors: alert.riskFactors,
        metadata: alert.metadata || {},
        status: alert.status,
        assignedTo: alert.assignedTo
      });
      
      // Cache in Redis for quick access (optional for performance)
      if (RedisService.isAvailable()) {
        const alertKey = `fraud_alert:${storedAlert.id}`;
        await RedisService.instance.setex(
          alertKey, 
          86400 * this.ALERT_RETENTION_DAYS, 
          JSON.stringify(storedAlert)
        );
        
        // Add to active alerts list
        const activeAlertsKey = 'fraud_alerts:active';
        await RedisService.instance.lpush(activeAlertsKey, alertKey);
        await RedisService.instance.expire(activeAlertsKey, 86400 * this.ALERT_RETENTION_DAYS);
      }

      logInfo(`Fraud alert stored in database for user ${alert.userId}: ${alert.title}`);
      return storedAlert as FraudAlert;

    } catch (error) {
      logError(error, `Failed to store fraud alert for user ${alert.userId}`);
      throw error;
    }
  }

  /**
   * Broadcast alert via WebSocket to admin users
   */
  private static async broadcastAlert(alert: FraudAlert): Promise<void> {
    try {
      const realTimeAlert: RealTimeAlert = {
        alertId: alert.id || Date.now(),
        type: 'fraud_alert',
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        userId: alert.userId,
        transactionId: alert.transactionId || undefined,
        riskScore: alert.riskScore,
        timestamp: (alert.createdAt || new Date()).toISOString(),
        requiresAction: alert.severity === 'critical' || alert.alertType === 'manual_review'
      };

      // Broadcast to admin users via WebSocket (implement this in your WebSocket service)
      await this.notifyAdminUsers(realTimeAlert);

      // Broadcast via Redis pub/sub for horizontal scaling if available
      if (RedisService.isAvailable()) {
        await RedisService.instance.publish('fraud_alerts', JSON.stringify(realTimeAlert));
        logInfo(`Fraud alert broadcasted via Redis: ${alert.title} for user ${alert.userId}`);
      } 
      // Fallback: Use direct callback if Redis is not available
      else if (this.directBroadcastCallback) {
        this.directBroadcastCallback(realTimeAlert);
        logInfo(`Fraud alert broadcasted via direct callback: ${alert.title} for user ${alert.userId}`);
      } else {
        logInfo(`Fraud alert stored but not broadcasted (no Redis or direct callback): ${alert.title} for user ${alert.userId}`);
      }

    } catch (error) {
      logError(error, `Failed to broadcast fraud alert for user ${alert.userId}`);
    }
  }

  /**
   * Notify admin users about the alert
   */
  private static async notifyAdminUsers(alert: RealTimeAlert): Promise<void> {
    try {
      // Get all admin users
      const adminUsers = await userRepo.getAllUsers(); // You might want a more specific method for admins
      const admins = adminUsers.filter(user => hasAdminAccess(user));

      // Send notification to each admin
      for (const admin of admins) {
        // This would integrate with your WebSocket service
        // For now, just log the notification intent
        logInfo(`Fraud alert notification sent to admin ${admin.id}: ${alert.title}`);
        
        // Store notification for admin dashboard
        if (RedisService.isAvailable()) {
          const notificationKey = `admin_notifications:${admin.id}`;
          await RedisService.instance.lpush(notificationKey, JSON.stringify(alert));
          await RedisService.instance.ltrim(notificationKey, 0, 99); // Keep only last 100 notifications
          await RedisService.instance.expire(notificationKey, 86400 * 7); // 7 days
        }
      }

    } catch (error) {
      logError(error, 'Failed to notify admin users about fraud alert');
    }
  }

  /**
   * Log alert activity for audit trail
   */
  private static async logAlertActivity(alert: FraudAlert, req?: Request): Promise<void> {
    try {
      await logUserActivity(
        alert.userId,
        'fraud_alert_created',
        'system_action',
        {
          alertType: alert.alertType,
          severity: alert.severity,
          riskScore: alert.riskScore,
          transactionId: alert.transactionId,
          factorCount: alert.riskFactors.length,
          requiresAction: alert.severity === 'critical'
        },
        undefined,
        req
      );

    } catch (error) {
      logError(error, `Failed to log fraud alert activity for user ${alert.userId}`);
    }
  }

  /**
   * Get active alerts for admin dashboard
   */
  static async getActiveAlerts(limit: number = 50, offset: number = 0): Promise<FraudAlert[]> {
    try {
      // Use database storage as primary source
      const alerts = await adminRepo.getFraudAlerts({
        status: 'active',
        limit,
        offset
      });
      
      return alerts as FraudAlert[];

    } catch (error) {
      logError(error, 'Failed to get active alerts from database');
      
      // Fallback to in-memory alerts if database fails
      try {
        return this.alertQueue
          .filter(alert => alert.status === 'active')
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(offset, offset + limit);
      } catch (fallbackError) {
        logError(fallbackError, 'Failed to get alerts from fallback storage');
        return [];
      }
    }
  }

  /**
   * Get alert statistics for dashboard
   */
  static async getAlertStats(): Promise<AlertStats> {
    try {
      // Use database storage to get comprehensive stats
      const stats = await adminRepo.getFraudAlertStats();
      return stats;

    } catch (error) {
      logError(error, 'Failed to get alert statistics from database');
      
      // Fallback to calculating from active alerts
      try {
        const activeAlerts = await this.getActiveAlerts(1000);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayAlerts = activeAlerts.filter(alert => 
          alert.createdAt && new Date(alert.createdAt) >= today
        );

        const byType: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        let totalResponseTime = 0;
        let respondedAlerts = 0;
        let falsePositives = 0;

        activeAlerts.forEach(alert => {
          byType[alert.alertType] = (byType[alert.alertType] || 0) + 1;
          byStatus[alert.status] = (byStatus[alert.status] || 0) + 1;
          
          if (alert.status === 'resolved' && alert.acknowledgedAt && alert.resolvedAt) {
            const responseTime = new Date(alert.resolvedAt).getTime() - new Date(alert.acknowledgedAt).getTime();
            totalResponseTime += responseTime / (1000 * 60);
            respondedAlerts++;
          }
          
          if (alert.status === 'false_positive') {
            falsePositives++;
          }
        });

        return {
          totalActive: activeAlerts.filter(a => a.status === 'active').length,
          totalToday: todayAlerts.length,
          highPriority: activeAlerts.filter(a => a.severity === 'high' || a.severity === 'critical').length,
          byType,
          byStatus,
          averageResponseTime: respondedAlerts > 0 ? totalResponseTime / respondedAlerts : 0,
          falsePositiveRate: activeAlerts.length > 0 ? (falsePositives / activeAlerts.length) * 100 : 0
        };
      } catch (fallbackError) {
        logError(fallbackError, 'Failed to calculate alert statistics from fallback');
        return {
          totalActive: 0,
          totalToday: 0,
          highPriority: 0,
          byType: {},
          byStatus: {},
          averageResponseTime: 0,
          falsePositiveRate: 0
        };
      }
    }
  }

  /**
   * Acknowledge an alert
   */
  static async acknowledgeAlert(alertId: number, adminUserId: number): Promise<FraudAlert | null> {
    try {
      // Use database storage to acknowledge alert
      const success = await adminRepo.acknowledgeFraudAlert(alertId, adminUserId);
      
      if (success) {
        logInfo(`Fraud alert ${alertId} acknowledged by admin ${adminUserId}`);
        
        // Update Redis cache if available
        if (RedisService.isAvailable()) {
          try {
            const alertKey = `fraud_alert:${alertId}`;
            const alertData = await RedisService.instance.get(alertKey);
            if (alertData) {
              const alert = JSON.parse(alertData) as FraudAlert;
              alert.status = 'acknowledged';
              alert.acknowledgedBy = adminUserId;
              alert.acknowledgedAt = new Date();
              await RedisService.instance.setex(alertKey, 86400 * this.ALERT_RETENTION_DAYS, JSON.stringify(alert));
            }
          } catch (cacheError) {
            logError(cacheError, 'Failed to update cache after acknowledging alert');
          }
        }
        
        // Return updated alert
        return await adminRepo.getFraudAlert(alertId) as FraudAlert || null;
      }
      
      return null;

    } catch (error) {
      logError(error, `Failed to acknowledge alert ${alertId}`);
      return null;
    }
  }

  /**
   * Resolve an alert
   */
  static async resolveAlert(
    alertId: number, 
    adminUserId: number, 
    note?: string
  ): Promise<FraudAlert | null> {
    try {
      // Use database storage to resolve alert
      const success = await adminRepo.resolveFraudAlert(alertId, adminUserId, 'resolved', note);
      
      if (success) {
        logInfo(`Fraud alert ${alertId} resolved as ${note} by admin ${adminUserId}`);
        
        // Update Redis cache if available
        if (RedisService.isAvailable()) {
          try {
            const alertKey = `fraud_alert:${alertId}`;
            const alertData = await RedisService.instance.get(alertKey);
            if (alertData) {
              const alert = JSON.parse(alertData) as FraudAlert;
              alert.status = 'resolved';
              alert.resolvedBy = adminUserId;
              alert.resolvedAt = new Date();
              if (note) {
                if (alert.metadata) {
                  alert.metadata.resolutionNote = note;
                } else {
                  alert.metadata = { resolutionNote: note };
                }
              }
              await RedisService.instance.setex(alertKey, 86400 * this.ALERT_RETENTION_DAYS, JSON.stringify(alert));
            }
          } catch (cacheError) {
            logError(cacheError, 'Failed to update cache after resolving alert');
          }
        }
        
        // Return updated alert
        return await adminRepo.getFraudAlert(alertId) as FraudAlert || null;
      }
      
      return null;

    } catch (error) {
      logError(error, `Failed to resolve alert ${alertId}`);
      return null;
    }
  }

  /**
   * Mark an alert as false positive
   */
  static async markAsFalsePositive(
    alertId: number, 
    adminUserId: number, 
    note?: string
  ): Promise<FraudAlert | null> {
    try {
      // Use database storage to resolve alert as false positive
      const success = await adminRepo.resolveFraudAlert(alertId, adminUserId, 'false_positive', note);
      
      if (success) {
        logInfo(`Fraud alert ${alertId} marked as false positive by admin ${adminUserId}`);
        
        // Update Redis cache if available
        if (RedisService.isAvailable()) {
          try {
            const alertKey = `fraud_alert:${alertId}`;
            const alertData = await RedisService.instance.get(alertKey);
            if (alertData) {
              const alert = JSON.parse(alertData) as FraudAlert;
              alert.status = 'false_positive';
              alert.resolvedBy = adminUserId;
              alert.resolvedAt = new Date();
              if (note) {
                if (alert.metadata) {
                  alert.metadata.resolutionNote = note;
                } else {
                  alert.metadata = { resolutionNote: note };
                }
              }
              await RedisService.instance.setex(alertKey, 86400 * this.ALERT_RETENTION_DAYS, JSON.stringify(alert));
            }
          } catch (cacheError) {
            logError(cacheError, 'Failed to update cache after marking as false positive');
          }
        }
        
        // Return updated alert
        return await adminRepo.getFraudAlert(alertId) as FraudAlert || null;
      }
      
      return null;

    } catch (error) {
      logError(error, `Failed to mark alert ${alertId} as false positive`);
      return null;
    }
  }
}