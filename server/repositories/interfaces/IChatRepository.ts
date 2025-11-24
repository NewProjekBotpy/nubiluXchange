import type {
  Chat,
  InsertChat,
  Message,
  InsertMessage,
  MessageReaction,
  InsertMessageReaction,
  ChatReadTracking,
  InsertChatReadTracking,
  ChatMonitoring,
  InsertChatMonitoring,
  PushSubscription,
  InsertPushSubscription,
  User
} from "@shared/schema";

export interface IChatRepository {
  // Chat operations
  getChat(id: number): Promise<Chat | undefined>;
  getChatsByUser(userId: number): Promise<Chat[]>;
  getChatWithDetails(id: number): Promise<any>;
  getChatsWithDetailsByUser(userId: number): Promise<any[]>;
  createChat(chat: InsertChat): Promise<Chat>;

  // Message operations
  getMessagesByChatId(chatId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(messageId: number, userId: number): Promise<void>;
  markMessageAsDelivered(messageId: number, userId: number): Promise<void>;
  searchMessages(params: {
    query?: string;
    chatId?: number;
    senderId?: number;
    messageType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
    userId: number;
  }): Promise<{
    results: Array<Message & { 
      sender: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'>;
      chat: Pick<Chat, 'id' | 'productId' | 'buyerId' | 'sellerId'>;
      highlight?: string;
      snippet?: string;
    }>;
    total: number;
    hasMore: boolean;
  }>;

  // Message reaction operations
  addMessageReaction(reaction: InsertMessageReaction): Promise<MessageReaction>;
  removeMessageReaction(messageId: number, userId: number): Promise<boolean>;
  getMessageReactions(messageId: number): Promise<MessageReaction[]>;
  getReactionsByUser(userId: number, messageId: number): Promise<MessageReaction | undefined>;

  // Chat read tracking operations
  getChatReadTracking(userId: number, chatId: number): Promise<ChatReadTracking | undefined>;
  updateChatReadTracking(userId: number, chatId: number, lastReadMessageId?: number): Promise<void>;
  getUnreadCountForChat(userId: number, chatId: number): Promise<number>;
  getUnreadCountsForUser(userId: number): Promise<Record<number, number>>;

  // Push subscription operations
  getPushSubscriptionsByUserId(userId: number): Promise<PushSubscription[]>;
  savePushSubscription(userId: number, subscription: any): Promise<PushSubscription>;
  removePushSubscription(endpoint: string): Promise<void>;

  // Chat monitoring operations
  createChatMonitoring(monitoring: InsertChatMonitoring): Promise<ChatMonitoring>;
  getChatMonitoring(id: number): Promise<ChatMonitoring | undefined>;
  getChatMonitoringByChat(chatId: number): Promise<ChatMonitoring[]>;
  getAllChatMonitoring(filters?: { riskLevel?: string; isResolved?: boolean; limit?: number }): Promise<ChatMonitoring[]>;
  updateChatMonitoring(id: number, updates: Partial<ChatMonitoring>): Promise<ChatMonitoring | undefined>;
  getChatMonitoringStats(): Promise<{
    totalFlags: number;
    resolvedFlags: number;
    byRiskLevel: Record<string, number>;
    byReason: Record<string, number>;
  }>;
}
