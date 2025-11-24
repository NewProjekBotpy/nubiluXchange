import {
  chats, messages, messageReactions, chatReadTracking, chatMonitoring, pushSubscriptions,
  users, products, escrowTransactions,
  type Chat, type InsertChat,
  type Message, type InsertMessage,
  type MessageReaction, type InsertMessageReaction,
  type ChatReadTracking, type InsertChatReadTracking,
  type ChatMonitoring, type InsertChatMonitoring,
  type PushSubscription, type InsertPushSubscription,
  type EscrowTransaction,
  type User,
} from "@shared/schema";
import { IChatRepository } from "./interfaces/IChatRepository";
import { db } from "../db";
import { eq, desc, and, or, gt, lt, gte, lte, ne, count, sql, inArray } from "drizzle-orm";

/**
 * ChatRepository - Handles all chat and message related database operations
 * Extracted from DatabaseStorage to improve code organization and maintainability
 */
export class ChatRepository implements IChatRepository {
  // =============================================================================
  // CHAT OPERATIONS
  // =============================================================================

  /**
   * Get a single chat by ID
   */
  async getChat(id: number): Promise<Chat | undefined> {
    const [chat] = await db.select().from(chats).where(eq(chats.id, id));
    return chat || undefined;
  }

  /**
   * Get all chats for a specific user (as buyer or seller)
   */
  async getChatsByUser(userId: number): Promise<Chat[]> {
    return await db.select().from(chats)
      .where(or(eq(chats.buyerId, userId), eq(chats.sellerId, userId)))
      .orderBy(desc(chats.createdAt));
  }

  /**
   * Get chat with detailed information including product, buyer, seller, and latest message
   */
  async getChatWithDetails(id: number): Promise<any> {
    const result = await db.select({
      // Chat fields
      id: chats.id,
      productId: chats.productId,
      buyerId: chats.buyerId,
      sellerId: chats.sellerId,
      status: chats.status,
      createdAt: chats.createdAt,
      // Product fields
      productTitle: products.title,
      productThumbnail: products.thumbnail,
      productPrice: products.price,
      productCategory: products.category,
      // Buyer fields
      buyerUsername: users.username,
      buyerDisplayName: users.displayName,
      buyerProfilePicture: users.profilePicture,
      buyerIsVerified: users.isVerified,
      // Seller fields - we'll get this in a separate query
    })
    .from(chats)
    .leftJoin(products, eq(chats.productId, products.id))
    .leftJoin(users, eq(chats.buyerId, users.id))
    .where(eq(chats.id, id));
    
    if (!result[0]) return undefined;
    
    // Get seller details separately
    const sellerResult = await db.select({
      sellerUsername: users.username,
      sellerDisplayName: users.displayName,
      sellerProfilePicture: users.profilePicture,
      sellerIsVerified: users.isVerified,
    })
    .from(users)
    .where(eq(users.id, result[0].sellerId));
    
    // Get latest message
    const latestMessage = await db.select({
      content: messages.content,
      messageType: messages.messageType,
      createdAt: messages.createdAt,
      senderId: messages.senderId
    })
    .from(messages)
    .where(eq(messages.chatId, id))
    .orderBy(desc(messages.createdAt))
    .limit(1);
    
    // Get escrow transaction for this chat if exists
    const escrowTransaction = result[0].productId ? 
      await this.getEscrowTransactionByChat(result[0].productId, result[0].buyerId, result[0].sellerId) :
      null;
    
    return {
      ...result[0],
      ...sellerResult[0],
      lastMessage: latestMessage[0]?.content || null,
      lastMessageType: latestMessage[0]?.messageType || null,
      lastMessageTime: latestMessage[0]?.createdAt || null,
      lastMessageSenderId: latestMessage[0]?.senderId || null,
      unreadCount: 0,
      // Escrow transaction info
      escrowTransaction: escrowTransaction || null
    };
  }

