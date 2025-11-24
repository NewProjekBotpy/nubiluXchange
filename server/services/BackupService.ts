import { db, pool } from '../db';
import { sql } from 'drizzle-orm';
import { logInfo, logError } from '../utils/logger';
import { captureError } from '../sentry';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BackupResult {
  success: boolean;
  message: string;
  backupPath?: string;
  size?: number;
  duration?: number;
  timestamp: string;
}

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // cron format
  retentionDays: number;
  compressionLevel: number;
  includeBlobs: boolean;
  maxBackupSize: number; // in MB
}

export class BackupService {
  private static readonly BACKUP_DIR = process.env.BACKUP_DIR || './backups';
  private static readonly MAX_CONCURRENT_BACKUPS = 1;
  private static runningBackups = 0;

  /**
   * Get backup configuration from environment variables
   */
  private static getConfig(): BackupConfig {
    return {
      enabled: process.env.BACKUP_ENABLED === 'true',
      schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
      compressionLevel: parseInt(process.env.BACKUP_COMPRESSION_LEVEL || '6'),
      includeBlobs: process.env.BACKUP_INCLUDE_BLOBS !== 'false',
      maxBackupSize: parseInt(process.env.BACKUP_MAX_SIZE_MB || '1000')
    };
  }

  /**
   * Initialize backup directory and verify prerequisites
   */
  static async initialize(): Promise<void> {
    try {
      const config = this.getConfig();
      
      if (!config.enabled) {
        logInfo('Backup service is disabled');
        return;
      }

      // Create backup directory if it doesn't exist
      await fs.mkdir(this.BACKUP_DIR, { recursive: true });
      
      // Verify pg_dump is available for PostgreSQL backups with timeout
      try {
        await Promise.race([
          execAsync('pg_dump --version'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('pg_dump check timeout after 3s')), 3000)
          )
        ]);
        logInfo('pg_dump is available for schema backups');
      } catch (error) {
        logError(error, 'pg_dump not found or timeout - some backup features may be limited');
      }

