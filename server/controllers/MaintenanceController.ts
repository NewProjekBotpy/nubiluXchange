import { Request, Response } from 'express';
import { ErrorHandlers } from '../utils/error-handler';
import { logInfo, logError } from '../utils/logger';
import { CacheManager } from '../utils/cache-manager';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

export class MaintenanceController {
  /**
   * Clear all cache entries
   */
  static clearCache = async (req: Request, res: Response) => {
    try {
      const statsBefore = CacheManager.getStats();
      CacheManager.clear();
      const statsAfter = CacheManager.getStats();

      logInfo(`Cache cleared by user ${req.user?.id}`, {
        userId: req.user?.id,
        entriesCleared: statsBefore.total
      });

      res.json({
        success: true,
        message: 'Cache cleared successfully',
        data: {
          entriesCleared: statsBefore.total,
          validEntriesCleared: statsBefore.valid,
          expiredEntriesCleared: statsBefore.expired,
          currentEntries: statsAfter.total
        }
      });
    } catch (error) {
      logError(error, 'Failed to clear cache', req.user?.id);
      return ErrorHandlers.serverError(res, 'Failed to clear cache');
    }
  };

  /**
   * Get cache statistics
   */
  static getCacheStats = async (req: Request, res: Response) => {
    try {
      const stats = CacheManager.getStats();

      res.json({
        success: true,
        data: {
          totalEntries: stats.total,
          validEntries: stats.valid,
          expiredEntries: stats.expired,
          hitRatio: Math.round(stats.hitRatio * 100),
          maxCacheSize: 1000,
          utilizationPercent: Math.round((stats.total / 1000) * 100)
        }
      });
    } catch (error) {
      logError(error, 'Failed to get cache stats', req.user?.id);
      return ErrorHandlers.serverError(res, 'Failed to get cache statistics');
    }
  };

  /**
   * Cleanup expired cache entries
   */
  static cleanupCache = async (req: Request, res: Response) => {
    try {
      const statsBefore = CacheManager.getStats();
      CacheManager.cleanup();
      const statsAfter = CacheManager.getStats();

      logInfo(`Cache cleanup performed by user ${req.user?.id}`, {
        userId: req.user?.id,
        entriesRemoved: statsBefore.expired
      });

      res.json({
        success: true,
        message: 'Cache cleanup completed',
        data: {
          expiredEntriesRemoved: statsBefore.expired,
          remainingEntries: statsAfter.valid
        }
      });
    } catch (error) {
      logError(error, 'Failed to cleanup cache', req.user?.id);
      return ErrorHandlers.serverError(res, 'Failed to cleanup cache');
    }
  };

  /**
   * Get database statistics
   */
  static getDatabaseStats = async (req: Request, res: Response) => {
    try {
      const [
        userCount,
        productCount,
        transactionCount,
        chatCount,
        messageCount,
        dbSize
      ] = await Promise.all([
        db.execute(sql`SELECT COUNT(*) as count FROM users`),
        db.execute(sql`SELECT COUNT(*) as count FROM products`),
        db.execute(sql`SELECT COUNT(*) as count FROM transactions`),
        db.execute(sql`SELECT COUNT(*) as count FROM chats`),
        db.execute(sql`SELECT COUNT(*) as count FROM messages`),
        db.execute(sql`
          SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                 pg_database_size(current_database()) as size_bytes
        `).catch(() => ({ rows: [{ size: 'N/A', size_bytes: 0 }] }))
      ]);

      res.json({
        success: true,
        data: {
          tables: {
            users: Number(userCount.rows[0]?.count || 0),
            products: Number(productCount.rows[0]?.count || 0),
            transactions: Number(transactionCount.rows[0]?.count || 0),
            chats: Number(chatCount.rows[0]?.count || 0),
            messages: Number(messageCount.rows[0]?.count || 0)
          },
          database: {
            size: dbSize.rows[0]?.size || 'N/A',
            sizeBytes: Number(dbSize.rows[0]?.size_bytes || 0)
          }
        }
      });
    } catch (error) {
      logError(error, 'Failed to get database stats', req.user?.id);
      return ErrorHandlers.serverError(res, 'Failed to get database statistics');
    }
  };

