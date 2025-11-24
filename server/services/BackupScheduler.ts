import * as cron from 'node-cron';
import { BackupService } from './BackupService';
import { logInfo, logError } from '../utils/logger';
import { captureError } from '../sentry';

export class BackupScheduler {
  private static scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private static isInitialized = false;

  /**
   * Initialize backup scheduler with cron jobs
   */
  static async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        logInfo('Backup scheduler already initialized');
        return;
      }

      // Initialize backup service first
      await BackupService.initialize();

      const backupEnabled = process.env.BACKUP_ENABLED === 'true';
      
      if (!backupEnabled) {
        logInfo('Backup scheduler disabled - set BACKUP_ENABLED=true to enable');
        return;
      }

      // Schedule full backups
      const backupSchedule = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Daily at 2 AM
      await this.scheduleFullBackup(backupSchedule);

      // Schedule cleanup task (weekly)
      const cleanupSchedule = process.env.BACKUP_CLEANUP_SCHEDULE || '0 3 * * 0'; // Weekly on Sunday at 3 AM
      await this.scheduleCleanup(cleanupSchedule);

      // Schedule health checks (daily)
      const healthCheckSchedule = process.env.BACKUP_HEALTH_SCHEDULE || '0 1 * * *'; // Daily at 1 AM
      await this.scheduleHealthCheck(healthCheckSchedule);

      this.isInitialized = true;
      logInfo('Backup scheduler initialized successfully');

    } catch (error) {
      logError(error, 'Failed to initialize backup scheduler');
      captureError(error as Error, { context: 'BACKUP_SCHEDULER_INIT' });
    }
  }

  /**
   * Schedule regular full backups
   */
  private static async scheduleFullBackup(schedule: string): Promise<void> {
    try {
      if (!cron.validate(schedule)) {
        throw new Error(`Invalid cron schedule: ${schedule}`);
      }

      const task = cron.schedule(schedule, async () => {
        try {
          logInfo('Starting scheduled backup...');
          const result = await BackupService.createFullBackup();
          
          if (result.success) {
            logInfo(`Scheduled backup completed successfully - ${result.message}`);
          } else {
            logError(new Error(result.message), 'Scheduled backup failed');
          }
        } catch (error) {
          logError(error, 'Error during scheduled backup');
          captureError(error as Error, { context: 'SCHEDULED_BACKUP' });
        }
      }, {
        timezone: process.env.BACKUP_TIMEZONE || 'UTC'
      });

      // Start the task
      task.start();
      this.scheduledTasks.set('fullBackup', task);
      
      logInfo(`Full backup scheduled: ${schedule}`);
    } catch (error) {
      logError(error, 'Failed to schedule full backup');
      throw error;
    }
  }

  /**
   * Schedule cleanup of old backups
   */
  private static async scheduleCleanup(schedule: string): Promise<void> {
    try {
      if (!cron.validate(schedule)) {
        throw new Error(`Invalid cleanup schedule: ${schedule}`);
      }

      const task = cron.schedule(schedule, async () => {
        try {
          logInfo('Starting scheduled backup cleanup...');
          
          // This will be called automatically during backup creation,
          // but we also run it separately for maintenance
          const backups = await BackupService.listBackups();
          logInfo(`Current backup count: ${backups.length}`);
          
        } catch (error) {
          logError(error, 'Error during scheduled cleanup');
          captureError(error as Error, { context: 'SCHEDULED_CLEANUP' });
        }
      }, {
        timezone: process.env.BACKUP_TIMEZONE || 'UTC'
      });

      task.start();
      this.scheduledTasks.set('cleanup', task);
      
      logInfo(`Backup cleanup scheduled: ${schedule}`);
    } catch (error) {
      logError(error, 'Failed to schedule backup cleanup');
      throw error;
    }
  }

  /**
   * Schedule health checks
   */
  private static async scheduleHealthCheck(schedule: string): Promise<void> {
    try {
      if (!cron.validate(schedule)) {
        throw new Error(`Invalid health check schedule: ${schedule}`);
      }

      const task = cron.schedule(schedule, async () => {
        try {
          const health = await BackupService.getHealthStatus();
          
          if (health.errors.length > 0) {
            logError(
              new Error(`Backup service health issues: ${health.errors.join(', ')}`),
              'Backup service health check failed'
            );
          } else {
            logInfo(`Backup service healthy - ${health.backupCount} backups, ${(health.totalSize / 1024 / 1024).toFixed(2)}MB total`);
          }
        } catch (error) {
          logError(error, 'Error during backup health check');
          captureError(error as Error, { context: 'BACKUP_HEALTH_CHECK' });
        }
      }, {
        timezone: process.env.BACKUP_TIMEZONE || 'UTC'
      });

      task.start();
      this.scheduledTasks.set('healthCheck', task);
      
      logInfo(`Backup health check scheduled: ${schedule}`);
    } catch (error) {
      logError(error, 'Failed to schedule health check');
      throw error;
    }
  }

  /**
   * Stop all scheduled tasks
   */
  static stopAllTasks(): void {
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      logInfo(`Stopped scheduled task: ${name}`);
    });
    this.scheduledTasks.clear();
    this.isInitialized = false;
  }

  /**
   * Stop specific scheduled task
   */
  static stopTask(taskName: string): boolean {
    const task = this.scheduledTasks.get(taskName);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(taskName);
      logInfo(`Stopped scheduled task: ${taskName}`);
      return true;
    }
    return false;
  }

  /**
   * Get status of all scheduled tasks
   */
  static getTaskStatus(): Array<{name: string, running: boolean, schedule?: string}> {
    const status: Array<{name: string, running: boolean, schedule?: string}> = [];
    
    this.scheduledTasks.forEach((task, name) => {
      status.push({
        name,
        running: (task as any).running || false
      });
    });
    
    return status;
  }

  /**
   * Manually trigger backup (for testing or immediate needs)
   */
  static async triggerBackup(): Promise<any> {
    try {
      logInfo('Manually triggered backup...');
      const result = await BackupService.createFullBackup();
      
      if (result.success) {
        logInfo(`Manual backup completed - ${result.message}`);
      } else {
        logError(new Error(result.message), 'Manual backup failed');
      }
      
      return result;
    } catch (error) {
      logError(error, 'Error during manual backup trigger');
      captureError(error as Error, { context: 'MANUAL_BACKUP' });
      throw error;
    }
  }

  /**
   * Get next scheduled run times
   */
  static getNextRuns(): Array<{task: string, nextRun: Date | null}> {
    const nextRuns: Array<{task: string, nextRun: Date | null}> = [];
    
    this.scheduledTasks.forEach((task, name) => {
      nextRuns.push({
        task: name,
        nextRun: null // Simplified for now - node-cron types are complex
      });
    });
    
    return nextRuns;
  }
}