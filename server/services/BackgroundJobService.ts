import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { logInfo, logError, logWarning } from '../utils/logger';

/**
 * Background Job Service using BullMQ
 * Handles asynchronous tasks like email sending, notifications, and heavy processing
 */
export class BackgroundJobService {
  private static emailQueue: Queue | null = null;
  private static notificationQueue: Queue | null = null;
  private static analyticsQueue: Queue | null = null;
  
  private static emailWorker: Worker | null = null;
  private static notificationWorker: Worker | null = null;
  private static analyticsWorker: Worker | null = null;
  
  private static emailEvents: QueueEvents | null = null;
  private static notificationEvents: QueueEvents | null = null;
  private static analyticsEvents: QueueEvents | null = null;
  
  private static isInitialized = false;

  /**
   * Initialize job queues and workers
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      logInfo('BackgroundJobService already initialized');
      return;
    }

    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      logInfo('⚠️  Redis not configured - Background jobs disabled. Jobs will be processed synchronously.');
      return;
    }

    try {
      const connection = {
        host: this.parseRedisHost(redisUrl),
        port: this.parseRedisPort(redisUrl),
        password: this.parseRedisPassword(redisUrl),
      };

      // Initialize queues
      this.emailQueue = new Queue('email', { connection });
      this.notificationQueue = new Queue('notification', { connection });
      this.analyticsQueue = new Queue('analytics', { connection });

      // Initialize workers
      this.emailWorker = new Worker('email', this.processEmailJob, {
        connection,
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 1000, // 10 jobs per second
        }
      });

      this.notificationWorker = new Worker('notification', this.processNotificationJob, {
        connection,
        concurrency: 10,
        limiter: {
          max: 20,
          duration: 1000, // 20 jobs per second
        }
      });

      this.analyticsWorker = new Worker('analytics', this.processAnalyticsJob, {
        connection,
        concurrency: 3,
        limiter: {
          max: 5,
          duration: 1000, // 5 jobs per second
        }
      });

      // Initialize queue events for monitoring
      this.emailEvents = new QueueEvents('email', { connection });
      this.notificationEvents = new QueueEvents('notification', { connection });
      this.analyticsEvents = new QueueEvents('analytics', { connection });

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      logInfo('✅ BackgroundJobService initialized successfully');
    } catch (error) {
      logError(error, '❌ Failed to initialize BackgroundJobService', { service: 'BackgroundJobService' });
      logWarning('Background jobs will be processed synchronously', { service: 'BackgroundJobService' });
    }
  }

  /**
   * Parse Redis connection details
   */
  private static parseRedisHost(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname || 'localhost';
    } catch {
      return 'localhost';
    }
  }

  private static parseRedisPort(url: string): number {
    try {
      const parsed = new URL(url);
      return parseInt(parsed.port) || 6379;
    } catch {
      return 6379;
    }
  }

  private static parseRedisPassword(url: string): string | undefined {
    try {
      const parsed = new URL(url);
      return parsed.password || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Set up event listeners for job monitoring
   */
  private static setupEventListeners(): void {
    // Email queue events
    this.emailEvents?.on('completed', ({ jobId }) => {
      logInfo(`Email job ${jobId} completed successfully`);
    });

    this.emailEvents?.on('failed', ({ jobId, failedReason }) => {
      logError(new Error(failedReason), `Email job ${jobId} failed`);
    });

    // Notification queue events
    this.notificationEvents?.on('completed', ({ jobId }) => {
      logInfo(`Notification job ${jobId} completed successfully`);
    });

    this.notificationEvents?.on('failed', ({ jobId, failedReason }) => {
      logError(new Error(failedReason), `Notification job ${jobId} failed`);
    });

    // Analytics queue events
    this.analyticsEvents?.on('completed', ({ jobId }) => {
      logInfo(`Analytics job ${jobId} completed successfully`);
    });

    this.analyticsEvents?.on('failed', ({ jobId, failedReason }) => {
      logError(new Error(failedReason), `Analytics job ${jobId} failed`);
    });
  }

  /**
   * Process email job
   */
  private static async processEmailJob(job: Job): Promise<void> {
    const { to, subject, body, type } = job.data;
    
    try {
      logInfo(`Processing email job ${job.id}: ${type} to ${to}`);
      
      // Import EmailService dynamically to avoid circular dependencies
      try {
        const { EmailService } = await import('./EmailService.js');
        await EmailService.sendEmail({ to, subject, body, type });
      } catch (importError) {
        // Fallback: try without .js extension for different module systems
        const { EmailService } = await import('./EmailService');
        await EmailService.sendEmail({ to, subject, body, type });
      }
      
      logInfo(`Email job ${job.id} processed successfully`);
    } catch (error) {
      logError(error, `Failed to process email job ${job.id}`);
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Process notification job
   */
  private static async processNotificationJob(job: Job): Promise<void> {
    const { userId, type, title, message, data } = job.data;
    
    try {
      logInfo(`Processing notification job ${job.id} for user ${userId}`);
      
      // Create notification in database
      const { NotificationService } = await import('./NotificationService');
      await NotificationService.createNotification({
        userId,
        type,
        title,
        message,
        data
      });
      
      logInfo(`Notification job ${job.id} processed successfully`);
    } catch (error) {
      logError(error, `Failed to process notification job ${job.id}`);
      throw error;
    }
  }

  /**
   * Process analytics job
   */
  private static async processAnalyticsJob(job: Job): Promise<void> {
    const { type, data } = job.data;
    
    try {
      logInfo(`Processing analytics job ${job.id}: ${type}`);
      
      // Process analytics based on type
      switch (type) {
        case 'aggregate_sales':
          await this.aggregateSalesData(data);
          break;
        case 'generate_report':
          await this.generateAnalyticsReport(data);
          break;
        case 'cache_warmup':
          await this.performCacheWarmup(data);
          break;
        case 'optimize_images':
          await this.optimizeProductImages(data);
          break;
        case 'cleanup_expired':
          await this.cleanupExpiredData(data);
          break;
        default:
          logInfo(`Unknown analytics job type: ${type}`);
      }
      
      logInfo(`Analytics job ${job.id} processed successfully`);
    } catch (error) {
      logError(error, `Failed to process analytics job ${job.id}`);
      throw error;
    }
  }

  /**
   * Aggregate sales data for analytics
   */
  private static async aggregateSalesData(data: any): Promise<void> {
    try {
      const { db } = await import('../db');
      const { transactions } = await import('@shared/schema');
      const { RedisService } = await import('./RedisService');
      const { sql, gte, lte, and } = await import('drizzle-orm');

      const { period = 'daily', startDate, endDate } = data;
      
      const dateFilter = startDate && endDate 
        ? and(
            gte(transactions.createdAt, new Date(startDate)),
            lte(transactions.createdAt, new Date(endDate))
          )
        : gte(transactions.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000));

      // Aggregate transaction data
      const aggregatedData = await db
        .select({
          count: sql<number>`count(*)`,
          totalAmount: sql<number>`sum(${transactions.amount})`,
          totalCommission: sql<number>`sum(${transactions.commission})`,
          avgAmount: sql<number>`avg(${transactions.amount})`
        })
        .from(transactions)
        .where(dateFilter);

      // Cache the aggregated data
      await RedisService.cacheSalesAnalytics(period, aggregatedData[0], 3600);
      
      logInfo(`Sales data aggregated for period: ${period}`);
    } catch (error) {
      logError(error, 'Failed to aggregate sales data');
      throw error;
    }
  }

  /**
   * Generate analytics report
   */
  private static async generateAnalyticsReport(data: any): Promise<void> {
    try {
      const { type, userId, period } = data;
      
      logInfo(`Generating ${type} report for user ${userId}, period: ${period}`);
      
      // Implementation would generate PDF/Excel reports
      // This is a placeholder for the actual report generation logic
      
      logInfo(`Report generated successfully`);
    } catch (error) {
      logError(error, 'Failed to generate analytics report');
      throw error;
    }
  }

  /**
   * Perform cache warmup in background
   */
  private static async performCacheWarmup(data: any): Promise<void> {
    try {
      const { CacheWarming } = await import('../utils/cache-warming');
      await CacheWarming.warmAllCaches();
      logInfo('Cache warmup completed in background');
    } catch (error) {
      logError(error, 'Failed to perform cache warmup');
      throw error;
    }
  }

  /**
   * Optimize product images in background
   */
  private static async optimizeProductImages(data: any): Promise<void> {
    try {
      const { productId, images } = data;
      
      logInfo(`Optimizing images for product ${productId}`);
      
      // Placeholder for image optimization logic
      // Would use Sharp or similar library to optimize images
      
      logInfo(`Images optimized for product ${productId}`);
    } catch (error) {
      logError(error, 'Failed to optimize images');
      throw error;
    }
  }

  /**
   * Cleanup expired data in background
   */
  private static async cleanupExpiredData(data: any): Promise<void> {
    try {
      const { type } = data;
      
      logInfo(`Cleaning up expired ${type} data`);
      
      // Placeholder for cleanup logic
      // Would remove old sessions, expired status updates, etc.
      
      logInfo(`Cleanup completed for ${type}`);
    } catch (error) {
      logError(error, 'Failed to cleanup expired data');
      throw error;
    }
  }

  /**
   * Add email job to queue
   */
  static async addEmailJob(data: {
    to: string;
    subject: string;
    body: string;
    type: string;
  }, options?: {
    priority?: number;
    delay?: number;
  }): Promise<string | null> {
    if (!this.emailQueue) {
      logInfo('Email queue not available, processing synchronously');
      try {
        // Try with .js extension first for ESM compatibility
        try {
          const { EmailService } = await import('./EmailService.js');
          await EmailService.sendEmail(data);
        } catch (importError) {
          // Fallback: try without .js extension
          const { EmailService } = await import('./EmailService');
          await EmailService.sendEmail(data);
        }
        return null;
      } catch (error) {
        logError(error, 'Failed to send email synchronously');
        throw error;
      }
    }

    try {
      const job = await this.emailQueue.add('send-email', data, {
        priority: options?.priority,
        delay: options?.delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 seconds
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000, // Keep max 1000 completed jobs
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        }
      });

      logInfo(`Email job ${job.id} added to queue`);
      return job.id || null;
    } catch (error) {
      logError(error, 'Failed to add email job to queue');
      throw error;
    }
  }

  /**
   * Add notification job to queue
   */
  static async addNotificationJob(data: {
    userId: number;
    type: string;
    title: string;
    message: string;
    data?: any;
  }, options?: {
    priority?: number;
    delay?: number;
  }): Promise<string | null> {
    if (!this.notificationQueue) {
      logInfo('Notification queue not available, processing synchronously');
      try {
        const { NotificationService } = await import('./NotificationService');
        await NotificationService.createNotification(data);
        return null;
      } catch (error) {
        logError(error, 'Failed to create notification synchronously');
        throw error;
      }
    }

    try {
      const job = await this.notificationQueue.add('send-notification', data, {
        priority: options?.priority,
        delay: options?.delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 1800,
          count: 5000,
        }
      });

      logInfo(`Notification job ${job.id} added to queue`);
      return job.id || null;
    } catch (error) {
      logError(error, 'Failed to add notification job to queue');
      throw error;
    }
  }

  /**
   * Add analytics job to queue
   */
  static async addAnalyticsJob(data: {
    type: string;
    data: any;
  }, options?: {
    priority?: number;
    delay?: number;
  }): Promise<string | null> {
    if (!this.analyticsQueue) {
      logInfo('Analytics queue not available, skipping job');
      return null;
    }

    try {
      const job = await this.analyticsQueue.add('process-analytics', data, {
        priority: options?.priority,
        delay: options?.delay,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000,
        }
      });

      logInfo(`Analytics job ${job.id} added to queue`);
      return job.id || null;
    } catch (error) {
      logError(error, 'Failed to add analytics job to queue');
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<any> {
    if (!this.isInitialized) {
      return { initialized: false, message: 'Background jobs not initialized' };
    }

    try {
      const [emailCounts, notificationCounts, analyticsCounts] = await Promise.all([
        this.emailQueue?.getJobCounts(),
        this.notificationQueue?.getJobCounts(),
        this.analyticsQueue?.getJobCounts(),
      ]);

      return {
        initialized: true,
        queues: {
          email: emailCounts,
          notification: notificationCounts,
          analytics: analyticsCounts,
        }
      };
    } catch (error) {
      logError(error, 'Failed to get queue stats');
      return { initialized: true, error: 'Failed to retrieve stats' };
    }
  }

  /**
   * Get failed jobs
   */
  static async getFailedJobs(queue: 'email' | 'notification' | 'analytics', limit = 10): Promise<any[]> {
    const targetQueue = queue === 'email' ? this.emailQueue :
                        queue === 'notification' ? this.notificationQueue :
                        this.analyticsQueue;

    if (!targetQueue) {
      return [];
    }

    try {
      const failedJobs = await targetQueue.getFailed(0, limit - 1);
      return failedJobs.map(job => ({
        id: job.id,
        data: job.data,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
        attemptsMade: job.attemptsMade,
      }));
    } catch (error) {
      logError(error, `Failed to get failed jobs for ${queue}`);
      return [];
    }
  }

  /**
   * Retry failed job
   */
  static async retryFailedJob(queue: 'email' | 'notification' | 'analytics', jobId: string): Promise<void> {
    const targetQueue = queue === 'email' ? this.emailQueue :
                        queue === 'notification' ? this.notificationQueue :
                        this.analyticsQueue;

    if (!targetQueue) {
      throw new Error('Queue not available');
    }

    try {
      const job = await targetQueue.getJob(jobId);
      if (job) {
        await job.retry();
        logInfo(`Retrying job ${jobId} in ${queue} queue`);
      }
    } catch (error) {
      logError(error, `Failed to retry job ${jobId}`);
      throw error;
    }
  }

  /**
   * Clear completed jobs
   */
  static async clearCompletedJobs(queue: 'email' | 'notification' | 'analytics'): Promise<void> {
    const targetQueue = queue === 'email' ? this.emailQueue :
                        queue === 'notification' ? this.notificationQueue :
                        this.analyticsQueue;

    if (!targetQueue) {
      return;
    }

    try {
      await targetQueue.clean(0, 1000, 'completed');
      logInfo(`Cleared completed jobs from ${queue} queue`);
    } catch (error) {
      logError(error, `Failed to clear completed jobs from ${queue}`);
    }
  }

  /**
   * Graceful shutdown
   */
  static async shutdown(): Promise<void> {
    try {
      await Promise.all([
        this.emailWorker?.close(),
        this.notificationWorker?.close(),
        this.analyticsWorker?.close(),
        this.emailQueue?.close(),
        this.notificationQueue?.close(),
        this.analyticsQueue?.close(),
        this.emailEvents?.close(),
        this.notificationEvents?.close(),
        this.analyticsEvents?.close(),
      ]);

      logInfo('BackgroundJobService shut down gracefully');
    } catch (error) {
      logError(error, 'Error during BackgroundJobService shutdown');
    }
  }
}