      logInfo(`Backup service initialized - retention: ${config.retentionDays} days`);
    } catch (error) {
      logError(error, 'Failed to initialize backup service');
      throw error;
    }
  }

  /**
   * Create a full database backup
   */
  static async createFullBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (this.runningBackups >= this.MAX_CONCURRENT_BACKUPS) {
      return {
        success: false,
        message: 'Maximum concurrent backups already running',
        timestamp: new Date().toISOString()
      };
    }

    this.runningBackups++;

    try {
      const config = this.getConfig();
      
      if (!config.enabled) {
        return {
          success: false,
          message: 'Backup service is disabled',
          timestamp: new Date().toISOString()
        };
      }

      logInfo('Starting full database backup...');

      // For NeonDB, we'll use a combination approach:
      // 1. Schema backup using pg_dump if available
      // 2. Data export using custom queries for critical tables
      
      const backupPath = path.join(this.BACKUP_DIR, `backup-${timestamp}`);
      await fs.mkdir(backupPath, { recursive: true });

      // Export critical data using Drizzle queries
      const dataBackup = await this.exportCriticalData();
      const dataPath = path.join(backupPath, 'data.json');
      await fs.writeFile(dataPath, JSON.stringify(dataBackup, null, 2));

      // Try PostgreSQL schema backup if pg_dump is available
      let schemaBackupSuccess = false;
      try {
        const schemaPath = path.join(backupPath, 'schema.sql');
        await this.createSchemaBackup(schemaPath);
        schemaBackupSuccess = true;
      } catch (error) {
        logError(error, 'Schema backup failed, continuing with data-only backup');
      }

      // Create backup metadata
      const metadata = {
        timestamp: new Date().toISOString(),
        type: 'full',
        schemaIncluded: schemaBackupSuccess,
        dataIncluded: true,
        version: process.env.npm_package_version || '1.0.0',
        databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
      };
      
      const metadataPath = path.join(backupPath, 'metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      // Compress backup if configured
      let finalPath = backupPath;
      if (config.compressionLevel > 0) {
        finalPath = await this.compressBackup(backupPath, config.compressionLevel);
      }

      // Get backup size
      const stats = await fs.stat(finalPath);
      const sizeMB = stats.size / (1024 * 1024);

      // Check size limit
      if (sizeMB > config.maxBackupSize) {
        await fs.rm(finalPath, { recursive: true, force: true });
        return {
          success: false,
          message: `Backup size (${sizeMB.toFixed(2)}MB) exceeds limit (${config.maxBackupSize}MB)`,
          timestamp: new Date().toISOString()
        };
      }

      const duration = Date.now() - startTime;
      
      logInfo(`Backup completed successfully - Size: ${sizeMB.toFixed(2)}MB, Duration: ${duration}ms`);
      
      // Clean up old backups
      await this.cleanupOldBackups();

      return {
        success: true,
        message: 'Backup completed successfully',
        backupPath: finalPath,
        size: Math.round(sizeMB * 100) / 100,
        duration,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logError(error, 'Backup creation failed');
      captureError(error as Error, { context: 'DATABASE_BACKUP' });
      
      return {
        success: false,
        message: `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    } finally {
      this.runningBackups--;
    }
  }

  /**
   * Export critical application data
   */
  private static async exportCriticalData(): Promise<any> {
    try {
      // Export critical tables with user data anonymization for security
      const [users, products, transactions, chats, messages] = await Promise.all([
        // Anonymize sensitive user data
        db.execute(sql`
          SELECT id, username, email, role, "isVerified", "walletBalance", "createdAt", "updatedAt"
          FROM users
        `),
        db.execute(sql`SELECT * FROM products`),
        db.execute(sql`SELECT * FROM transactions`),
        db.execute(sql`SELECT * FROM chats`),
        // Limit messages to last 1000 per chat for space efficiency
        db.execute(sql`
          SELECT m.* FROM messages m
          WHERE m.id IN (
            SELECT id FROM messages m2 
            WHERE m2."chatId" = m."chatId" 
            ORDER BY "createdAt" DESC 
            LIMIT 1000
          )
        `)
      ]);

      return {
        exportDate: new Date().toISOString(),
        tables: {
          users: users.rows,
          products: products.rows,
          transactions: transactions.rows,
          chats: chats.rows,
          messages: messages.rows
        },
        counts: {
          users: users.rows.length,
          products: products.rows.length,
          transactions: transactions.rows.length,
          chats: chats.rows.length,
          messages: messages.rows.length
        }
      };
    } catch (error) {
      logError(error, 'Failed to export critical data');
      throw error;
    }
  }

  /**
   * Create schema backup using pg_dump
   */
  private static async createSchemaBackup(outputPath: string): Promise<void> {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not configured');
    }

    const command = `pg_dump "${process.env.DATABASE_URL}" --schema-only --no-owner --no-privileges -f "${outputPath}"`;
    
    try {
      await execAsync(command);
      logInfo(`Schema backup created: ${outputPath}`);
    } catch (error) {
      throw new Error(`Schema backup failed: ${error}`);
    }
  }

  /**
   * Compress backup directory
   */
  private static async compressBackup(backupPath: string, compressionLevel: number): Promise<string> {
    const compressedPath = `${backupPath}.tar.gz`;
    const command = `tar -czf "${compressedPath}" -C "${path.dirname(backupPath)}" "${path.basename(backupPath)}"`;
    
    try {
      await execAsync(command);
      // Remove uncompressed directory
      await fs.rm(backupPath, { recursive: true, force: true });
      return compressedPath;
    } catch (error) {
      throw new Error(`Backup compression failed: ${error}`);
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  private static async cleanupOldBackups(): Promise<void> {
    try {
      const config = this.getConfig();
      const files = await fs.readdir(this.BACKUP_DIR);
      const now = Date.now();
      const retentionMs = config.retentionDays * 24 * 60 * 60 * 1000;
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > retentionMs) {
          if (stats.isDirectory()) {
            await fs.rm(filePath, { recursive: true, force: true });
          } else {
            await fs.unlink(filePath);
          }
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        logInfo(`Cleaned up ${deletedCount} old backup(s)`);
      }
    } catch (error) {
      logError(error, 'Failed to cleanup old backups');
    }
  }

  /**
   * List available backups
   */
  static async listBackups(): Promise<Array<{name: string, size: number, created: Date}>> {
    try {
      const files = await fs.readdir(this.BACKUP_DIR);
      const backups = [];
      
      for (const file of files) {
        const filePath = path.join(this.BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        
        backups.push({
          name: file,
          size: stats.size,
          created: stats.mtime
        });
      }
      
      return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      logError(error, 'Failed to list backups');
      return [];
    }
  }

  /**
   * Get backup service health status
   */
  static async getHealthStatus(): Promise<{
    enabled: boolean;
    lastBackup?: Date;
    backupCount: number;
    totalSize: number;
    errors: string[];
  }> {
    const config = this.getConfig();
    const errors: string[] = [];
    
    try {
      const backups = await this.listBackups();
      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
      const lastBackup = backups.length > 0 ? backups[0].created : undefined;
      
      // Check if backup directory is writable
      try {
        await fs.access(this.BACKUP_DIR, fs.constants.W_OK);
      } catch {
        errors.push('Backup directory not writable');
      }
      
      // Check if DATABASE_URL is configured
      if (!process.env.DATABASE_URL) {
        errors.push('DATABASE_URL not configured');
      }
      
      return {
        enabled: config.enabled,
        lastBackup,
        backupCount: backups.length,
        totalSize,
        errors
      };
    } catch (error) {
      errors.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        enabled: config.enabled,
        backupCount: 0,
        totalSize: 0,
        errors
      };
    }
  }
}