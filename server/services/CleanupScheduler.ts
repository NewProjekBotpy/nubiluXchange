import * as cron from 'node-cron';
import { DataCleanupService } from './DataCleanupService';
import { logInfo, logError } from '../utils/logger';

/**
 * Cleanup Scheduler Service
 * Schedules automated data cleanup tasks using cron jobs
 */
export class CleanupScheduler {
  private static jobs: Map<string, cron.ScheduledTask> = new Map();
  private static isInitialized = false;

  /**
   * Initialize cleanup scheduler
   */
  static initialize(): void {
    if (this.isInitialized) {
      logInfo('CleanupScheduler already initialized');
      return;
    }

    try {
      // Run expired status cleanup every hour
      const statusCleanupJob = cron.schedule('0 * * * *', async () => {
        logInfo('Running scheduled expired status cleanup...');
        try {
          await DataCleanupService.cleanupExpiredStatuses();
        } catch (error) {
          logError(error, 'Scheduled status cleanup failed');
        }
      });
      this.jobs.set('status-cleanup', statusCleanupJob);

      // Ensure active statuses every 30 minutes
      const statusRegenerationJob = cron.schedule('*/30 * * * *', async () => {
        logInfo('Running scheduled status regeneration check...');
        try {
          const created = await DataCleanupService.ensureActiveStatuses(5);
          if (created > 0) {
            logInfo(`✨ Auto-generated ${created} sample status updates`);
          }
        } catch (error) {
          logError(error, 'Scheduled status regeneration failed');
        }
      });
      this.jobs.set('status-regeneration', statusRegenerationJob);

      // Run session cleanup every 6 hours
      const sessionCleanupJob = cron.schedule('0 */6 * * *', async () => {
        logInfo('Running scheduled expired session cleanup...');
        try {
          await DataCleanupService.cleanupExpiredSessions();
        } catch (error) {
          logError(error, 'Scheduled session cleanup failed');
        }
      });
      this.jobs.set('session-cleanup', sessionCleanupJob);

      // Run status views cleanup daily at 2 AM
      const statusViewsCleanupJob = cron.schedule('0 2 * * *', async () => {
        logInfo('Running scheduled status views cleanup...');
        try {
          await DataCleanupService.cleanupOldStatusViews();
        } catch (error) {
          logError(error, 'Scheduled status views cleanup failed');
        }
      });
      this.jobs.set('status-views-cleanup', statusViewsCleanupJob);

      // Run comprehensive cleanup weekly (Sunday at 3 AM)
      const comprehensiveCleanupJob = cron.schedule('0 3 * * 0', async () => {
        logInfo('Running scheduled comprehensive cleanup...');
        try {
          await DataCleanupService.runAllCleanups();
        } catch (error) {
          logError(error, 'Scheduled comprehensive cleanup failed');
        }
      });
      this.jobs.set('comprehensive-cleanup', comprehensiveCleanupJob);

      // Run database optimization monthly (1st of month at 4 AM)
      const dbOptimizationJob = cron.schedule('0 4 1 * *', async () => {
        logInfo('Running scheduled database optimization...');
        try {
          await DataCleanupService.optimizeTables();
        } catch (error) {
          logError(error, 'Scheduled database optimization failed');
        }
      });
      this.jobs.set('db-optimization', dbOptimizationJob);

      this.isInitialized = true;
      logInfo('✅ CleanupScheduler initialized successfully with all jobs');
      logInfo(`Scheduled jobs: ${Array.from(this.jobs.keys()).join(', ')}`);
    } catch (error) {
      logError(error, 'Failed to initialize CleanupScheduler');
    }
  }

  /**
   * Stop a specific cleanup job
   */
  static stopJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      logInfo(`Stopped cleanup job: ${jobName}`);
      return true;
    }
    return false;
  }

  /**
   * Start a specific cleanup job
   */
  static startJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (job) {
      job.start();
      logInfo(`Started cleanup job: ${jobName}`);
      return true;
    }
    return false;
  }

  /**
   * Get all scheduled jobs status
   */
  static getJobsStatus(): any {
    const jobs = Array.from(this.jobs.entries()).map(([name, task]) => ({
      name,
      running: task ? true : false
    }));

    return {
      initialized: this.isInitialized,
      jobs,
      totalJobs: jobs.length
    };
  }

  /**
   * Run a cleanup job manually
   */
  static async runJobManually(jobName: string): Promise<any> {
    logInfo(`Manually running cleanup job: ${jobName}`);

    try {
      switch (jobName) {
        case 'status-cleanup':
          return await DataCleanupService.cleanupExpiredStatuses();
        
        case 'status-regeneration':
          return await DataCleanupService.ensureActiveStatuses(5);
        
        case 'session-cleanup':
          return await DataCleanupService.cleanupExpiredSessions();
        
        case 'status-views-cleanup':
          return await DataCleanupService.cleanupOldStatusViews();
        
        case 'comprehensive-cleanup':
          return await DataCleanupService.runAllCleanups();
        
        case 'db-optimization':
          await DataCleanupService.optimizeTables();
          return { message: 'Database optimization completed' };
        
        default:
          throw new Error(`Unknown job: ${jobName}`);
      }
    } catch (error) {
      logError(error, `Failed to run manual cleanup job: ${jobName}`);
      throw error;
    }
  }

  /**
   * Stop all cleanup jobs
   */
  static stopAll(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      logInfo(`Stopped cleanup job: ${name}`);
    });
    logInfo('All cleanup jobs stopped');
  }

  /**
   * Graceful shutdown
   */
  static shutdown(): void {
    try {
      this.stopAll();
      this.jobs.clear();
      this.isInitialized = false;
      logInfo('CleanupScheduler shut down gracefully');
    } catch (error) {
      logError(error, 'Error during CleanupScheduler shutdown');
    }
  }
}
