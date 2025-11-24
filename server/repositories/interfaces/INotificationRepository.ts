import type {
  Notification,
  InsertNotification,
  PushSubscription,
  InsertPushSubscription
} from "@shared/schema";

export interface INotificationRepository {
  // Notification operations
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, updates: Partial<Notification>): Promise<Notification | undefined>;
  markNotificationAsRead(id: number): Promise<void>;
  deleteNotification(id: number): Promise<void>;

  // Push subscription operations
  getPushSubscriptionsByUserId(userId: number): Promise<PushSubscription[]>;
  savePushSubscription(userId: number, subscription: any): Promise<PushSubscription>;
  removePushSubscription(endpoint: string): Promise<void>;
}