  /**
   * Optimize database (VACUUM and ANALYZE)
   */
  static optimizeDatabase = async (req: Request, res: Response) => {
    try {
      logInfo(`Database optimization started by user ${req.user?.id}`);

      // Run VACUUM ANALYZE on main tables
      await db.execute(sql`VACUUM ANALYZE users`);
      await db.execute(sql`VACUUM ANALYZE products`);
      await db.execute(sql`VACUUM ANALYZE transactions`);
      await db.execute(sql`VACUUM ANALYZE chats`);
      await db.execute(sql`VACUUM ANALYZE messages`);

      logInfo('Database optimization completed successfully');

      res.json({
        success: true,
        message: 'Database optimization completed',
        data: {
          tablesOptimized: ['users', 'products', 'transactions', 'chats', 'messages'],
          completedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logError(error, 'Database optimization failed', req.user?.id);
      return ErrorHandlers.serverError(res, 'Failed to optimize database');
    }
  };

  /**
   * Get log files statistics
   */
  static getLogStats = async (req: Request, res: Response) => {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      
      let files: string[] = [];
      let totalSize = 0;
      let fileCount = 0;

      try {
        files = await fs.readdir(logsDir);
        
        for (const file of files) {
          const filePath = path.join(logsDir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
          fileCount++;
        }
      } catch (error) {
        // Logs directory might not exist
      }

      res.json({
        success: true,
        data: {
          fileCount,
          totalSizeMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
          totalSizeBytes: totalSize,
          oldestFiles: files.slice(0, 5),
          logsDirectory: logsDir
        }
      });
    } catch (error) {
      logError(error, 'Failed to get log stats', req.user?.id);
      return ErrorHandlers.serverError(res, 'Failed to get log statistics');
    }
  };

  /**
   * Cleanup old log files (older than 30 days)
   */
  static cleanupLogs = async (req: Request, res: Response) => {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      const retentionDays = parseInt(req.body.retentionDays || '30');
      const now = Date.now();
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

      let deletedCount = 0;
      let deletedSize = 0;

      try {
        const files = await fs.readdir(logsDir);

        for (const file of files) {
          const filePath = path.join(logsDir, file);
          const stats = await fs.stat(filePath);

          if (now - stats.mtime.getTime() > retentionMs) {
            deletedSize += stats.size;
            await fs.unlink(filePath);
            deletedCount++;
          }
        }
      } catch (error) {
        // Logs directory might not exist or be empty
      }

      logInfo(`Log cleanup completed by user ${req.user?.id}`, {
        userId: req.user?.id,
        filesDeleted: deletedCount,
        spaceFreed: deletedSize
      });

      res.json({
        success: true,
        message: 'Log cleanup completed',
        data: {
          filesDeleted: deletedCount,
          spaceFreedMB: Math.round((deletedSize / 1024 / 1024) * 100) / 100,
          retentionDays
        }
      });
    } catch (error) {
      logError(error, 'Failed to cleanup logs', req.user?.id);
      return ErrorHandlers.serverError(res, 'Failed to cleanup logs');
    }
  };

  /**
   * Get storage statistics
   */
  static getStorageStats = async (req: Request, res: Response) => {
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      
      let totalSize = 0;
      let fileCount = 0;

      const calculateDirSize = async (dir: string): Promise<void> => {
        try {
          const files = await fs.readdir(dir);
          
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.isDirectory()) {
              await calculateDirSize(filePath);
            } else {
              totalSize += stats.size;
              fileCount++;
            }
          }
        } catch (error) {
          // Directory might not exist
        }
      };

      await calculateDirSize(uploadsDir);

      res.json({
        success: true,
        data: {
          uploadedFiles: fileCount,
          totalSizeMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
          totalSizeBytes: totalSize,
          uploadsDirectory: uploadsDir
        }
      });
    } catch (error) {
      logError(error, 'Failed to get storage stats', req.user?.id);
      return ErrorHandlers.serverError(res, 'Failed to get storage statistics');
    }
  };

  /**
   * Get system health overview
   */
  static getSystemHealth = async (req: Request, res: Response) => {
    try {
      const [cacheStats, dbStats, logStats, storageStats] = await Promise.all([
        Promise.resolve(CacheManager.getStats()),
        db.execute(sql`SELECT COUNT(*) as count FROM users`).then(r => ({ healthy: true, recordCount: Number(r.rows[0]?.count || 0) })).catch(() => ({ healthy: false, recordCount: 0 })),
        fs.readdir(path.join(process.cwd(), 'logs')).then(files => ({ healthy: true, fileCount: files.length })).catch(() => ({ healthy: false, fileCount: 0 })),
        fs.readdir(path.join(process.cwd(), 'public', 'uploads')).then(() => ({ healthy: true })).catch(() => ({ healthy: false }))
      ]);

      const overallHealth = dbStats.healthy && storageStats.healthy;

      res.json({
        success: true,
        data: {
          overall: {
            healthy: overallHealth,
            status: overallHealth ? 'operational' : 'degraded',
            checkedAt: new Date().toISOString()
          },
          components: {
            database: {
              healthy: dbStats.healthy,
              status: dbStats.healthy ? 'operational' : 'error',
              details: { userCount: dbStats.recordCount }
            },
            cache: {
              healthy: true,
              status: 'operational',
              details: {
                entries: cacheStats.total,
                utilizationPercent: Math.round((cacheStats.total / 1000) * 100)
              }
            },
            logs: {
              healthy: logStats.healthy,
              status: logStats.healthy ? 'operational' : 'warning',
              details: { fileCount: logStats.fileCount }
            },
            storage: {
              healthy: storageStats.healthy,
              status: storageStats.healthy ? 'operational' : 'warning'
            }
          }
        }
      });
    } catch (error) {
      logError(error, 'Failed to get system health', req.user?.id);
      return ErrorHandlers.serverError(res, 'Failed to get system health');
    }
  };
}
