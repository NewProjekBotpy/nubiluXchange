import { db } from '../db';
import { sql, lt, and, isNull } from 'drizzle-orm';
import { logInfo, logError, logWarning } from '../utils/logger';
import { 
  statusUpdates, 
  messages, 
  notifications, 
  transactions,
  statusViews,
  walletTransactions
} from '@shared/schema';

/**
 * Data Cleanup Service
 * Handles automatic cleanup of old and expired data
 */
export class DataCleanupService {
  /**
   * Clean up expired status updates (older than 24 hours)
   */
  static async cleanupExpiredStatuses(): Promise<number> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const result = await db
        .delete(statusUpdates)
        .where(lt(statusUpdates.createdAt, twentyFourHoursAgo))
        .returning({ id: statusUpdates.id });

      const deletedCount = result.length;
      
      if (deletedCount > 0) {
        logInfo(`Cleaned up ${deletedCount} expired status updates`);
      }
      
      return deletedCount;
    } catch (error) {
      logError(error, 'Failed to cleanup expired statuses');
      return 0;
    }
  }

  /**
   * Clean up old read notifications (older than 30 days)
   */
  static async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const result = await db
        .delete(notifications)
        .where(
          and(
            lt(notifications.createdAt, cutoffDate),
            sql`${notifications.isRead} = true`
          )
        )
        .returning({ id: notifications.id });

      const deletedCount = result.length;
      
      if (deletedCount > 0) {
        logInfo(`Cleaned up ${deletedCount} old read notifications`);
      }
      
      return deletedCount;
    } catch (error) {
      logError(error, 'Failed to cleanup old notifications');
      return 0;
    }
  }

  /**
   * Clean up old chat messages (keep messages from last 90 days)
   */
  static async cleanupOldMessages(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const result = await db
        .delete(messages)
        .where(lt(messages.createdAt, cutoffDate))
        .returning({ id: messages.id });

      const deletedCount = result.length;
      
      if (deletedCount > 0) {
        logInfo(`Cleaned up ${deletedCount} old chat messages (older than ${daysToKeep} days)`);
      }
      
      return deletedCount;
    } catch (error) {
      logError(error, 'Failed to cleanup old messages');
      return 0;
    }
  }

  /**
   * Clean up old status views (older than 7 days)
   */
  static async cleanupOldStatusViews(daysToKeep: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const result = await db
        .delete(statusViews)
        .where(lt(statusViews.viewedAt, cutoffDate))
        .returning({ id: statusViews.id });

      const deletedCount = result.length;
      
      if (deletedCount > 0) {
        logInfo(`Cleaned up ${deletedCount} old status views`);
      }
      
      return deletedCount;
    } catch (error) {
      logError(error, 'Failed to cleanup old status views');
      return 0;
    }
  }

  /**
   * Clean up old wallet transaction records (keep last 1 year)
   */
  static async cleanupOldWalletTransactions(daysToKeep: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      // Only delete completed transactions older than cutoff
      const result = await db
        .delete(walletTransactions)
        .where(
          and(
            lt(walletTransactions.createdAt, cutoffDate),
            sql`${walletTransactions.status} = 'completed'`
          )
        )
        .returning({ id: walletTransactions.id });

      const deletedCount = result.length;
      
      if (deletedCount > 0) {
        logInfo(`Cleaned up ${deletedCount} old wallet transactions (older than ${daysToKeep} days)`);
      }
      
      return deletedCount;
    } catch (error) {
      logError(error, 'Failed to cleanup old wallet transactions');
      return 0;
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      // Session table cleanup - delete expired sessions
      const result = await db.execute(
        sql`DELETE FROM session WHERE expire < NOW()`
      );

      const deletedCount = result.rowCount || 0;
      
      if (deletedCount > 0) {
        logInfo(`Cleaned up ${deletedCount} expired sessions`);
      }
      
      return deletedCount;
    } catch (error) {
      logError(error, 'Failed to cleanup expired sessions');
      return 0;
    }
  }

  /**
   * Archive old completed transactions (move to archive table or mark as archived)
   */
  static async archiveOldTransactions(daysToKeep: number = 180): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      // For now, we'll just log - in production you'd move to archive table
      const oldTransactions = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            lt(transactions.createdAt, cutoffDate),
            sql`${transactions.status} = 'completed'`
          )
        );

      const count = oldTransactions.length;
      
      if (count > 0) {
        logInfo(`Found ${count} old transactions ready for archival (older than ${daysToKeep} days)`);
        // TODO: Implement actual archival to separate table
      }
      
      return count;
    } catch (error) {
      logError(error, 'Failed to archive old transactions');
      return 0;
    }
  }

  /**
   * Vacuum analyze database tables for optimization
   */
  static async optimizeTables(): Promise<void> {
    try {
      logInfo('Starting database table optimization...');
      
      const tables = [
        'users',
        'products',
        'messages',
        'chats',
        'transactions',
        'notifications',
        'status_updates',
        'wallet_transactions'
      ];

      for (const table of tables) {
        try {
          await db.execute(sql.raw(`VACUUM ANALYZE ${table}`));
          logInfo(`Optimized table: ${table}`);
        } catch (error) {
          logWarning(`Failed to optimize table ${table}: ${error}`);
        }
      }

      logInfo('Database table optimization completed');
    } catch (error) {
      logError(error, 'Failed to optimize database tables');
    }
  }

  /**
   * Run all cleanup tasks
   */
  static async runAllCleanups(): Promise<{
    expiredStatuses: number;
    oldNotifications: number;
    oldMessages: number;
    oldStatusViews: number;
    oldWalletTransactions: number;
    expiredSessions: number;
    archivedTransactions: number;
  }> {
    logInfo('🧹 Starting comprehensive data cleanup...');
    
    const startTime = Date.now();

    const results = {
      expiredStatuses: await this.cleanupExpiredStatuses(),
      oldNotifications: await this.cleanupOldNotifications(30),
      oldMessages: await this.cleanupOldMessages(90),
      oldStatusViews: await this.cleanupOldStatusViews(7),
      oldWalletTransactions: await this.cleanupOldWalletTransactions(365),
      expiredSessions: await this.cleanupExpiredSessions(),
      archivedTransactions: await this.archiveOldTransactions(180)
    };

    // Optimize tables after cleanup
    await this.optimizeTables();

    const duration = Date.now() - startTime;
    const totalCleaned = Object.values(results).reduce((sum, count) => sum + count, 0);

    logInfo(`✅ Data cleanup completed in ${duration}ms. Total records processed: ${totalCleaned}`, {
      duration,
      results
    });

    return results;
  }

  /**
   * Get cleanup statistics
   */
  static async getCleanupStats(): Promise<any> {
    try {
      const [
        expiredStatusCount,
        oldNotificationCount,
        oldMessageCount,
        oldStatusViewCount,
        expiredSessionCount
      ] = await Promise.all([
        // Count expired statuses
        db
          .select({ count: sql<number>`count(*)` })
          .from(statusUpdates)
          .where(lt(statusUpdates.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)))
          .then(r => Number(r[0]?.count || 0)),
        
        // Count old read notifications
        db
          .select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(
            and(
              lt(notifications.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
              sql`${notifications.isRead} = true`
            )
          )
          .then(r => Number(r[0]?.count || 0)),
        
        // Count old messages
        db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(lt(messages.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)))
          .then(r => Number(r[0]?.count || 0)),
        
        // Count old status views
        db
          .select({ count: sql<number>`count(*)` })
          .from(statusViews)
          .where(lt(statusViews.viewedAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
          .then(r => Number(r[0]?.count || 0)),
        
        // Count expired sessions
        db
          .execute(sql`SELECT COUNT(*) as count FROM session WHERE expire < NOW()`)
          .then(r => Number(r.rows[0]?.count || 0))
      ]);

      return {
        readyForCleanup: {
          expiredStatuses: expiredStatusCount,
          oldNotifications: oldNotificationCount,
          oldMessages: oldMessageCount,
          oldStatusViews: oldStatusViewCount,
          expiredSessions: expiredSessionCount,
          total: expiredStatusCount + oldNotificationCount + oldMessageCount + oldStatusViewCount + expiredSessionCount
        },
        recommendations: this.generateCleanupRecommendations({
          expiredStatusCount,
          oldNotificationCount,
          oldMessageCount,
          oldStatusViewCount,
          expiredSessionCount
        })
      };
    } catch (error) {
      logError(error, 'Failed to get cleanup stats');
      return {
        readyForCleanup: {},
        recommendations: ['Failed to fetch cleanup statistics']
      };
    }
  }

  /**
   * Generate cleanup recommendations
   */
  private static generateCleanupRecommendations(stats: any): string[] {
    const recommendations: string[] = [];

    if (stats.expiredStatusCount > 100) {
      recommendations.push(`${stats.expiredStatusCount} expired status updates should be cleaned up`);
    }

    if (stats.oldNotificationCount > 500) {
      recommendations.push(`${stats.oldNotificationCount} old notifications can be safely removed`);
    }

    if (stats.oldMessageCount > 1000) {
      recommendations.push(`${stats.oldMessageCount} old chat messages are eligible for archival`);
    }

    if (stats.expiredSessionCount > 50) {
      recommendations.push(`${stats.expiredSessionCount} expired sessions should be cleaned up`);
    }

    if (recommendations.length === 0) {
      recommendations.push('No immediate cleanup needed');
    }

    return recommendations;
  }

  /**
   * Ensure there are active status updates
   * Creates sample statuses if count falls below minimum threshold
   */
  static async ensureActiveStatuses(minCount: number = 5): Promise<number> {
    try {
      const now = new Date();
      
      const activeStatuses = await db
        .select({ id: statusUpdates.id })
        .from(statusUpdates)
        .where(
          and(
            sql`${statusUpdates.isPublic} = true`,
            sql`${statusUpdates.expiresAt} > ${now}`
          )
        );

      const currentCount = activeStatuses.length;
      
      if (currentCount >= minCount) {
        return 0;
      }

      const statusesToCreate = minCount - currentCount;
      logInfo(`Creating ${statusesToCreate} sample status updates to maintain minimum threshold`);

      const allUsers = await db.select({ id: sql<number>`id` }).from(sql`users`).limit(4);
      
      if (allUsers.length === 0) {
        logWarning('No users found to create status updates');
        return 0;
      }

      const statusTemplates = {
        text: {
          contents: [
            "Just hit Mythic rank! 🎮🔥",
            "Looking for squad mates! Who's online?",
            "Best gaming session ever! 💯",
            "New skins just dropped! Check them out 👀",
            "GG WP! Amazing match today 🏆"
          ],
          colors: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"]
        },
        image: {
          images: [
            "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800",
            "https://images.unsplash.com/photo-1556438064-2d7646166914?w=800",
            "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800"
          ],
          captions: [
            "Epic gaming setup! 🎮✨",
            "New achievement unlocked! 🏆",
            "Victory royale! 🎉"
          ]
        },
        carousel: {
          imageSets: [
            [
              "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800",
              "https://images.unsplash.com/photo-1556438064-2d7646166914?w=800",
              "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800"
            ]
          ],
          captions: ["My gaming collection! Swipe to see more 📸"]
        }
      };

      const getRandomItem = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)];
      const getExpiryTime = (): Date => {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24);
        return expiry;
      };

      let created = 0;
      for (let i = 0; i < statusesToCreate; i++) {
        const user = getRandomItem(allUsers);
        const typeIndex = i % 3;
        
        let statusData: any = {
          userId: user.id,
          isPublic: true,
          viewCount: Math.floor(Math.random() * 50),
          expiresAt: getExpiryTime(),
          duration: 15
        };

        if (typeIndex === 0) {
          const textContent = getRandomItem(statusTemplates.text.contents);
          statusData = {
            ...statusData,
            content: textContent,
            description: textContent,
            mediaType: "text",
            backgroundColor: getRandomItem(statusTemplates.text.colors)
          };
        } else if (typeIndex === 1) {
          const imageCaption = getRandomItem(statusTemplates.image.captions);
          statusData = {
            ...statusData,
            content: imageCaption,
            description: imageCaption,
            media: getRandomItem(statusTemplates.image.images),
            mediaType: "image"
          };
        } else {
          const carouselCaption = getRandomItem(statusTemplates.carousel.captions);
          statusData = {
            ...statusData,
            content: carouselCaption,
            description: carouselCaption,
            images: getRandomItem(statusTemplates.carousel.imageSets),
            mediaType: "carousel"
          };
        }

        await db.insert(statusUpdates).values(statusData);
        created++;
      }

      logInfo(`Successfully created ${created} sample status updates`);
      return created;
    } catch (error) {
      logError(error, 'Failed to ensure active statuses');
      return 0;
    }
  }
}