  /**
   * Get all chats for a user with detailed information
   * Includes other participant info, product details, latest message, and unread count
   */
  async getChatsWithDetailsByUser(userId: number): Promise<any[]> {
    // Get all chats for user with product and user details
    const result = await db.select({
      // Chat fields
      id: chats.id,
      productId: chats.productId,
      buyerId: chats.buyerId,
      sellerId: chats.sellerId,
      status: chats.status,
      createdAt: chats.createdAt,
      // Product fields
      productTitle: products.title,
      productThumbnail: products.thumbnail,
      productPrice: products.price,
      productCategory: products.category,
    })
    .from(chats)
    .leftJoin(products, eq(chats.productId, products.id))
    .where(or(eq(chats.buyerId, userId), eq(chats.sellerId, userId)))
    .orderBy(desc(chats.createdAt));
    
    // FIX BUG #12: Optimize N+1 query by batch fetching users
    // Get all unique user IDs that we need to fetch
    const uniqueUserIds = [...new Set(result.flatMap(chat => 
      [chat.buyerId, chat.sellerId].filter(id => id !== null && id !== userId)
    ))];
    
    // Batch fetch all users in a single query
    const allUsers = uniqueUserIds.length > 0 ? await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      profilePicture: users.profilePicture,
      isVerified: users.isVerified,
    })
    .from(users)
    .where(inArray(users.id, uniqueUserIds)) : [];
    
    // Create a map for quick user lookup
    const userMap = new Map(allUsers.map(user => [user.id, user]));
    
    // Enrich each chat with participant info and latest message
    const enrichedChats = await Promise.all(result.map(async (chat) => {
      // Get the other participant (if current user is buyer, get seller and vice versa)
      const otherUserId = chat.buyerId === userId ? chat.sellerId : chat.buyerId;
      const isCurrentUserBuyer = chat.buyerId === userId;
      
      // Get user from the pre-fetched map instead of making individual queries
      const otherUser = otherUserId ? userMap.get(otherUserId) : null;
      
      // Get latest message (TODO: Further optimize by batch fetching these with window functions)
      const latestMessage = await db.select({
        content: messages.content,
        messageType: messages.messageType,
        createdAt: messages.createdAt,
        senderId: messages.senderId
      })
      .from(messages)
      .where(eq(messages.chatId, chat.id))
      .orderBy(desc(messages.createdAt))
      .limit(1);
      
      // Get escrow transaction for this chat if exists
      const escrowTransaction = chat.productId ? 
        await this.getEscrowTransactionByChat(chat.productId, chat.buyerId, chat.sellerId) :
        null;
      
      // Return the exact structure expected by ChatListItem interface
      return {
        id: chat.id,
        productId: chat.productId,
        buyerId: chat.buyerId,
        sellerId: chat.sellerId,
        status: chat.status,
        createdAt: chat.createdAt,
        // Product info
        productTitle: chat.productTitle || undefined,
        productThumbnail: chat.productThumbnail || undefined,
        productPrice: chat.productPrice || undefined,
        productCategory: chat.productCategory || undefined,
        // Other participant info (properly structured)
        otherUser: otherUser ? {
          username: otherUser.username,
          displayName: otherUser.displayName || undefined,
          profilePicture: otherUser.profilePicture || undefined,
          isVerified: otherUser.isVerified || false,
        } : undefined,
        isCurrentUserBuyer,
        // Latest message info with null-safe defaults
        lastMessage: latestMessage[0]?.content || undefined,
        lastMessageType: latestMessage[0]?.messageType || undefined,
        lastMessageTime: latestMessage[0]?.createdAt || undefined,
        lastMessageSenderId: latestMessage[0]?.senderId || undefined,
        unreadCount: await this.getUnreadCountForChat(userId, chat.id),
        // Escrow transaction info
        escrowTransaction: escrowTransaction || null
      };
    }));
    
    // Sort by latest message time if available, otherwise by chat creation time
    enrichedChats.sort((a, b) => {
      const timeA = a.lastMessageTime || a.createdAt;
      const timeB = b.lastMessageTime || b.createdAt;
      if (!timeA || !timeB) return 0;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
    
    return enrichedChats;
  }

  /**
   * Create a new chat
   */
  async createChat(chat: InsertChat): Promise<Chat> {
    const [newChat] = await db.insert(chats).values(chat).returning();
    return newChat;
  }

  /**
   * Get escrow transaction for a specific chat
   */
  async getEscrowTransactionByChat(productId: number, buyerId: number, sellerId: number): Promise<EscrowTransaction | undefined> {
    const [escrow] = await db.select().from(escrowTransactions)
      .where(
        and(
          eq(escrowTransactions.productId, productId),
          eq(escrowTransactions.buyerId, buyerId),
          eq(escrowTransactions.sellerId, sellerId)
        )
      )
      .orderBy(desc(escrowTransactions.createdAt))
      .limit(1);
    return escrow || undefined;
  }

  /**
   * Get chat analytics for admin dashboard
   */
  async getChatAnalytics(): Promise<{
    totalChats: number;
    activeChats: number;
    flaggedChats: number;
    resolvedFlags: number;
    averageResponseTime: number;
    chatsToday: number;
    messagesTotal: number;
    messagesToday: number;
  }> {
    const allChats = await db.select().from(chats);
    const allMessages = await db.select().from(messages);
    const allFlags = await db.select().from(chatMonitoring);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      totalChats: allChats.length,
      activeChats: allChats.filter(c => c.status === 'active').length,
      flaggedChats: new Set(allFlags.map(f => f.chatId)).size,
      resolvedFlags: allFlags.filter(f => f.isResolved).length,
      averageResponseTime: 0, // TODO: Implement based on message timing
      chatsToday: allChats.filter(c => c.createdAt && new Date(c.createdAt) >= todayStart).length,
      messagesTotal: allMessages.length,
      messagesToday: allMessages.filter(m => m.createdAt && new Date(m.createdAt) >= todayStart).length
    };
  }

  /**
   * Get all chats with detailed information (owner/admin view)
   */
  async getAllChatsWithDetails(): Promise<Array<{
    id: number;
    productId: number;
    productTitle: string;
    buyerUsername: string;
    sellerUsername: string;
    status: string;
    messageCount: number;
    lastMessageAt: string;
    flaggedCount: number;
    riskLevel: string;
    createdAt: string;
  }>> {
    // This would be a complex query - for now returning basic implementation
    const allChats = await db.select().from(chats);
    const allProducts = await db.select().from(products);
    const allUsers = await db.select().from(users);
    const allMessages = await db.select().from(messages);
    const allFlags = await db.select().from(chatMonitoring);

    return allChats.map(chat => {
      const product = allProducts.find(p => p.id === chat.productId);
      const buyer = allUsers.find(u => u.id === chat.buyerId);
      const seller = allUsers.find(u => u.id === chat.sellerId);
      const chatMessages = allMessages.filter(m => m.chatId === chat.id);
      const chatFlags = allFlags.filter(f => f.chatId === chat.id);
      const lastMessage = chatMessages.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })[0];
      const highestRisk = chatFlags.reduce((max, flag) => {
        const levels = { low: 1, medium: 2, high: 3, critical: 4 };
        return levels[flag.riskLevel as keyof typeof levels] > levels[max as keyof typeof levels] ? flag.riskLevel : max;
      }, 'low');

      return {
        id: chat.id,
        productId: chat.productId || 0,
        productTitle: product?.title || 'Unknown Product',
        buyerUsername: buyer?.username || 'Unknown Buyer',
        sellerUsername: seller?.username || 'Unknown Seller',
        status: chat.status,
        messageCount: chatMessages.length,
        lastMessageAt: lastMessage?.createdAt ? lastMessage.createdAt.toISOString() : (chat.createdAt ? chat.createdAt.toISOString() : new Date().toISOString()),
        flaggedCount: chatFlags.length,
        riskLevel: highestRisk,
        createdAt: chat.createdAt ? chat.createdAt.toISOString() : new Date().toISOString()
      };
    });
  }

  // =============================================================================
  // MESSAGE OPERATIONS
  // =============================================================================

  /**
   * Get messages for a specific chat with pagination support
   */
  async getMessagesByChatId(chatId: number, options?: { before?: number; limit?: number }): Promise<Message[]> {
    const conditions = options?.before 
      ? and(eq(messages.chatId, chatId), lt(messages.id, options.before))
      : eq(messages.chatId, chatId);
    
    const baseQuery = db.select()
      .from(messages)
      .where(conditions)
      .orderBy(desc(messages.createdAt));
    
    const result = options?.limit 
      ? await baseQuery.limit(options.limit)
      : await baseQuery;
    
    return result.reverse();
  }

  /**
   * Create a new message
   */
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  /**
   * Get a message by ID
   */
  async getMessageById(messageId: number): Promise<Message | null> {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    return message || null;
  }

  /**
   * Update message status (delivered or read)
   */
  async updateMessageStatus(messageId: number, status: 'delivered' | 'read'): Promise<void> {
    const updateData: any = { status };
    
    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    } else if (status === 'read') {
      updateData.readAt = new Date();
      // Also mark as delivered if not already
      updateData.deliveredAt = new Date();
    }
    
    await db.update(messages)
      .set(updateData)
      .where(eq(messages.id, messageId));
  }

  /**
   * Mark a message as read by a specific user
   */
  async markMessageAsRead(messageId: number, userId: number): Promise<void> {
    // First get the message to get chatId
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!message) return;
    
    // Update message readAt timestamp
    await db.update(messages)
      .set({ 
        readAt: new Date(),
        status: 'read'
      })
      .where(and(
        eq(messages.id, messageId),
        eq(messages.senderId, userId) // Only sender can mark as read
      ));
    
    // Update chat read tracking
    await this.updateChatReadTracking(userId, message.chatId, messageId);
  }
  
  /**
   * Mark a message as delivered by a specific user
   */
  async markMessageAsDelivered(messageId: number, userId: number): Promise<void> {
    // Update message deliveredAt timestamp
    await db.update(messages)
      .set({ 
        deliveredAt: new Date(),
        status: 'delivered'
      })
      .where(and(
        eq(messages.id, messageId),
        eq(messages.senderId, userId) // Only sender can mark as delivered
      ));
  }

  /**
   * Search messages with full-text search and various filters
   */
  async searchMessages(params: {
    query?: string;
    chatId?: number;
    senderId?: number;
    messageType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
    userId: number;
    // New filter parameters
    datePreset?: 'last7' | 'last30' | 'custom';
    senderIds?: number[];
    chatIds?: number[];
    scope?: 'current' | 'all';
  }): Promise<{
    results: Array<Message & { 
      sender: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'>;
      chat: Pick<Chat, 'id' | 'productId' | 'buyerId' | 'sellerId'>;
      highlight?: string;
      snippet?: string;
    }>;
    total: number;
    hasMore: boolean;
  }> {
    const { 
      query, chatId, senderId, messageType, dateFrom, dateTo, 
      limit = 20, offset = 0, userId,
      datePreset, senderIds, chatIds, scope 
    } = params;

    // Build WHERE conditions
    const conditions = [];

    // User must be part of the chat to search messages
    conditions.push(
      or(
        eq(chats.buyerId, userId),
        eq(chats.sellerId, userId)
      )
    );

    // Text search using full-text search or trigram similarity
    if (query && query.trim()) {
      // Use PostgreSQL full-text search with ts_query
      conditions.push(
        sql`to_tsvector('english', ${messages.content}) @@ plainto_tsquery('english', ${query.trim()})`
      );
    }

    // Handle date preset filters
    if (datePreset) {
      if (datePreset === 'last7') {
        conditions.push(sql`${messages.createdAt} >= NOW() - INTERVAL '7 days'`);
      } else if (datePreset === 'last30') {
        conditions.push(sql`${messages.createdAt} >= NOW() - INTERVAL '30 days'`);
      } else if (datePreset === 'custom') {
        // For custom, use dateFrom and dateTo
        if (dateFrom) {
          conditions.push(gte(messages.createdAt, dateFrom));
        }
        if (dateTo) {
          conditions.push(lte(messages.createdAt, dateTo));
        }
      }
    } else {
      // Legacy date filter support (backwards compatible)
      if (dateFrom) {
        conditions.push(gte(messages.createdAt, dateFrom));
      }
      if (dateTo) {
        conditions.push(lte(messages.createdAt, dateTo));
      }
    }

    // Handle scope filter - if scope is 'current', filter by chatId
    if (scope === 'current' && chatId) {
      conditions.push(eq(messages.chatId, chatId));
    } else {
      // Filter by specific chat (legacy support)
      if (chatId) {
        conditions.push(eq(messages.chatId, chatId));
      }
    }

    // Filter by multiple chat IDs
    if (chatIds && chatIds.length > 0) {
      conditions.push(sql`${messages.chatId} = ANY(${chatIds})`);
    }

    // Filter by multiple sender IDs
    if (senderIds && senderIds.length > 0) {
      conditions.push(sql`${messages.senderId} = ANY(${senderIds})`);
    } else if (senderId) {
      // Legacy single sender support
      conditions.push(eq(messages.senderId, senderId));
    }

    // Filter by message type - fix type error by casting to the correct type
    if (messageType && messageType !== 'all') {
      conditions.push(sql`${messages.messageType} = ${messageType}`);
    }

    // Guard against empty conditions array
    const whereCondition = conditions.length > 0 ? and(...conditions) : sql`1=1`;

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: count() })
      .from(messages)
      .leftJoin(chats, eq(messages.chatId, chats.id))
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(whereCondition);

    const total = countResult?.count || 0;

    // Build highlight snippet if query exists
    const highlightSnippet = query && query.trim() 
      ? sql`ts_headline('english', ${messages.content}, plainto_tsquery('english', ${query.trim()}), 'MaxWords=30, MinWords=15, MaxFragments=1')`
      : sql`NULL`;

    // Calculate relevance rank if query exists
    const relevanceRank = query && query.trim()
      ? sql`ts_rank(to_tsvector('english', ${messages.content}), plainto_tsquery('english', ${query.trim()}))`
      : sql`0`;

    // Get paginated results with sender and chat info
    const results = await db
      .select({
        id: messages.id,
        chatId: messages.chatId,
        senderId: messages.senderId,
        content: messages.content,
        messageType: messages.messageType,
        metadata: messages.metadata,
        status: messages.status,
        deliveredAt: messages.deliveredAt,
        readAt: messages.readAt,
        createdAt: messages.createdAt,
        snippet: highlightSnippet,
        sender: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          profilePicture: users.profilePicture,
        },
        chat: {
          id: chats.id,
          productId: chats.productId,
          buyerId: chats.buyerId,
          sellerId: chats.sellerId,
        }
      })
      .from(messages)
      .leftJoin(chats, eq(messages.chatId, chats.id))
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(whereCondition)
      .orderBy(query && query.trim() ? sql`${relevanceRank} DESC, ${messages.createdAt} DESC` : desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      results: results as any,
      total,
      hasMore: offset + results.length < total
    };
  }

  // =============================================================================
  // MESSAGE REACTIONS
  // =============================================================================

  /**
   * Add a reaction to a message
   */
  async addMessageReaction(reaction: InsertMessageReaction): Promise<MessageReaction> {
    const [newReaction] = await db.insert(messageReactions).values(reaction).returning();
    return newReaction;
  }

  /**
   * Remove a user's reaction from a message
   */
  async removeMessageReaction(messageId: number, userId: number): Promise<boolean> {
    const result = await db.delete(messageReactions)
      .where(and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, userId)
      ))
      .returning();
    return result.length > 0;
  }

  /**
   * Get all reactions for a specific message
   */
  async getMessageReactions(messageId: number): Promise<MessageReaction[]> {
    return await db.select().from(messageReactions)
      .where(eq(messageReactions.messageId, messageId))
      .orderBy(messageReactions.createdAt);
  }

  /**
   * Get a specific user's reaction for a message
   */
  async getReactionsByUser(userId: number, messageId: number): Promise<MessageReaction | undefined> {
    const [reaction] = await db.select().from(messageReactions)
      .where(and(
        eq(messageReactions.userId, userId),
        eq(messageReactions.messageId, messageId)
      ));
    return reaction || undefined;
  }

  // =============================================================================
  // CHAT READ TRACKING
  // =============================================================================

  /**
   * Get chat read tracking record for a user in a specific chat
   */
  async getChatReadTracking(userId: number, chatId: number): Promise<ChatReadTracking | undefined> {
    const [tracking] = await db.select()
      .from(chatReadTracking)
      .where(and(
        eq(chatReadTracking.userId, userId),
        eq(chatReadTracking.chatId, chatId)
      ));
    return tracking || undefined;
  }
  
  /**
   * Update or create chat read tracking record
   */
  async updateChatReadTracking(userId: number, chatId: number, lastReadMessageId?: number): Promise<void> {
    const existingTracking = await this.getChatReadTracking(userId, chatId);
    
    if (existingTracking) {
      // Update existing tracking
      await db.update(chatReadTracking)
        .set({
          lastReadMessageId: lastReadMessageId || existingTracking.lastReadMessageId,
          lastReadAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(chatReadTracking.userId, userId),
          eq(chatReadTracking.chatId, chatId)
        ));
    } else {
      // Create new tracking record
      await db.insert(chatReadTracking).values({
        userId,
        chatId,
        lastReadMessageId,
        lastReadAt: new Date()
      });
    }
  }
  
  /**
   * Get unread message count for a user in a specific chat
   */
  async getUnreadCountForChat(userId: number, chatId: number): Promise<number> {
    // Get the last read message timestamp for this user in this chat
    const tracking = await this.getChatReadTracking(userId, chatId);
    
    if (!tracking) {
      // If no tracking record, all messages are unread
      const [{ messageCount }] = await db.select({ messageCount: count() })
        .from(messages)
        .where(and(
          eq(messages.chatId, chatId),
          ne(messages.senderId, userId) // Don't count own messages
        ));
      return Number(messageCount);
    }
    
    // Count messages after last read timestamp that are not from this user
    const [{ messageCount }] = await db.select({ messageCount: count() })
      .from(messages)
      .where(and(
        eq(messages.chatId, chatId),
        ne(messages.senderId, userId), // Don't count own messages
        gt(messages.createdAt, tracking.lastReadAt || new Date(0))
      ));
    
    return Number(messageCount);
  }
  
  /**
   * Get unread counts for all chats for a specific user
   */
  async getUnreadCountsForUser(userId: number): Promise<Record<number, number>> {
    // Get all chats for this user
    const userChats = await this.getChatsByUser(userId);
    const unreadCounts: Record<number, number> = {};
    
    // Calculate unread count for each chat
    for (const chat of userChats) {
      unreadCounts[chat.id] = await this.getUnreadCountForChat(userId, chat.id);
    }
    
    return unreadCounts;
  }

  // =============================================================================
  // CHAT MONITORING
  // =============================================================================

  /**
   * Create a new chat monitoring record
   */
  async createChatMonitoring(monitoring: InsertChatMonitoring): Promise<ChatMonitoring> {
    const [created] = await db.insert(chatMonitoring).values(monitoring).returning();
    return created;
  }

  /**
   * Get a chat monitoring record by ID
   */
  async getChatMonitoring(id: number): Promise<ChatMonitoring | undefined> {
    const [monitoring] = await db.select().from(chatMonitoring).where(eq(chatMonitoring.id, id));
    return monitoring || undefined;
  }

  /**
   * Get all monitoring records for a specific chat
   */
  async getChatMonitoringByChat(chatId: number): Promise<ChatMonitoring[]> {
    return await db.select().from(chatMonitoring)
      .where(eq(chatMonitoring.chatId, chatId))
      .orderBy(desc(chatMonitoring.createdAt));
  }

  /**
   * Get all chat monitoring records with optional filters
   */
  async getAllChatMonitoring(filters?: { riskLevel?: string; isResolved?: boolean; limit?: number }): Promise<ChatMonitoring[]> {
    const baseQuery = db.select().from(chatMonitoring);
    
    const conditions = [];
    if (filters?.riskLevel) {
      conditions.push(eq(chatMonitoring.riskLevel, filters.riskLevel));
    }
    if (filters?.isResolved !== undefined) {
      conditions.push(eq(chatMonitoring.isResolved, filters.isResolved));
    }
    
    // Build query with proper chaining
    const whereQuery = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;
    
    const orderedQuery = whereQuery.orderBy(desc(chatMonitoring.createdAt));
    
    const finalQuery = filters?.limit 
      ? orderedQuery.limit(filters.limit)
      : orderedQuery;
    
    return await finalQuery;
  }

  /**
   * Update a chat monitoring record
   */
  async updateChatMonitoring(id: number, updates: Partial<ChatMonitoring>): Promise<ChatMonitoring | undefined> {
    const [updated] = await db.update(chatMonitoring)
      .set(updates)
      .where(eq(chatMonitoring.id, id))
      .returning();
    return updated || undefined;
  }

  /**
   * Get chat monitoring statistics
   */
  async getChatMonitoringStats(): Promise<{
    totalFlags: number;
    resolvedFlags: number;
    byRiskLevel: Record<string, number>;
    byReason: Record<string, number>;
  }> {
    const allFlags = await db.select().from(chatMonitoring);
    
    const stats = {
      totalFlags: allFlags.length,
      resolvedFlags: allFlags.filter(f => f.isResolved).length,
      byRiskLevel: {} as Record<string, number>,
      byReason: {} as Record<string, number>
    };
    
    allFlags.forEach(flag => {
      stats.byRiskLevel[flag.riskLevel] = (stats.byRiskLevel[flag.riskLevel] || 0) + 1;
      if (flag.flaggedReason) {
        stats.byReason[flag.flaggedReason] = (stats.byReason[flag.flaggedReason] || 0) + 1;
      }
    });
    
    return stats;
  }

  // =============================================================================
  // PUSH SUBSCRIPTIONS (Chat Notifications)
  // =============================================================================

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
   * Save or update a push subscription
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
   * Remove (deactivate) a push subscription
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

// Export a singleton instance
export const chatRepository = new ChatRepository();
