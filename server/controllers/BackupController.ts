import { Request, Response } from 'express';
import { BackupService } from '../services/BackupService';
import { BackupScheduler } from '../services/BackupScheduler';
import { ErrorHandlers } from '../utils/error-handler';
import { logInfo, logError } from '../utils/logger';
import { rateLimit } from '../middleware/validation';

export class BackupController {
  /**
   * Create manual backup (Owner/Admin only)
   */
  static createBackup = [
    rateLimit({ windowMs: 5 * 60 * 1000, maxRequests: 1 }), // Only 1 backup per 5 minutes
    async (req: Request, res: Response) => {
      try {
        logInfo(`Manual backup triggered by user ${req.user?.id}`, {
          userId: req.user?.id,
          userRole: req.user?.role
        });

        const result = await BackupService.createFullBackup();
        
        if (result.success) {
          res.json({
            success: true,
            message: 'Backup created successfully',
            data: {
              timestamp: result.timestamp,
              size: result.size,
              duration: result.duration,
              path: result.backupPath ? result.backupPath.split('/').pop() : null // Only filename for security
            }
          });
        } else {
          return ErrorHandlers.serverError(res, result.message || 'create backup');
        }
      } catch (error) {
        logError(error, 'Manual backup failed', req.user?.id);
        return ErrorHandlers.serverError(res, 'Failed to create backup');
      }
    }
  ];

  /**
   * Get backup status and list of backups (Owner/Admin only)
   */
  static getBackupStatus = async (req: Request, res: Response) => {
    try {
      const [health, backups, taskStatus] = await Promise.all([
        BackupService.getHealthStatus(),
        BackupService.listBackups(),
        BackupScheduler.getTaskStatus()
      ]);

      const config = {
        enabled: process.env.BACKUP_ENABLED === 'true',
        schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
        retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
        maxSize: parseInt(process.env.BACKUP_MAX_SIZE_MB || '1000')
      };

      res.json({
        success: true,
        data: {
          health: {
            ...health,
            totalSizeMB: Math.round((health.totalSize / 1024 / 1024) * 100) / 100
          },
          backups: backups.slice(0, 10).map(backup => ({
            name: backup.name,
            sizeMB: Math.round((backup.size / 1024 / 1024) * 100) / 100,
            created: backup.created,
            age: Math.round((Date.now() - backup.created.getTime()) / (24 * 60 * 60 * 1000))
          })),
          scheduler: {
            tasks: taskStatus,
            config
          }
        }
      });
    } catch (error) {
      logError(error, 'Failed to get backup status', req.user?.id);
      return ErrorHandlers.serverError(res, 'Failed to get backup status');
    }
  };

  /**
   * Get backup configuration (Owner/Admin only)
   */
  static getBackupConfig = async (req: Request, res: Response) => {
    try {
      const config = {
        enabled: process.env.BACKUP_ENABLED === 'true',
        schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
        retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
        compressionLevel: parseInt(process.env.BACKUP_COMPRESSION_LEVEL || '6'),
        includeBlobs: process.env.BACKUP_INCLUDE_BLOBS !== 'false',
        maxSizeMB: parseInt(process.env.BACKUP_MAX_SIZE_MB || '1000'),
        timezone: process.env.BACKUP_TIMEZONE || 'UTC'
      };

      const nextRuns = BackupScheduler.getNextRuns();

      res.json({
        success: true,
        data: {
          config,
          nextScheduledRuns: nextRuns,
          recommendations: {
            enableBackup: !config.enabled ? 'Enable automatic backups for data protection' : null,
            retentionTooLow: config.retentionDays < 7 ? 'Consider increasing retention to at least 7 days' : null,
            retentionTooHigh: config.retentionDays > 90 ? 'High retention period may consume excessive storage' : null,
            compressionDisabled: config.compressionLevel === 0 ? 'Enable compression to save storage space' : null
          }
        }
      });
    } catch (error) {
      logError(error, 'Failed to get backup config', req.user?.id);
      return ErrorHandlers.serverError(res, 'Failed to get backup configuration');
    }
  };

  /**
   * Test backup health (Owner/Admin only) 
   */
  static testBackupHealth = async (req: Request, res: Response) => {
    try {
      logInfo(`Backup health test initiated by user ${req.user?.id}`);

      const health = await BackupService.getHealthStatus();
      const issues = [];
      
      // Perform additional health checks
      if (!process.env.DATABASE_URL) {
        issues.push('DATABASE_URL not configured');
      }
      
      if (!process.env.BACKUP_ENABLED) {
        issues.push('BACKUP_ENABLED environment variable not set');
      }

      // Check if backup directory is accessible
      try {
        await BackupService.listBackups();
      } catch (error) {
        issues.push('Backup directory not accessible');
      }

      // Check cron validation
      const schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *';
      try {
        const cron = require('node-cron');
        if (!cron.validate(schedule)) {
          issues.push('Invalid backup schedule format');
        }
      } catch (error) {
        issues.push('Cron scheduler not available');
      }

      const overallHealth = health.errors.length === 0 && issues.length === 0;

      res.json({
        success: true,
        data: {
          healthy: overallHealth,
          backupService: health,
          additionalIssues: issues,
          checkedAt: new Date().toISOString(),
          recommendations: overallHealth ? 
            ['Backup system is functioning properly'] :
            [
              'Review configuration issues listed above',
              'Ensure all required environment variables are set',
              'Verify backup directory permissions',
              'Test manual backup creation'
            ]
        }
      });
    } catch (error) {
      logError(error, 'Backup health test failed', req.user?.id);
      return ErrorHandlers.serverError(res, 'Failed to test backup health');
    }
  };

  /**
   * Get backup logs and recent activity (Owner only)
   */
  static getBackupLogs = async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      
      // For now, we'll return scheduler status and health info
      // In a production system, you'd want to implement proper log storage
      const [taskStatus, health, backups] = await Promise.all([
        BackupScheduler.getTaskStatus(),
        BackupService.getHealthStatus(),
        BackupService.listBackups()
      ]);

      const recentBackups = backups.slice(0, limit).map(backup => ({
        timestamp: backup.created,
        action: 'backup_completed',
        size: backup.size,
        name: backup.name,
        success: true
      }));

      res.json({
        success: true,
        data: {
          recentActivity: recentBackups,
          schedulerStatus: taskStatus,
          healthSummary: {
            enabled: health.enabled,
            backupCount: health.backupCount,
            totalSizeMB: Math.round((health.totalSize / 1024 / 1024) * 100) / 100,
            lastBackup: health.lastBackup,
            errors: health.errors
          },
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logError(error, 'Failed to get backup logs', req.user?.id);
      return ErrorHandlers.serverError(res, 'Failed to get backup logs');
    }
  };
}