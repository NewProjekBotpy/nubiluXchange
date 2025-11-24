import { db } from "../db";
import { 
  users, products, chats, messages, transactions, walletTransactions, notifications 
} from "@shared/schema";
import { eq, desc, asc, and, or, gte, lte, ne, gt, count, sql, inArray } from "drizzle-orm";

/**
 * Optimized query functions that leverage database indexes
 * for faster data retrieval and reduced lock contention
 */

export class OptimizedQueries {
  
  /**
   * Fast product queries using indexed columns
   */
  static async getActiveProductsByCategory(category: string, limit = 20, offset = 0) {
    // Uses products_category_status_idx index
    return await db
      .select()
      .from(products)
      .where(and(
        eq(products.category, category),
        eq(products.status, 'active')
      ))
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);
  }

  static async getSellerProducts(sellerId: number, status?: string, limit = 20, offset = 0) {
    // Uses products_seller_status_idx index
    const conditions = [eq(products.sellerId, sellerId)];
    if (status) {
      conditions.push(eq(products.status, status));
    }
    
    return await db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);
  }

  static async getPremiumProducts(limit = 20, offset = 0) {
    // Uses products_premium_status_idx index
    return await db
      .select()
      .from(products)
      .where(and(
        eq(products.isPremium, true),
        eq(products.status, 'active')
      ))
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Fast user chat queries using indexed columns
   */
  static async getUserChats(userId: number, status = 'active', limit = 50) {
    // Uses chats_buyer_status_idx and chats_seller_status_idx indexes
    return await db
      .select({
        id: chats.id,
        productId: chats.productId,
        buyerId: chats.buyerId,
        sellerId: chats.sellerId,
        status: chats.status,
        createdAt: chats.createdAt,
        // Include product info for better UX
        productTitle: products.title,
        productThumbnail: products.thumbnail
      })
      .from(chats)
      .leftJoin(products, eq(chats.productId, products.id))
      .where(and(
        or(
          eq(chats.buyerId, userId),
          eq(chats.sellerId, userId)
        ),
        eq(chats.status, status)
      ))
      .orderBy(desc(chats.createdAt))
      .limit(limit);
  }

  /**
   * Optimized message queries with pagination
   */
  static async getChatMessages(chatId: number, limit = 50, beforeId?: number) {
    // Uses messages_chat_created_at_idx index
    let conditions = [eq(messages.chatId, chatId)];
    
    if (beforeId) {
      conditions.push(lte(messages.id, beforeId));
    }
    
    return await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  static async getUnreadMessageCount(chatId: number, userId: number, lastReadMessageId?: number) {
    // Uses messages_status_chat_idx index for efficient counting
    let conditions = [
      eq(messages.chatId, chatId),
      ne(messages.senderId, userId) // Don't count own messages as unread
    ];
    
    if (lastReadMessageId) {
      conditions.push(gt(messages.id, lastReadMessageId));
    }
    
    const result = await db
      .select({ count: count() })
      .from(messages)
      .where(and(...conditions));
    
    return result[0]?.count || 0;
  }

  /**
   * Fast transaction queries using indexed columns
   */
  static async getUserTransactions(userId: number, status?: string, limit = 20, offset = 0) {
    // Uses transactions_buyer_status_idx and transactions_seller_status_idx indexes
    let conditions = [
      or(
        eq(transactions.buyerId, userId),
        eq(transactions.sellerId, userId)
      )
    ];
    
    if (status) {
      conditions.push(eq(transactions.status, status));
    }
    
    return await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  static async getPendingTransactions(userId: number) {
    // Uses transactions_buyer_status_idx index
    return await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.buyerId, userId),
        eq(transactions.status, 'pending')
      ))
      .orderBy(desc(transactions.createdAt))
      .limit(10); // Limit to prevent performance issues
  }

  /**
   * Fast wallet transaction queries
   */
  static async getUserWalletTransactions(userId: number, type?: string, limit = 20, offset = 0) {
    // Uses wallet_transactions_user_type_status_idx index
    let conditions = [eq(walletTransactions.userId, userId)];
    
    if (type) {
      conditions.push(eq(walletTransactions.type, type));
    }
    
    return await db
      .select()
      .from(walletTransactions)
      .where(and(...conditions))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Batch operations to reduce database round trips
   */
  static async getMultipleProductsById(productIds: number[]) {
    if (productIds.length === 0) return [];
    
    return await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));
  }

  static async getMultipleUsersById(userIds: number[]) {
    if (userIds.length === 0) return [];
    
    return await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        profilePicture: users.profilePicture,
        isVerified: users.isVerified,
        role: users.role
      })
      .from(users)
      .where(inArray(users.id, userIds));
  }

  /**
   * Fast notification queries using indexed columns
   */
  static async getUserNotifications(userId: number, unreadOnly = false, limit = 20, offset = 0) {
    // Uses notifications_user_is_read_idx index
    let conditions = [eq(notifications.userId, userId)];
    
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }
    
    return await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  static async getUnreadNotificationCount(userId: number): Promise<number> {
    // Uses notifications_user_is_read_idx index for fast counting
    const result = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    
    return result[0]?.count || 0;
  }

  /**
   * Optimized dashboard queries that fetch minimal data
   */
  static async getDashboardStats(userId: number) {
    // Execute multiple optimized queries in parallel
    const [
      activeChats,
      pendingTransactions,
      unreadNotifications,
      walletBalance
    ] = await Promise.all([
      // Fast chat count using index
      db.select({ count: count() }).from(chats)
        .where(and(
          or(eq(chats.buyerId, userId), eq(chats.sellerId, userId)),
          eq(chats.status, 'active')
        )),
      
      // Fast pending transaction count
      db.select({ count: count() }).from(transactions)
        .where(and(
          eq(transactions.buyerId, userId),
          eq(transactions.status, 'pending')
        )),
      
      // Fast unread notification count
      this.getUnreadNotificationCount(userId),
      
      // Fast balance lookup
      db.select({ balance: users.walletBalance }).from(users)
        .where(eq(users.id, userId))
    ]);
    
    return {
      activeChatsCount: activeChats[0]?.count || 0,
      pendingTransactionsCount: pendingTransactions[0]?.count || 0,
      unreadNotificationsCount: unreadNotifications,
      walletBalance: walletBalance[0]?.balance || "0"
    };
  }

  /**
   * Lock-free balance check using SELECT without FOR UPDATE
   */
  static async checkBalanceWithoutLock(userId: number): Promise<string> {
    const result = await db
      .select({ balance: users.walletBalance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return result[0]?.balance || "0";
  }

  /**
   * Efficient existence checks
   */
  static async chatExists(buyerId: number, sellerId: number, productId?: number): Promise<boolean> {
    let conditions = [
      eq(chats.buyerId, buyerId),
      eq(chats.sellerId, sellerId)
    ];
    
    if (productId) {
      conditions.push(eq(chats.productId, productId));
    }
    
    const result = await db
      .select({ id: chats.id })
      .from(chats)
      .where(and(...conditions))
      .limit(1);
    
    return result.length > 0;
  }

  static async userExists(userId: number): Promise<boolean> {
    const result = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return result.length > 0;
  }

  static async productExists(productId: number, status = 'active'): Promise<boolean> {
    const result = await db
      .select({ id: products.id })
      .from(products)
      .where(and(
        eq(products.id, productId),
        eq(products.status, status)
      ))
      .limit(1);
    
    return result.length > 0;
  }
}