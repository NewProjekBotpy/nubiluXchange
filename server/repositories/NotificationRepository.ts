import type { INotificationRepository } from "./interfaces/INotificationRepository";
import type {
  Notification,
  InsertNotification,
  PushSubscription,
  InsertPushSubscription
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, and } from "drizzle-orm";
import { notifications, pushSubscriptions } from "@shared/schema";

/**
 * NotificationRepository
 * 
 * Handles all database operations related to notifications and push subscriptions.
 * Implements the INotificationRepository interface.
 */
export class NotificationRepository implements INotificationRepository {
  
  // ===========================
  // Notification Operations
  // ===========================

  /**
   * Get a single notification by ID
   */
  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  /**
   * Get all notifications for a specific user, ordered by creation date (newest first)
   */
  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  /**
   * Create a new notification
   */
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  /**
   * Update an existing notification
   */
  async updateNotification(id: number, updates: Partial<Notification>): Promise<Notification | undefined> {
    const [updatedNotification] = await db.update(notifications)
      .set(updates)
      .where(eq(notifications.id, id))
      .returning();
    return updatedNotification;
  }

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  // ===========================
  // Push Subscription Operations
  // ===========================

  /**
   * Get all active push subscriptions for a user
   */
  async getPushSubscriptionsByUserId(userId: number): Promise<PushSubscription[]> {
    return await db.select()
      .from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.isActive, true)
      ));
  }

  /**
   * Save or update a push subscription for a user
   * If the subscription endpoint already exists, it will be updated.
   * Otherwise, a new subscription will be created.
   */
  async savePushSubscription(userId: number, subscription: any): Promise<PushSubscription> {
    // Check if subscription already exists
    const existingSubscription = await db.select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .limit(1);

    if (existingSubscription.length > 0) {
      // Update existing subscription
      const updated = await db.update(pushSubscriptions)
        .set({
          userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
        .returning();
      return updated[0];
    } else {
      // Create new subscription
      const result = await db.insert(pushSubscriptions)
        .values({
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: subscription.userAgent || null,
          isActive: true
        })
        .returning();
      return result[0];
    }
  }

  /**
   * Remove (deactivate) a push subscription by endpoint
   * This doesn't delete the subscription, just marks it as inactive
   */
  async removePushSubscription(endpoint: string): Promise<void> {
    await db.update(pushSubscriptions)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(pushSubscriptions.endpoint, endpoint));
  }
}
