import { 
  users, products, chats, messages, messageReactions, transactions, walletTransactions, 
  statusUpdates, news, notifications, posterGenerations, escrowTransactions, reposts, reviews, reviewHelpfulVotes, videoComments, statusViews,
  adminConfigs, adminTemplates, adminRules, adminBlacklist, adminActivityLogs, adminOtpCodes,
  moneyRequests, ewalletConnections, serviceOrders,
  adminVerificationDocuments, revenueReports, ownerConfigs, chatMonitoring,
  userInteractions, userReports, userPreferences,
  fraudAlerts, securityAlerts, verificationSessions,
  uploadedFiles, videoContent, videoContentLikes, videoContentSaves, videoContentComments,
  type User, type InsertUser, type Product, type InsertProduct,
  type Chat, type InsertChat, type Message, type InsertMessage,
  type MessageReaction, type InsertMessageReaction,
  type Transaction, type InsertTransaction, type WalletTransaction, type InsertWalletTransaction,
  type StatusUpdate, type InsertStatusUpdate, type StatusUpdateWithUser, type News, type InsertNews,
  type Notification, type InsertNotification, type PosterGeneration, type InsertPosterGeneration,
  type EscrowTransaction, type InsertEscrowTransaction, type Repost, type InsertRepost,
  type Review, type InsertReview, type ReviewHelpfulVote, type InsertReviewHelpfulVote,
  type VideoComment, type InsertVideoComment, type StatusView, type InsertStatusView,
  type AdminConfig, type InsertAdminConfig, type AdminTemplate, type InsertAdminTemplate,
  type AdminRule, type InsertAdminRule, type AdminBlacklist, type InsertAdminBlacklist,
  type AdminActivityLog, type InsertAdminActivityLog, type AdminOtpCode, type InsertAdminOtpCode,
  type MoneyRequest, type InsertMoneyRequest, type EwalletConnection, type InsertEwalletConnection,
  type ServiceOrder, type InsertServiceOrder,
  type AdminVerificationDocument, type InsertAdminVerificationDocument,
  type RevenueReport, type InsertRevenueReport, type OwnerConfig, type InsertOwnerConfig,
  type ChatMonitoring, type InsertChatMonitoring,
  type UserInteraction, type InsertUserInteraction, type UserReport, type InsertUserReport,
  type UserPreferences, type InsertUserPreferences,
  type FraudAlert, type InsertFraudAlert,
  type SecurityAlert, type InsertSecurityAlert,
  type VerificationSession, type InsertVerificationSession,
  type UploadedFile, type InsertUploadedFile,
  type VideoContent, type InsertVideoContent, type VideoContentWithUser,
  type VideoContentLike, type InsertVideoContentLike,
  type VideoContentSave, type InsertVideoContentSave,
  type VideoContentComment, type InsertVideoContentComment,
  chatReadTracking, type ChatReadTracking, type InsertChatReadTracking,
  pushSubscriptions, type PushSubscription, type InsertPushSubscription,
  seasons, seasonParticipants, seasonRewards,
  type Season, type InsertSeason, type SeasonParticipant, type InsertSeasonParticipant,
  type SeasonReward, type InsertSeasonReward,
  smsLogs,
  type SmsLog, type InsertSmsLog
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, or, gt, lt, gte, lte, ne, count, sum, like, ilike, sql } from "drizzle-orm";
import session, { SessionData, Store } from "express-session";
import connectPg from "connect-pg-simple";

// Import all repositories
import { UserRepository } from "./repositories/UserRepository";
import { ProductRepository } from "./repositories/ProductRepository";
import { ChatRepository } from "./repositories/ChatRepository";
import { AdminRepository } from "./repositories/AdminRepository";
import { TransactionRepository } from "./repositories/TransactionRepository";
import { PaymentsRepository } from "./repositories/PaymentsRepository";
import { MediaRepository } from "./repositories/MediaRepository";
import { NotificationRepository } from "./repositories/NotificationRepository";
import { ContentRepository } from "./repositories/ContentRepository";
import { SystemRepository } from "./repositories/SystemRepository";

// Re-export types for convenience
export type { SecurityAlert, VerificationSession };

// VerificationDocument type alias for AdminVerificationDocument
export type VerificationDocument = AdminVerificationDocument;

// File upload tracking types
export interface FileItem extends UploadedFile {
  uploaderUsername: string;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  imageCount: number;
  videoCount: number;
  documentCount: number;
  otherCount: number;
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getProducts(filters?: { 
    category?: string; 
    sellerId?: number; 
    limit?: number; 
    offset?: number;
    excludeProductIds?: number[];
    excludeSellerIds?: number[];
    sortBy?: string;
    status?: string;
    searchQuery?: string;
    minPrice?: number;
    maxPrice?: number;
    isPremium?: boolean;
  }): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<Product>): Promise<Product | undefined>;
  
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
  
  // Transaction operations
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionByPaymentId(paymentId: string): Promise<Transaction | undefined>;
  getTransactionsByUser(userId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  
  // Wallet operations
  getWalletBalance(userId: number): Promise<string>;
  updateWalletBalance(userId: number, amount: string): Promise<void>;
  updateWalletBalanceInTransaction(updates: Array<{userId: number, amount: string}>, walletTransactionData: InsertWalletTransaction[]): Promise<void>;
  
  // Wallet transaction operations
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  getWalletTransactionsByUser(userId: number): Promise<WalletTransaction[]>;
  
  // Status operations
  getActiveStatusUpdates(): Promise<StatusUpdateWithUser[]>;
  getUserStatusUpdates(userId: number): Promise<StatusUpdateWithUser[]>;
  createStatusUpdate(status: InsertStatusUpdate): Promise<StatusUpdate>;
  deleteStatusUpdate(id: number, userId: number): Promise<boolean>;
  
  // Review operations
  getReview(id: number): Promise<Review | undefined>;
  getReviewsByProduct(productId: number, filters?: { limit?: number; offset?: number }): Promise<Review[]>;
  getReviewsBySeller(sellerId: number, filters?: { limit?: number; offset?: number }): Promise<Review[]>;
  getReviewsByBuyer(buyerId: number, filters?: { limit?: number; offset?: number }): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, updates: Partial<Review>): Promise<Review | undefined>;
  deleteReview(id: number): Promise<boolean>;
  getProductReviewStats(productId: number): Promise<{ averageRating: number; totalReviews: number }>;
  getSellerReviewStats(sellerId: number): Promise<{ averageRating: number; totalReviews: number }>;
  updateProductRatingAndCount(productId: number): Promise<void>;
  checkUserCanReview(buyerId: number, productId: number): Promise<boolean>;
  
  // Review helpful votes operations
  createReviewHelpfulVote(vote: InsertReviewHelpfulVote): Promise<ReviewHelpfulVote>;
  removeReviewHelpfulVote(reviewId: number, userId: number): Promise<boolean>;
  checkUserVotedHelpful(reviewId: number, userId: number): Promise<boolean>;
  getReviewHelpfulVoteCount(reviewId: number): Promise<number>;
  updateReviewHelpfulVotesCount(reviewId: number): Promise<void>;
  
  // Video comments operations  
  getVideoComments(statusId: number, filters?: { limit?: number; offset?: number }): Promise<Array<VideoComment & { user: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'> }>>;
  createVideoComment(comment: InsertVideoComment): Promise<VideoComment>;
  getVideoCommentCount(statusId: number): Promise<number>;
  deleteVideoComment(id: number, userId: number): Promise<boolean>;
  
  // Status views operations
  recordStatusView(statusId: number, viewerId: number): Promise<void>;
  getStatusViews(statusId: number): Promise<Array<{id: number, username: string, profilePicture: string | null, viewedAt: Date}>>;
  getUserStatusViews(userId: number): Promise<number[]>;
  hasUserViewedStatus(statusId: number, viewerId: number): Promise<boolean>;
  
  // News operations
  getPublishedNews(): Promise<News[]>;
  getNewsById(id: number): Promise<News | undefined>;
  createNews(news: InsertNews): Promise<News>;
  updateNews(id: number, updates: Partial<News>): Promise<News | undefined>;
  deleteNews(id: number): Promise<boolean>;
  
  // Admin content management operations
  getNewsCount(): Promise<number>;
  getProductsCount(): Promise<number>;
  getStatusUpdatesCount(): Promise<number>;
  getPendingReviewsCount(): Promise<number>;
  getFlaggedContentCount(): Promise<number>;
  getPublishedTodayCount(): Promise<number>;
  
  getNewsForAdmin(search: string, status: string): Promise<News[]>;
  getProductsForAdmin(search: string, status: string): Promise<any[]>;
  getStatusUpdatesForAdmin(search: string, status: string): Promise<any[]>;
  
  moderateProduct(id: number, data: any): Promise<Product | undefined>;
  moderateStatusUpdate(id: number, data: any): Promise<StatusUpdate | undefined>;
  moderateNews(id: number, data: any): Promise<News | undefined>;
  
  // Notification operations
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, updates: Partial<Notification>): Promise<Notification | undefined>;
  markNotificationAsRead(id: number): Promise<void>;
  deleteNotification(id: number): Promise<void>;
  
  // Poster generation operations
  createPosterGeneration(poster: InsertPosterGeneration): Promise<PosterGeneration>;
  updatePosterGeneration(id: number, updates: Partial<PosterGeneration>): Promise<PosterGeneration | undefined>;
  
  // Escrow transaction operations
  getEscrowTransaction(id: number): Promise<EscrowTransaction | undefined>;
  getEscrowTransactionsByUser(userId: number): Promise<EscrowTransaction[]>;
  getEscrowTransactionsByStatus(status: string): Promise<EscrowTransaction[]>;
  getEscrowTransactionByChat(productId: number, buyerId: number, sellerId: number): Promise<EscrowTransaction | undefined>;
  createEscrowTransaction(escrow: InsertEscrowTransaction): Promise<EscrowTransaction>;
  updateEscrowTransaction(id: number, updates: Partial<EscrowTransaction>): Promise<EscrowTransaction | undefined>;
  getEscrowStats(): Promise<{ pending: number; active: number; completed: number; disputed: number }>;
  
  // Repost operations
  getRepost(userId: number, productId?: number, statusId?: number): Promise<Repost | undefined>;
  createRepost(repost: InsertRepost): Promise<Repost>;
  deleteRepost(userId: number, productId?: number, statusId?: number): Promise<void>;
  getRepostsByUser(userId: number): Promise<Repost[]>;
  getRepostCountByProduct(productId: number): Promise<number>;
  getRepostCountByStatus(statusId: number): Promise<number>;
  
  // Admin configuration operations
  getAdminConfig(key: string): Promise<AdminConfig | undefined>;
  getAllAdminConfigs(): Promise<AdminConfig[]>;
  setAdminConfig(config: InsertAdminConfig): Promise<AdminConfig>;
  updateAdminConfig(key: string, value: string, updatedBy: number): Promise<AdminConfig | undefined>;
  
  // Admin template operations
  getAdminTemplate(id: number): Promise<AdminTemplate | undefined>;
  getAdminTemplatesByType(type: string): Promise<AdminTemplate[]>;
  getAllAdminTemplates(): Promise<AdminTemplate[]>;
  createAdminTemplate(template: InsertAdminTemplate): Promise<AdminTemplate>;
  updateAdminTemplate(id: number, updates: Partial<AdminTemplate>): Promise<AdminTemplate | undefined>;
  deleteAdminTemplate(id: number): Promise<void>;
  
  // Admin rule operations
  getAdminRule(id: number): Promise<AdminRule | undefined>;
  getAdminRulesByType(ruleType: string): Promise<AdminRule[]>;
  getAllAdminRules(): Promise<AdminRule[]>;
  getActiveAdminRules(): Promise<AdminRule[]>;
  createAdminRule(rule: InsertAdminRule): Promise<AdminRule>;
  updateAdminRule(id: number, updates: Partial<AdminRule>): Promise<AdminRule | undefined>;
  deleteAdminRule(id: number): Promise<void>;
  
  // Admin blacklist operations
  getAdminBlacklistItem(id: number): Promise<AdminBlacklist | undefined>;
  getAdminBlacklistByType(type: string): Promise<AdminBlacklist[]>;
  getAllAdminBlacklist(): Promise<AdminBlacklist[]>;
  getActiveAdminBlacklist(): Promise<AdminBlacklist[]>;
  checkBlacklist(type: string, value: string): Promise<AdminBlacklist | undefined>;
  createAdminBlacklistItem(item: InsertAdminBlacklist): Promise<AdminBlacklist>;
  updateAdminBlacklistItem(id: number, updates: Partial<AdminBlacklist>): Promise<AdminBlacklist | undefined>;
  deleteAdminBlacklistItem(id: number): Promise<void>;
  
  // Admin activity logs operations
  createAdminActivityLog(log: InsertAdminActivityLog): Promise<AdminActivityLog>;
  getAdminActivityLogs(filters?: { userId?: number; adminId?: number; action?: string; category?: string; createdAtFrom?: Date; createdAtTo?: Date; limit?: number; offset?: number }): Promise<AdminActivityLog[]>;
  getAdminActivityLogsByUser(userId: number): Promise<AdminActivityLog[]>;
  getAdminActivityLogsByAdmin(adminId: number): Promise<AdminActivityLog[]>;
  getAdminActivityLogsByAction(action: string): Promise<AdminActivityLog[]>;
  getAdminActivityStats(): Promise<{ total: number; byCategory: Record<string, number>; byAction: Record<string, number> }>;
  getRecentAdminActivityCount(action: string, hoursBack: number): Promise<number>;
  
  // Activity logs for users (non-admin view)
  getActivityLogsByUser(userId: number, limit?: number): Promise<AdminActivityLog[]>;
  
  // Admin OTP operations
  createAdminOtp(otp: InsertAdminOtpCode): Promise<AdminOtpCode>;
  getAdminOtp(userId: number, purpose: string): Promise<AdminOtpCode | undefined>;
  validateAdminOtp(userId: number, code: string, purpose: string): Promise<boolean>;
  markAdminOtpAsUsed(id: number): Promise<void>;
  cleanupExpiredOtps(): Promise<void>;
  
  // SMS Logs operations
  createSmsLog(log: InsertSmsLog): Promise<SmsLog>;
  getSmsLogs(filters?: { phoneNumber?: string; status?: string; alertType?: string; limit?: number; offset?: number }): Promise<SmsLog[]>;
  getSmsLogsByPhone(phoneNumber: string): Promise<SmsLog[]>;
  getSmsLogStats(): Promise<{ totalSent: number; totalFailed: number; totalPending: number }>;
  
  // Money Request operations
  createMoneyRequest(request: InsertMoneyRequest): Promise<MoneyRequest>;
  getMoneyRequest(id: number): Promise<MoneyRequest | undefined>;
  getMoneyRequestsByUser(userId: number, type?: 'sent' | 'received'): Promise<MoneyRequest[]>;
  updateMoneyRequest(id: number, updates: Partial<MoneyRequest>): Promise<MoneyRequest | undefined>;
  getPendingRequestsForUser(userId: number): Promise<MoneyRequest[]>;
  
  // E-wallet Connection operations
  createEwalletConnection(connection: InsertEwalletConnection): Promise<EwalletConnection>;
  getEwalletConnection(id: number): Promise<EwalletConnection | undefined>;
  getEwalletConnectionsByUser(userId: number): Promise<EwalletConnection[]>;
  getEwalletConnectionByProvider(userId: number, provider: string): Promise<EwalletConnection | undefined>;
  updateEwalletConnection(id: number, updates: Partial<EwalletConnection>): Promise<EwalletConnection | undefined>;
  deleteEwalletConnection(id: number): Promise<void>;
  
  // Service Order operations
  createServiceOrder(order: InsertServiceOrder): Promise<ServiceOrder>;
  getServiceOrder(id: number): Promise<ServiceOrder | undefined>;
  getServiceOrdersByUser(userId: number): Promise<ServiceOrder[]>;
  getServiceOrderByNumber(orderNumber: string): Promise<ServiceOrder | undefined>;
  updateServiceOrder(id: number, updates: Partial<ServiceOrder>): Promise<ServiceOrder | undefined>;
  
  // Admin Verification Document operations
  createAdminVerificationDocument(document: InsertAdminVerificationDocument): Promise<AdminVerificationDocument>;
  getAdminVerificationDocument(id: number): Promise<AdminVerificationDocument | undefined>;
  getAdminVerificationDocumentsByUser(userId: number): Promise<AdminVerificationDocument[]>;
  getAllPendingDocuments(): Promise<AdminVerificationDocument[]>;
  updateAdminVerificationDocument(id: number, updates: Partial<AdminVerificationDocument>): Promise<AdminVerificationDocument | undefined>;
  deleteAdminVerificationDocument(id: number): Promise<void>;
  
  // Revenue Report operations
  createRevenueReport(report: InsertRevenueReport): Promise<RevenueReport>;
  getRevenueReport(id: number): Promise<RevenueReport | undefined>;
  getRevenueReportByDate(date: Date): Promise<RevenueReport | undefined>;
  getRevenueReports(filters?: { startDate?: Date; endDate?: Date; limit?: number }): Promise<RevenueReport[]>;
  updateRevenueReport(id: number, updates: Partial<RevenueReport>): Promise<RevenueReport | undefined>;
  getRevenueAnalytics(startDate: Date, endDate: Date): Promise<{
    totalRevenue: string;
    totalCommission: string;
    totalTransactions: number;
    averageTransactionValue: string;
    topCategories: Array<{ category: string; revenue: string; count: number }>;
    dailyReports: RevenueReport[];
  }>;
  
  // Owner Config operations
  createOwnerConfig(config: InsertOwnerConfig): Promise<OwnerConfig>;
  getOwnerConfig(key: string): Promise<OwnerConfig | undefined>;
  getAllOwnerConfigs(): Promise<OwnerConfig[]>;
  getOwnerConfigsByCategory(category: string): Promise<OwnerConfig[]>;
  updateOwnerConfig(key: string, value: string, lastModifiedBy: number): Promise<OwnerConfig | undefined>;
  deleteOwnerConfig(key: string): Promise<void>;
  
  // Chat Monitoring operations
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
  
  // Owner-specific analytics operations
  getUserAnalytics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    adminUsers: number;
    verifiedUsers: number;
    pendingAdminRequests: number;
  }>;
  
  getTransactionAnalytics(): Promise<{
    totalTransactions: number;
    completedTransactions: number;
    pendingTransactions: number;
    disputedTransactions: number;
    totalRevenue: string;
    totalCommission: string;
    averageTransactionValue: string;
    transactionsToday: number;
    transactionsThisWeek: number;
    transactionsThisMonth: number;
    revenueToday: string;
    revenueThisWeek: string;
    revenueThisMonth: string;
  }>;
  
  getEscrowAnalytics(): Promise<{
    totalEscrows: number;
    pendingEscrows: number;
    activeEscrows: number;
    completedEscrows: number;
    disputedEscrows: number;
    averageEscrowValue: string;
    escrowsToday: number;
    averageCompletionTime: number;
  }>;
  
  getChatAnalytics(): Promise<{
    totalChats: number;
    activeChats: number;
    flaggedChats: number;
    resolvedFlags: number;
    averageResponseTime: number;
    chatsToday: number;
    messagesTotal: number;
    messagesToday: number;
  }>;
  
  // User interaction operations (for FYP algorithm)
  createUserInteraction(interaction: InsertUserInteraction): Promise<UserInteraction>;
  getUserInteractions(userId: number, filters?: { 
    limit?: number; 
    offset?: number; 
    interactionType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<UserInteraction[]>;
  getAllUserInteractions(filters?: {
    startDate?: Date;
    endDate?: Date;
    interactionType?: string;
    limit?: number;
  }): Promise<UserInteraction[]>;

  // User preferences operations
  getUserPreferences(userId: number): Promise<UserPreferences | null>;
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: number, updates: Partial<UserPreferences>): Promise<UserPreferences | null>;

  // User reports operations
  createUserReport(report: InsertUserReport): Promise<UserReport>;
  getUserReport(id: number): Promise<UserReport | undefined>;
  getUserReports(filters?: {
    reporterId?: number;
    reportedUserId?: number;
    reportedProductId?: number;
    status?: string;
    reportType?: string;
    limit?: number;
    offset?: number;
  }): Promise<UserReport[]>;
  updateUserReport(id: number, updates: Partial<UserReport>): Promise<UserReport | undefined>;

  // File upload tracking operations
  getUploadedFiles(filters?: { uploadedBy?: number; category?: string; limit?: number }): Promise<FileItem[]>;
  getUploadedFile(id: number): Promise<FileItem | undefined>;
  createUploadedFile(fileData: InsertUploadedFile): Promise<UploadedFile>;
  deleteUploadedFile(id: number): Promise<boolean>;
  getUploadedFilesStats(): Promise<StorageStats>;

  // Blacklist operations
  getBlacklistEntries(filters?: {
    type?: string;
    value?: string;
    targetId?: number;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<AdminBlacklist[]>;
  createBlacklistEntry(entry: InsertAdminBlacklist): Promise<AdminBlacklist>;
  updateBlacklistEntry(id: number, updates: Partial<AdminBlacklist>): Promise<AdminBlacklist | undefined>;

  // Advanced owner-only operations
  getAllChatsWithDetails(): Promise<Array<{
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
  }>>;
  
  getAllUsersWithDetails(): Promise<Array<{
    id: number;
    username: string;
    email: string;
    displayName?: string;
    role: string;
    isVerified: boolean;
    walletBalance: string;
    totalProducts: number;
    totalTransactions: number;
    adminRequestPending: boolean;
    documentsCount: number;
    approvedDocuments: number;
    createdAt: string;
  }>>;
  
  getSystemHealthMetrics(): Promise<{
    totalUsers: number;
    activeUsersToday: number;
    totalProducts: number;
    activeProducts: number;
    totalTransactions: number;
    transactionsToday: number;
    systemLoad: number;
    errorRate: number;
    responseTime: number;
  }>;
  
  // Session store for authentication
  sessionStore: Store;

  // Security alert management
  getSecurityAlerts(): Promise<SecurityAlert[]>;
  getSecurityAlert(id: number): Promise<SecurityAlert | undefined>;
  createSecurityAlert(alert: Omit<SecurityAlert, 'id'>): Promise<SecurityAlert>;
  updateSecurityAlert(id: number, updates: Partial<SecurityAlert>): Promise<SecurityAlert>;
  getActiveSecurityAlerts(): Promise<SecurityAlert[]>;
  getSecurityAlertsByUser(userId: number): Promise<SecurityAlert[]>;
  
  // Verification management
  getVerificationDocuments(): Promise<VerificationDocument[]>;
  getVerificationDocument(id: number): Promise<VerificationDocument | undefined>;
  createVerificationDocument(document: Omit<VerificationDocument, 'id'>): Promise<VerificationDocument>;
  updateVerificationDocument(id: number, updates: Partial<VerificationDocument>): Promise<VerificationDocument>;
  getVerificationDocumentsByUser(userId: number): Promise<VerificationDocument[]>;
  getPendingVerificationDocuments(): Promise<VerificationDocument[]>;
  
  getVerificationSessions(): Promise<VerificationSession[]>;
  getVerificationSession(id: number): Promise<VerificationSession | undefined>;
  createVerificationSession(session: Omit<VerificationSession, 'id'>): Promise<VerificationSession>;
  updateVerificationSession(id: number, updates: Partial<VerificationSession>): Promise<VerificationSession>;
  getVerificationSessionsByUser(userId: number): Promise<VerificationSession[]>;
  
  // Fraud alert management
  getFraudAlert(id: number): Promise<FraudAlert | undefined>;
  getFraudAlerts(filters?: {
    status?: string;
    severity?: string;
    alertType?: string;
    limit?: number;
    offset?: number;
  }): Promise<FraudAlert[]>;
  createFraudAlert(alert: InsertFraudAlert): Promise<FraudAlert>;
  updateFraudAlert(id: number, updates: Partial<FraudAlert>): Promise<FraudAlert | undefined>;
  acknowledgeFraudAlert(id: number, adminUserId: number): Promise<boolean>;
  resolveFraudAlert(id: number, adminUserId: number, resolution: string, note?: string): Promise<boolean>;
  getFraudAlertStats(): Promise<{
    totalActive: number;
    totalToday: number;
    highPriority: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    averageResponseTime: number;
    falsePositiveRate: number;
  }>;
  
  // Season Management operations
  getAllSeasons(): Promise<Season[]>;
  getSeason(id: number): Promise<Season | undefined>;
  createSeason(season: InsertSeason): Promise<Season>;
  updateSeason(id: number, updates: Partial<Season>): Promise<Season | undefined>;
  deleteSeason(id: number): Promise<boolean>;
  
  // Season Participant operations
  getSeasonParticipants(seasonId: number): Promise<Array<SeasonParticipant & { user?: Pick<User, 'id' | 'username' | 'email' | 'profilePicture'> }>>;
  createSeasonParticipant(participant: InsertSeasonParticipant): Promise<SeasonParticipant>;
  updateSeasonParticipant(id: number, updates: Partial<SeasonParticipant>): Promise<SeasonParticipant | undefined>;
  
  // Season Reward operations
  getSeasonRewards(seasonId: number): Promise<SeasonReward[]>;
  createSeasonReward(reward: InsertSeasonReward): Promise<SeasonReward>;
  updateSeasonReward(id: number, updates: Partial<SeasonReward>): Promise<SeasonReward | undefined>;
  
  // Video Content operations - Permanent TikTok-style content
  getVideoContent(filters?: {
    userId?: number;
    category?: string;
    contentType?: string;
    musicName?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'views' | 'likes';
  }): Promise<VideoContentWithUser[]>;
  getVideoContentById(id: number): Promise<VideoContent | undefined>;
  createVideoContent(content: InsertVideoContent): Promise<VideoContent>;
  updateVideoContent(id: number, updates: Partial<VideoContent>): Promise<VideoContent | undefined>;
  deleteVideoContent(id: number, userId: number): Promise<boolean>;
  incrementVideoViews(id: number): Promise<void>;
  incrementVideoLikes(id: number): Promise<void>;
  decrementVideoLikes(id: number): Promise<void>;
  incrementVideoShares(id: number): Promise<void>;
  incrementVideoSaves(id: number): Promise<void>;
  decrementVideoSaves(id: number): Promise<void>;
  
  // Video Content Likes operations
  likeVideoContent(videoId: number, userId: number): Promise<void>;
  unlikeVideoContent(videoId: number, userId: number): Promise<void>;
  isVideoLikedByUser(videoId: number, userId: number): Promise<boolean>;
  getUserLikedVideos(userId: number): Promise<number[]>;
  
  // Video Content Saves operations
  saveVideoContent(videoId: number, userId: number): Promise<void>;
  unsaveVideoContent(videoId: number, userId: number): Promise<void>;
  isVideoSavedByUser(videoId: number, userId: number): Promise<boolean>;
  getUserSavedVideos(userId: number): Promise<number[]>;
  
  // Video Content Comments operations
  getVideoContentComments(videoId: number, filters?: { limit?: number; offset?: number }): Promise<Array<VideoContentComment & { user: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'> }>>;
  createVideoContentComment(comment: InsertVideoContentComment): Promise<VideoContentComment>;
  getVideoContentCommentCount(videoId: number): Promise<number>;
  deleteVideoContentComment(id: number, userId: number): Promise<boolean>;
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  // Repository instances
  private userRepository: UserRepository;
  private productRepository: ProductRepository;
  private chatRepository: ChatRepository;
  private adminRepository: AdminRepository;
  private transactionRepository: TransactionRepository;
  private paymentsRepository: PaymentsRepository;
  private mediaRepository: MediaRepository;
  private notificationRepository: NotificationRepository;
  private contentRepository: ContentRepository;
  private systemRepository: SystemRepository;
  
  sessionStore: Store;
  
  // In-memory security data (temporary - would be database tables in production)
  private securityAlerts: SecurityAlert[] = [];
  private verificationDocuments: VerificationDocument[] = [];
  private verificationSessions: VerificationSession[] = [];
  private nextSecurityAlertId = 1;
  private nextVerificationDocumentId = 1;
  private nextVerificationSessionId = 1;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
    
    // Instantiate all repositories
    this.userRepository = new UserRepository();
    this.productRepository = new ProductRepository();
    this.chatRepository = new ChatRepository();
    this.adminRepository = new AdminRepository();
    this.transactionRepository = new TransactionRepository();
    this.paymentsRepository = new PaymentsRepository();
    this.mediaRepository = new MediaRepository();
    this.notificationRepository = new NotificationRepository();
    this.contentRepository = new ContentRepository();
    this.systemRepository = new SystemRepository();
  }

  // ===================================================================
  // USER OPERATIONS - Delegated to UserRepository
  // ===================================================================
  
  async getUser(id: number): Promise<User | undefined> {
    return this.userRepository.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.userRepository.getUserByUsername(username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.getUserByEmail(email);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.getAllUsers();
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return this.userRepository.createUser(insertUser);
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    return this.userRepository.updateUser(id, updates);
  }

  async getUserPreferences(userId: number): Promise<UserPreferences | null> {
    return this.userRepository.getUserPreferences(userId);
  }

  async createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    return this.userRepository.createUserPreferences(preferences);
  }

  async updateUserPreferences(userId: number, updates: Partial<UserPreferences>): Promise<UserPreferences | null> {
    return this.userRepository.updateUserPreferences(userId, updates);
  }

  async createUserReport(report: InsertUserReport): Promise<UserReport> {
    return this.userRepository.createUserReport(report);
  }

  async getUserReport(id: number): Promise<UserReport | undefined> {
    return this.userRepository.getUserReport(id);
  }

  async getUserReports(filters?: {
    reporterId?: number;
    reportedUserId?: number;
    reportedProductId?: number;
    status?: string;
    reportType?: string;
    limit?: number;
    offset?: number;
  }): Promise<UserReport[]> {
    return this.userRepository.getUserReports(filters);
  }

  async updateUserReport(id: number, updates: Partial<UserReport>): Promise<UserReport | undefined> {
    return this.userRepository.updateUserReport(id, updates);
  }

  async createUserInteraction(interaction: InsertUserInteraction): Promise<UserInteraction> {
    return this.userRepository.createUserInteraction(interaction);
  }

  async getUserInteractions(userId: number, filters?: { 
    limit?: number; 
    offset?: number; 
    interactionType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<UserInteraction[]> {
    return this.userRepository.getUserInteractions(userId, filters);
  }

  async getAllUserInteractions(filters?: {
    startDate?: Date;
    endDate?: Date;
    interactionType?: string;
    limit?: number;
  }): Promise<UserInteraction[]> {
    return this.userRepository.getAllUserInteractions(filters);
  }

  // ===================================================================
  // PRODUCT OPERATIONS - Delegated to ProductRepository
  // ===================================================================

  async getProduct(id: number): Promise<Product | undefined> {
    return this.productRepository.getProduct(id);
  }

  async getProducts(filters?: { 
    category?: string; 
    sellerId?: number; 
    limit?: number; 
    offset?: number;
    excludeProductIds?: number[];
    excludeSellerIds?: number[];
    sortBy?: string;
    status?: string;
    searchQuery?: string;
    minPrice?: number;
    maxPrice?: number;
    isPremium?: boolean;
  }): Promise<any[]> {
    return this.productRepository.getProducts(filters);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    return this.productRepository.createProduct(product);
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product | undefined> {
    return this.productRepository.updateProduct(id, updates);
  }

  // ===================================================================
  // CHAT OPERATIONS - Delegated to ChatRepository
  // ===================================================================

  async getChat(id: number): Promise<Chat | undefined> {
    return this.chatRepository.getChat(id);
  }

  async getChatsByUser(userId: number): Promise<Chat[]> {
    return this.chatRepository.getChatsByUser(userId);
  }

  async getChatWithDetails(id: number): Promise<any> {
    return this.chatRepository.getChatWithDetails(id);
  }

  async getChatsWithDetailsByUser(userId: number): Promise<any[]> {
    return this.chatRepository.getChatsWithDetailsByUser(userId);
  }

  async createChat(chat: InsertChat): Promise<Chat> {
    return this.chatRepository.createChat(chat);
  }

  async getMessagesByChatId(chatId: number): Promise<Message[]> {
    return this.chatRepository.getMessagesByChatId(chatId);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    return this.chatRepository.createMessage(message);
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<void> {
    return this.chatRepository.markMessageAsRead(messageId, userId);
  }

  async markMessageAsDelivered(messageId: number, userId: number): Promise<void> {
    return this.chatRepository.markMessageAsDelivered(messageId, userId);
  }

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
    return this.chatRepository.searchMessages(params);
  }

  async addMessageReaction(reaction: InsertMessageReaction): Promise<MessageReaction> {
    return this.chatRepository.addMessageReaction(reaction);
  }

  async removeMessageReaction(messageId: number, userId: number): Promise<boolean> {
    return this.chatRepository.removeMessageReaction(messageId, userId);
  }

  async getMessageReactions(messageId: number): Promise<MessageReaction[]> {
    return this.chatRepository.getMessageReactions(messageId);
  }

  async getReactionsByUser(userId: number, messageId: number): Promise<MessageReaction | undefined> {
    return this.chatRepository.getReactionsByUser(userId, messageId);
  }

  async getChatReadTracking(userId: number, chatId: number): Promise<ChatReadTracking | undefined> {
    return this.chatRepository.getChatReadTracking(userId, chatId);
  }

  async updateChatReadTracking(userId: number, chatId: number, lastReadMessageId?: number): Promise<void> {
    return this.chatRepository.updateChatReadTracking(userId, chatId, lastReadMessageId);
  }

  async getUnreadCountForChat(userId: number, chatId: number): Promise<number> {
    return this.chatRepository.getUnreadCountForChat(userId, chatId);
  }

  async getUnreadCountsForUser(userId: number): Promise<Record<number, number>> {
    return this.chatRepository.getUnreadCountsForUser(userId);
  }

  async getPushSubscriptionsByUserId(userId: number): Promise<PushSubscription[]> {
    return this.chatRepository.getPushSubscriptionsByUserId(userId);
  }

  async savePushSubscription(userId: number, subscription: any): Promise<PushSubscription> {
    return this.chatRepository.savePushSubscription(userId, subscription);
  }

  async removePushSubscription(endpoint: string): Promise<void> {
    return this.chatRepository.removePushSubscription(endpoint);
  }

  async createChatMonitoring(monitoring: InsertChatMonitoring): Promise<ChatMonitoring> {
    return this.chatRepository.createChatMonitoring(monitoring);
  }

  async getChatMonitoring(id: number): Promise<ChatMonitoring | undefined> {
    return this.chatRepository.getChatMonitoring(id);
  }

  async getChatMonitoringByChat(chatId: number): Promise<ChatMonitoring[]> {
    return this.chatRepository.getChatMonitoringByChat(chatId);
  }

  async getAllChatMonitoring(filters?: { riskLevel?: string; isResolved?: boolean; limit?: number }): Promise<ChatMonitoring[]> {
    return this.chatRepository.getAllChatMonitoring(filters);
  }

  async updateChatMonitoring(id: number, updates: Partial<ChatMonitoring>): Promise<ChatMonitoring | undefined> {
    return this.chatRepository.updateChatMonitoring(id, updates);
  }

  async getChatMonitoringStats(): Promise<{
    totalFlags: number;
    resolvedFlags: number;
    byRiskLevel: Record<string, number>;
    byReason: Record<string, number>;
  }> {
    return this.chatRepository.getChatMonitoringStats();
  }

  // ===================================================================
  // TRANSACTION OPERATIONS - Delegated to TransactionRepository
  // ===================================================================

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactionRepository.getTransaction(id);
  }

  async getTransactionByPaymentId(paymentId: string): Promise<Transaction | undefined> {
    return this.transactionRepository.getTransactionByPaymentId(paymentId);
  }

  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    return this.transactionRepository.getTransactionsByUser(userId);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    return this.transactionRepository.createTransaction(transaction);
  }

  async updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    return this.transactionRepository.updateTransaction(id, updates);
  }

  async getWalletBalance(userId: number): Promise<string> {
    return this.transactionRepository.getWalletBalance(userId);
  }

  async updateWalletBalance(userId: number, amount: string): Promise<void> {
    return this.transactionRepository.updateWalletBalance(userId, amount);
  }

  async updateWalletBalanceInTransaction(updates: Array<{userId: number, amount: string}>, walletTransactionData: InsertWalletTransaction[]): Promise<void> {
    return this.transactionRepository.updateWalletBalanceInTransaction(updates, walletTransactionData);
  }

  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    return this.transactionRepository.createWalletTransaction(transaction);
  }

  async getWalletTransactionsByUser(userId: number): Promise<WalletTransaction[]> {
    return this.transactionRepository.getWalletTransactionsByUser(userId);
  }

  async getEscrowTransaction(id: number): Promise<EscrowTransaction | undefined> {
    return this.transactionRepository.getEscrowTransaction(id);
  }

  async getEscrowTransactionsByUser(userId: number): Promise<EscrowTransaction[]> {
    return this.transactionRepository.getEscrowTransactionsByUser(userId);
  }

  async getEscrowTransactionsByStatus(status: string): Promise<EscrowTransaction[]> {
    return this.transactionRepository.getEscrowTransactionsByStatus(status);
  }

  async getEscrowTransactionByChat(productId: number, buyerId: number, sellerId: number): Promise<EscrowTransaction | undefined> {
    return this.transactionRepository.getEscrowTransactionByChat(productId, buyerId, sellerId);
  }

  async createEscrowTransaction(escrow: InsertEscrowTransaction): Promise<EscrowTransaction> {
    return this.transactionRepository.createEscrowTransaction(escrow);
  }

  async updateEscrowTransaction(id: number, updates: Partial<EscrowTransaction>): Promise<EscrowTransaction | undefined> {
    return this.transactionRepository.updateEscrowTransaction(id, updates);
  }

  async getEscrowStats(): Promise<{ pending: number; active: number; completed: number; disputed: number }> {
    return this.transactionRepository.getEscrowStats();
  }

  async createMoneyRequest(request: InsertMoneyRequest): Promise<MoneyRequest> {
    return this.transactionRepository.createMoneyRequest(request);
  }

  async getMoneyRequest(id: number): Promise<MoneyRequest | undefined> {
    return this.transactionRepository.getMoneyRequest(id);
  }

  async getMoneyRequestsByUser(userId: number, type?: 'sent' | 'received'): Promise<MoneyRequest[]> {
    return this.transactionRepository.getMoneyRequestsByUser(userId, type);
  }

  async updateMoneyRequest(id: number, updates: Partial<MoneyRequest>): Promise<MoneyRequest | undefined> {
    return this.transactionRepository.updateMoneyRequest(id, updates);
  }

  async getPendingRequestsForUser(userId: number): Promise<MoneyRequest[]> {
    return this.transactionRepository.getPendingRequestsForUser(userId);
  }

  async createEwalletConnection(connection: InsertEwalletConnection): Promise<EwalletConnection> {
    return this.transactionRepository.createEwalletConnection(connection);
  }

  async getEwalletConnection(id: number): Promise<EwalletConnection | undefined> {
    return this.transactionRepository.getEwalletConnection(id);
  }

  async getEwalletConnectionsByUser(userId: number): Promise<EwalletConnection[]> {
    return this.transactionRepository.getEwalletConnectionsByUser(userId);
  }

  async getEwalletConnectionByProvider(userId: number, provider: string): Promise<EwalletConnection | undefined> {
    return this.transactionRepository.getEwalletConnectionByProvider(userId, provider);
  }

  async updateEwalletConnection(id: number, updates: Partial<EwalletConnection>): Promise<EwalletConnection | undefined> {
    return this.transactionRepository.updateEwalletConnection(id, updates);
  }

  async deleteEwalletConnection(id: number): Promise<void> {
    return this.transactionRepository.deleteEwalletConnection(id);
  }

  async createServiceOrder(order: InsertServiceOrder): Promise<ServiceOrder> {
    return this.transactionRepository.createServiceOrder(order);
  }

  async getServiceOrder(id: number): Promise<ServiceOrder | undefined> {
    return this.transactionRepository.getServiceOrder(id);
  }

  async getServiceOrdersByUser(userId: number): Promise<ServiceOrder[]> {
    return this.transactionRepository.getServiceOrdersByUser(userId);
  }

  async getServiceOrderByNumber(orderNumber: string): Promise<ServiceOrder | undefined> {
    return this.transactionRepository.getServiceOrderByNumber(orderNumber);
  }

  async updateServiceOrder(id: number, updates: Partial<ServiceOrder>): Promise<ServiceOrder | undefined> {
    return this.transactionRepository.updateServiceOrder(id, updates);
  }

  // ===================================================================
  // PAYMENTS OPERATIONS - Delegated to PaymentsRepository
  // ===================================================================

  async createSmsLog(log: InsertSmsLog): Promise<SmsLog> {
    return this.paymentsRepository.createSmsLog(log);
  }

  async getSmsLogs(filters?: { phoneNumber?: string; status?: string; alertType?: string; limit?: number; offset?: number }): Promise<SmsLog[]> {
    return this.paymentsRepository.getSmsLogs(filters);
  }

  async getSmsLogsByPhone(phoneNumber: string): Promise<SmsLog[]> {
    return this.paymentsRepository.getSmsLogsByPhone(phoneNumber);
  }

  async getSmsLogStats(): Promise<{ totalSent: number; totalFailed: number; totalPending: number }> {
    return this.paymentsRepository.getSmsLogStats();
  }

  async createRevenueReport(report: InsertRevenueReport): Promise<RevenueReport> {
    return this.paymentsRepository.createRevenueReport(report);
  }

  async getRevenueReport(id: number): Promise<RevenueReport | undefined> {
    return this.paymentsRepository.getRevenueReport(id);
  }

  async getRevenueReportByDate(date: Date): Promise<RevenueReport | undefined> {
    return this.paymentsRepository.getRevenueReportByDate(date);
  }

  async getRevenueReports(filters?: { startDate?: Date; endDate?: Date; limit?: number }): Promise<RevenueReport[]> {
    return this.paymentsRepository.getRevenueReports(filters);
  }

  async updateRevenueReport(id: number, updates: Partial<RevenueReport>): Promise<RevenueReport | undefined> {
    return this.paymentsRepository.updateRevenueReport(id, updates);
  }

  async getRevenueAnalytics(startDate: Date, endDate: Date): Promise<{
    totalRevenue: string;
    totalCommission: string;
    totalTransactions: number;
    averageTransactionValue: string;
    topCategories: Array<{ category: string; revenue: string; count: number }>;
    dailyReports: RevenueReport[];
  }> {
    return this.paymentsRepository.getRevenueAnalytics(startDate, endDate);
  }

  // ===================================================================
  // MEDIA OPERATIONS - Delegated to MediaRepository
  // ===================================================================

  async getActiveStatusUpdates(): Promise<StatusUpdateWithUser[]> {
    return this.mediaRepository.getActiveStatusUpdates();
  }

  async getUserStatusUpdates(userId: number): Promise<StatusUpdateWithUser[]> {
    return this.mediaRepository.getUserStatusUpdates(userId);
  }

  async createStatusUpdate(status: InsertStatusUpdate): Promise<StatusUpdate> {
    return this.mediaRepository.createStatusUpdate(status);
  }

  async deleteStatusUpdate(id: number, userId: number): Promise<boolean> {
    return this.mediaRepository.deleteStatusUpdate(id, userId);
  }

  async recordStatusView(statusId: number, viewerId: number): Promise<void> {
    return this.mediaRepository.recordStatusView(statusId, viewerId);
  }

  async getStatusViews(statusId: number): Promise<Array<{id: number, username: string, profilePicture: string | null, viewedAt: Date}>> {
    return this.mediaRepository.getStatusViews(statusId);
  }

  async getUserStatusViews(userId: number): Promise<number[]> {
    return this.mediaRepository.getUserStatusViews(userId);
  }

  async hasUserViewedStatus(statusId: number, viewerId: number): Promise<boolean> {
    return this.mediaRepository.hasUserViewedStatus(statusId, viewerId);
  }

  async getReview(id: number): Promise<Review | undefined> {
    return this.mediaRepository.getReview(id);
  }

  async getReviewsByProduct(productId: number, filters?: { limit?: number; offset?: number }): Promise<Review[]> {
    return this.mediaRepository.getReviewsByProduct(productId, filters);
  }

  async getReviewsBySeller(sellerId: number, filters?: { limit?: number; offset?: number }): Promise<Review[]> {
    return this.mediaRepository.getReviewsBySeller(sellerId, filters);
  }

  async getReviewsByBuyer(buyerId: number, filters?: { limit?: number; offset?: number }): Promise<Review[]> {
    return this.mediaRepository.getReviewsByBuyer(buyerId, filters);
  }

  async createReview(review: InsertReview): Promise<Review> {
    return this.mediaRepository.createReview(review);
  }

  async updateReview(id: number, updates: Partial<Review>): Promise<Review | undefined> {
    return this.mediaRepository.updateReview(id, updates);
  }

  async deleteReview(id: number): Promise<boolean> {
    return this.mediaRepository.deleteReview(id);
  }

  async getProductReviewStats(productId: number): Promise<{ averageRating: number; totalReviews: number }> {
    return this.mediaRepository.getProductReviewStats(productId);
  }

  async getSellerReviewStats(sellerId: number): Promise<{ averageRating: number; totalReviews: number }> {
    return this.mediaRepository.getSellerReviewStats(sellerId);
  }

  async updateProductRatingAndCount(productId: number): Promise<void> {
    return this.mediaRepository.updateProductRatingAndCount(productId);
  }

  async checkUserCanReview(buyerId: number, productId: number): Promise<boolean> {
    return this.mediaRepository.checkUserCanReview(buyerId, productId);
  }

  async createReviewHelpfulVote(vote: InsertReviewHelpfulVote): Promise<ReviewHelpfulVote> {
    return this.mediaRepository.createReviewHelpfulVote(vote);
  }

  async removeReviewHelpfulVote(reviewId: number, userId: number): Promise<boolean> {
    return this.mediaRepository.removeReviewHelpfulVote(reviewId, userId);
  }

  async checkUserVotedHelpful(reviewId: number, userId: number): Promise<boolean> {
    return this.mediaRepository.checkUserVotedHelpful(reviewId, userId);
  }

  async getReviewHelpfulVoteCount(reviewId: number): Promise<number> {
    return this.mediaRepository.getReviewHelpfulVoteCount(reviewId);
  }

  async updateReviewHelpfulVotesCount(reviewId: number): Promise<void> {
    return this.mediaRepository.updateReviewHelpfulVotesCount(reviewId);
  }

  async getVideoComments(statusId: number, filters?: { limit?: number; offset?: number }): Promise<Array<VideoComment & { user: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'> }>> {
    return this.mediaRepository.getVideoComments(statusId, filters);
  }

  async createVideoComment(comment: InsertVideoComment): Promise<VideoComment> {
    return this.mediaRepository.createVideoComment(comment);
  }

  async getVideoCommentCount(statusId: number): Promise<number> {
    return this.mediaRepository.getVideoCommentCount(statusId);
  }

  async deleteVideoComment(id: number, userId: number): Promise<boolean> {
    return this.mediaRepository.deleteVideoComment(id, userId);
  }

  async getPublishedNews(): Promise<News[]> {
    return this.mediaRepository.getPublishedNews();
  }

  async getNewsById(id: number): Promise<News | undefined> {
    return this.mediaRepository.getNewsById(id);
  }

  async createNews(news: InsertNews): Promise<News> {
    return this.mediaRepository.createNews(news);
  }

  async updateNews(id: number, updates: Partial<News>): Promise<News | undefined> {
    return this.mediaRepository.updateNews(id, updates);
  }

  async deleteNews(id: number): Promise<boolean> {
    return this.mediaRepository.deleteNews(id);
  }

  async createPosterGeneration(poster: InsertPosterGeneration): Promise<PosterGeneration> {
    return this.mediaRepository.createPosterGeneration(poster);
  }

  async updatePosterGeneration(id: number, updates: Partial<PosterGeneration>): Promise<PosterGeneration | undefined> {
    return this.mediaRepository.updatePosterGeneration(id, updates);
  }

  async getRepost(userId: number, productId?: number, statusId?: number): Promise<Repost | undefined> {
    return this.mediaRepository.getRepost(userId, productId, statusId);
  }

  async createRepost(repost: InsertRepost): Promise<Repost> {
    return this.mediaRepository.createRepost(repost);
  }

  async deleteRepost(userId: number, productId?: number, statusId?: number): Promise<void> {
    return this.mediaRepository.deleteRepost(userId, productId, statusId);
  }

  async getRepostsByUser(userId: number): Promise<Repost[]> {
    return this.mediaRepository.getRepostsByUser(userId);
  }

  async getRepostCountByProduct(productId: number): Promise<number> {
    return this.mediaRepository.getRepostCountByProduct(productId);
  }

  async getRepostCountByStatus(statusId: number): Promise<number> {
    return this.mediaRepository.getRepostCountByStatus(statusId);
  }

  async getAllSeasons(): Promise<Season[]> {
    return this.mediaRepository.getAllSeasons();
  }

  async getSeason(id: number): Promise<Season | undefined> {
    return this.mediaRepository.getSeason(id);
  }

  async createSeason(season: InsertSeason): Promise<Season> {
    return this.mediaRepository.createSeason(season);
  }

  async updateSeason(id: number, updates: Partial<Season>): Promise<Season | undefined> {
    return this.mediaRepository.updateSeason(id, updates);
  }

  async deleteSeason(id: number): Promise<boolean> {
    return this.mediaRepository.deleteSeason(id);
  }

  async getSeasonParticipants(seasonId: number): Promise<Array<SeasonParticipant & { user?: Pick<User, 'id' | 'username' | 'email' | 'profilePicture'> }>> {
    return this.mediaRepository.getSeasonParticipants(seasonId);
  }

  async createSeasonParticipant(participant: InsertSeasonParticipant): Promise<SeasonParticipant> {
    return this.mediaRepository.createSeasonParticipant(participant);
  }

  async updateSeasonParticipant(id: number, updates: Partial<SeasonParticipant>): Promise<SeasonParticipant | undefined> {
    return this.mediaRepository.updateSeasonParticipant(id, updates);
  }

  async getSeasonRewards(seasonId: number): Promise<SeasonReward[]> {
    return this.mediaRepository.getSeasonRewards(seasonId);
  }

  async createSeasonReward(reward: InsertSeasonReward): Promise<SeasonReward> {
    return this.mediaRepository.createSeasonReward(reward);
  }

  async updateSeasonReward(id: number, updates: Partial<SeasonReward>): Promise<SeasonReward | undefined> {
    return this.mediaRepository.updateSeasonReward(id, updates);
  }

  async getVideoContent(filters?: {
    userId?: number;
    category?: string;
    contentType?: string;
    musicName?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'views' | 'likes';
  }): Promise<VideoContentWithUser[]> {
    return this.mediaRepository.getVideoContent(filters);
  }

  async getVideoContentById(id: number): Promise<VideoContent | undefined> {
    return this.mediaRepository.getVideoContentById(id);
  }

  async createVideoContent(content: InsertVideoContent): Promise<VideoContent> {
    return this.mediaRepository.createVideoContent(content);
  }

  async updateVideoContent(id: number, updates: Partial<VideoContent>): Promise<VideoContent | undefined> {
    return this.mediaRepository.updateVideoContent(id, updates);
  }

  async deleteVideoContent(id: number, userId: number): Promise<boolean> {
    return this.mediaRepository.deleteVideoContent(id, userId);
  }

  async incrementVideoViews(id: number): Promise<void> {
    return this.mediaRepository.incrementVideoViews(id);
  }

  async incrementVideoLikes(id: number): Promise<void> {
    return this.mediaRepository.incrementVideoLikes(id);
  }

  async decrementVideoLikes(id: number): Promise<void> {
    return this.mediaRepository.decrementVideoLikes(id);
  }

  async incrementVideoShares(id: number): Promise<void> {
    return this.mediaRepository.incrementVideoShares(id);
  }

  async incrementVideoSaves(id: number): Promise<void> {
    return this.mediaRepository.incrementVideoSaves(id);
  }

  async decrementVideoSaves(id: number): Promise<void> {
    return this.mediaRepository.decrementVideoSaves(id);
  }

  async likeVideoContent(videoId: number, userId: number): Promise<void> {
    return this.mediaRepository.likeVideoContent(videoId, userId);
  }

  async unlikeVideoContent(videoId: number, userId: number): Promise<void> {
    return this.mediaRepository.unlikeVideoContent(videoId, userId);
  }

  async isVideoLikedByUser(videoId: number, userId: number): Promise<boolean> {
    return this.mediaRepository.isVideoLikedByUser(videoId, userId);
  }

  async getUserLikedVideos(userId: number): Promise<number[]> {
    return this.mediaRepository.getUserLikedVideos(userId);
  }

  async saveVideoContent(videoId: number, userId: number): Promise<void> {
    return this.mediaRepository.saveVideoContent(videoId, userId);
  }

  async unsaveVideoContent(videoId: number, userId: number): Promise<void> {
    return this.mediaRepository.unsaveVideoContent(videoId, userId);
  }

  async isVideoSavedByUser(videoId: number, userId: number): Promise<boolean> {
    return this.mediaRepository.isVideoSavedByUser(videoId, userId);
  }

  async getUserSavedVideos(userId: number): Promise<number[]> {
    return this.mediaRepository.getUserSavedVideos(userId);
  }

  async getVideoContentComments(videoId: number, filters?: { limit?: number; offset?: number }): Promise<Array<VideoContentComment & { user: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'> }>> {
    return this.mediaRepository.getVideoContentComments(videoId, filters);
  }

  async createVideoContentComment(comment: InsertVideoContentComment): Promise<VideoContentComment> {
    return this.mediaRepository.createVideoContentComment(comment);
  }

  async getVideoContentCommentCount(videoId: number): Promise<number> {
    return this.mediaRepository.getVideoContentCommentCount(videoId);
  }

  async deleteVideoContentComment(id: number, userId: number): Promise<boolean> {
    return this.mediaRepository.deleteVideoContentComment(id, userId);
  }

  // ===================================================================
  // NOTIFICATION OPERATIONS - Delegated to NotificationRepository
  // ===================================================================

  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notificationRepository.getNotification(id);
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return this.notificationRepository.getNotificationsByUser(userId);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    return this.notificationRepository.createNotification(notification);
  }

  async updateNotification(id: number, updates: Partial<Notification>): Promise<Notification | undefined> {
    return this.notificationRepository.updateNotification(id, updates);
  }

  async markNotificationAsRead(id: number): Promise<void> {
    return this.notificationRepository.markNotificationAsRead(id);
  }

  async deleteNotification(id: number): Promise<void> {
    return this.notificationRepository.deleteNotification(id);
  }

  // ===================================================================
  // ADMIN OPERATIONS - Delegated to AdminRepository
  // ===================================================================

  async getAdminConfig(key: string): Promise<AdminConfig | undefined> {
    return this.adminRepository.getAdminConfig(key);
  }

  async getAllAdminConfigs(): Promise<AdminConfig[]> {
    return this.adminRepository.getAllAdminConfigs();
  }

  async setAdminConfig(config: InsertAdminConfig): Promise<AdminConfig> {
    return this.adminRepository.setAdminConfig(config);
  }

  async updateAdminConfig(key: string, value: string, updatedBy: number): Promise<AdminConfig | undefined> {
    return this.adminRepository.updateAdminConfig(key, value, updatedBy);
  }

  async getAdminTemplate(id: number): Promise<AdminTemplate | undefined> {
    return this.adminRepository.getAdminTemplate(id);
  }

  async getAdminTemplatesByType(type: string): Promise<AdminTemplate[]> {
    return this.adminRepository.getAdminTemplatesByType(type);
  }

  async getAllAdminTemplates(): Promise<AdminTemplate[]> {
    return this.adminRepository.getAllAdminTemplates();
  }

  async createAdminTemplate(template: InsertAdminTemplate): Promise<AdminTemplate> {
    return this.adminRepository.createAdminTemplate(template);
  }

  async updateAdminTemplate(id: number, updates: Partial<AdminTemplate>): Promise<AdminTemplate | undefined> {
    return this.adminRepository.updateAdminTemplate(id, updates);
  }

  async deleteAdminTemplate(id: number): Promise<void> {
    return this.adminRepository.deleteAdminTemplate(id);
  }

  async getAdminRule(id: number): Promise<AdminRule | undefined> {
    return this.adminRepository.getAdminRule(id);
  }

  async getAdminRulesByType(ruleType: string): Promise<AdminRule[]> {
    return this.adminRepository.getAdminRulesByType(ruleType);
  }

  async getAllAdminRules(): Promise<AdminRule[]> {
    return this.adminRepository.getAllAdminRules();
  }

  async getActiveAdminRules(): Promise<AdminRule[]> {
    return this.adminRepository.getActiveAdminRules();
  }

  async createAdminRule(rule: InsertAdminRule): Promise<AdminRule> {
    return this.adminRepository.createAdminRule(rule);
  }

  async updateAdminRule(id: number, updates: Partial<AdminRule>): Promise<AdminRule | undefined> {
    return this.adminRepository.updateAdminRule(id, updates);
  }

  async deleteAdminRule(id: number): Promise<void> {
    return this.adminRepository.deleteAdminRule(id);
  }

  async getAdminBlacklistItem(id: number): Promise<AdminBlacklist | undefined> {
    return this.adminRepository.getAdminBlacklistItem(id);
  }

  async getAdminBlacklistByType(type: string): Promise<AdminBlacklist[]> {
    return this.adminRepository.getAdminBlacklistByType(type);
  }

  async getAllAdminBlacklist(): Promise<AdminBlacklist[]> {
    return this.adminRepository.getAllAdminBlacklist();
  }

  async getActiveAdminBlacklist(): Promise<AdminBlacklist[]> {
    return this.adminRepository.getActiveAdminBlacklist();
  }

  async checkBlacklist(type: string, value: string): Promise<AdminBlacklist | undefined> {
    return this.adminRepository.checkBlacklist(type, value);
  }

  async createAdminBlacklistItem(item: InsertAdminBlacklist): Promise<AdminBlacklist> {
    return this.adminRepository.createAdminBlacklistItem(item);
  }

  async updateAdminBlacklistItem(id: number, updates: Partial<AdminBlacklist>): Promise<AdminBlacklist | undefined> {
    return this.adminRepository.updateAdminBlacklistItem(id, updates);
  }

  async deleteAdminBlacklistItem(id: number): Promise<void> {
    return this.adminRepository.deleteAdminBlacklistItem(id);
  }

  async createAdminActivityLog(log: InsertAdminActivityLog): Promise<AdminActivityLog> {
    return this.adminRepository.createAdminActivityLog(log);
  }

  async getAdminActivityLogs(filters?: { userId?: number; adminId?: number; action?: string; category?: string; createdAtFrom?: Date; createdAtTo?: Date; limit?: number; offset?: number }): Promise<AdminActivityLog[]> {
    return this.adminRepository.getAdminActivityLogs(filters);
  }

  async getAdminActivityLogsByUser(userId: number): Promise<AdminActivityLog[]> {
    return this.adminRepository.getAdminActivityLogsByUser(userId);
  }

  async getAdminActivityLogsByAdmin(adminId: number): Promise<AdminActivityLog[]> {
    return this.adminRepository.getAdminActivityLogsByAdmin(adminId);
  }

  async getAdminActivityLogsByAction(action: string): Promise<AdminActivityLog[]> {
    return this.adminRepository.getAdminActivityLogsByAction(action);
  }

  async getAdminActivityStats(): Promise<{ total: number; byCategory: Record<string, number>; byAction: Record<string, number> }> {
    return this.adminRepository.getAdminActivityStats();
  }

  async getRecentAdminActivityCount(action: string, hoursBack: number): Promise<number> {
    return this.adminRepository.getRecentAdminActivityCount(action, hoursBack);
  }

  async getActivityLogsByUser(userId: number, limit?: number): Promise<AdminActivityLog[]> {
    return this.adminRepository.getActivityLogsByUser(userId, limit);
  }

  async createAdminOtp(otp: InsertAdminOtpCode): Promise<AdminOtpCode> {
    return this.adminRepository.createAdminOtp(otp);
  }

  async getAdminOtp(userId: number, purpose: string): Promise<AdminOtpCode | undefined> {
    return this.adminRepository.getAdminOtp(userId, purpose);
  }

  async validateAdminOtp(userId: number, code: string, purpose: string): Promise<boolean> {
    return this.adminRepository.validateAdminOtp(userId, code, purpose);
  }

  async markAdminOtpAsUsed(id: number): Promise<void> {
    return this.adminRepository.markAdminOtpAsUsed(id);
  }

  async cleanupExpiredOtps(): Promise<void> {
    return this.adminRepository.cleanupExpiredOtps();
  }

  async createAdminVerificationDocument(document: InsertAdminVerificationDocument): Promise<AdminVerificationDocument> {
    return this.adminRepository.createAdminVerificationDocument(document);
  }

  async getAdminVerificationDocument(id: number): Promise<AdminVerificationDocument | undefined> {
    return this.adminRepository.getAdminVerificationDocument(id);
  }

  async getAdminVerificationDocumentsByUser(userId: number): Promise<AdminVerificationDocument[]> {
    return this.adminRepository.getAdminVerificationDocumentsByUser(userId);
  }

  async getAllPendingDocuments(): Promise<AdminVerificationDocument[]> {
    return this.adminRepository.getAllPendingDocuments();
  }

  async updateAdminVerificationDocument(id: number, updates: Partial<AdminVerificationDocument>): Promise<AdminVerificationDocument | undefined> {
    return this.adminRepository.updateAdminVerificationDocument(id, updates);
  }

  async deleteAdminVerificationDocument(id: number): Promise<void> {
    return this.adminRepository.deleteAdminVerificationDocument(id);
  }

  async getBlacklistEntries(filters?: {
    type?: string;
    value?: string;
    targetId?: number;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<AdminBlacklist[]> {
    return this.adminRepository.getBlacklistEntries(filters);
  }

  async createBlacklistEntry(entry: InsertAdminBlacklist): Promise<AdminBlacklist> {
    return this.adminRepository.createBlacklistEntry(entry);
  }

  async updateBlacklistEntry(id: number, updates: Partial<AdminBlacklist>): Promise<AdminBlacklist | undefined> {
    return this.adminRepository.updateBlacklistEntry(id, updates);
  }

  async getSecurityAlerts(): Promise<SecurityAlert[]> {
    return this.adminRepository.getSecurityAlerts();
  }

  async getSecurityAlert(id: number): Promise<SecurityAlert | undefined> {
    return this.adminRepository.getSecurityAlert(id);
  }

  async createSecurityAlert(alert: Omit<SecurityAlert, 'id'>): Promise<SecurityAlert> {
    return this.adminRepository.createSecurityAlert(alert);
  }

  async updateSecurityAlert(id: number, updates: Partial<SecurityAlert>): Promise<SecurityAlert> {
    return this.adminRepository.updateSecurityAlert(id, updates);
  }

  async getActiveSecurityAlerts(): Promise<SecurityAlert[]> {
    return this.adminRepository.getActiveSecurityAlerts();
  }

  async getSecurityAlertsByUser(userId: number): Promise<SecurityAlert[]> {
    return this.adminRepository.getSecurityAlertsByUser(userId);
  }

  async getVerificationDocuments(): Promise<VerificationDocument[]> {
    return this.adminRepository.getVerificationDocuments();
  }

  async getVerificationDocument(id: number): Promise<VerificationDocument | undefined> {
    return this.adminRepository.getVerificationDocument(id);
  }

  async createVerificationDocument(document: Omit<VerificationDocument, 'id'>): Promise<VerificationDocument> {
    return this.adminRepository.createVerificationDocument(document);
  }

  async updateVerificationDocument(id: number, updates: Partial<VerificationDocument>): Promise<VerificationDocument> {
    return this.adminRepository.updateVerificationDocument(id, updates);
  }

  async getVerificationDocumentsByUser(userId: number): Promise<VerificationDocument[]> {
    return this.adminRepository.getVerificationDocumentsByUser(userId);
  }

  async getPendingVerificationDocuments(): Promise<VerificationDocument[]> {
    return this.adminRepository.getPendingVerificationDocuments();
  }

  async getVerificationSessions(): Promise<VerificationSession[]> {
    return this.adminRepository.getVerificationSessions();
  }

  async getVerificationSession(id: number): Promise<VerificationSession | undefined> {
    return this.adminRepository.getVerificationSession(id);
  }

  async createVerificationSession(session: Omit<VerificationSession, 'id'>): Promise<VerificationSession> {
    return this.adminRepository.createVerificationSession(session);
  }

  async updateVerificationSession(id: number, updates: Partial<VerificationSession>): Promise<VerificationSession> {
    return this.adminRepository.updateVerificationSession(id, updates);
  }

  async getVerificationSessionsByUser(userId: number): Promise<VerificationSession[]> {
    return this.adminRepository.getVerificationSessionsByUser(userId);
  }

  async getFraudAlert(id: number): Promise<FraudAlert | undefined> {
    return this.adminRepository.getFraudAlert(id);
  }

  async getFraudAlerts(filters?: {
    status?: string;
    severity?: string;
    alertType?: string;
    limit?: number;
    offset?: number;
  }): Promise<FraudAlert[]> {
    return this.adminRepository.getFraudAlerts(filters);
  }

  async createFraudAlert(alert: InsertFraudAlert): Promise<FraudAlert> {
    return this.adminRepository.createFraudAlert(alert);
  }

  async updateFraudAlert(id: number, updates: Partial<FraudAlert>): Promise<FraudAlert | undefined> {
    return this.adminRepository.updateFraudAlert(id, updates);
  }

  async acknowledgeFraudAlert(id: number, adminUserId: number): Promise<boolean> {
    return this.adminRepository.acknowledgeFraudAlert(id, adminUserId);
  }

  async resolveFraudAlert(id: number, adminUserId: number, resolution: string, note?: string): Promise<boolean> {
    return this.adminRepository.resolveFraudAlert(id, adminUserId, resolution, note);
  }

  async getFraudAlertStats(): Promise<{
    totalActive: number;
    totalToday: number;
    highPriority: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    averageResponseTime: number;
    falsePositiveRate: number;
  }> {
    return this.adminRepository.getFraudAlertStats();
  }

  async getNewsCount(): Promise<number> {
    return this.adminRepository.getNewsCount();
  }

  async getProductsCount(): Promise<number> {
    return this.adminRepository.getProductsCount();
  }

  async getStatusUpdatesCount(): Promise<number> {
    return this.adminRepository.getStatusUpdatesCount();
  }

  async getPendingReviewsCount(): Promise<number> {
    return this.adminRepository.getPendingReviewsCount();
  }

  async getFlaggedContentCount(): Promise<number> {
    return this.adminRepository.getFlaggedContentCount();
  }

  async getPublishedTodayCount(): Promise<number> {
    return this.adminRepository.getPublishedTodayCount();
  }

  async getNewsForAdmin(search: string, status: string): Promise<News[]> {
    return this.adminRepository.getNewsForAdmin(search, status);
  }

  async getProductsForAdmin(search: string, status: string): Promise<any[]> {
    return this.adminRepository.getProductsForAdmin(search, status);
  }

  async getStatusUpdatesForAdmin(search: string, status: string): Promise<any[]> {
    return this.adminRepository.getStatusUpdatesForAdmin(search, status);
  }

  async moderateProduct(id: number, data: any): Promise<Product | undefined> {
    return this.adminRepository.moderateProduct(id, data);
  }

  async moderateStatusUpdate(id: number, data: any): Promise<StatusUpdate | undefined> {
    return this.adminRepository.moderateStatusUpdate(id, data);
  }

  async moderateNews(id: number, data: any): Promise<News | undefined> {
    return this.adminRepository.moderateNews(id, data);
  }

  // ===================================================================
  // SYSTEM OPERATIONS - Delegated to SystemRepository
  // ===================================================================

  async getUploadedFiles(filters?: { uploadedBy?: number; category?: string; limit?: number }): Promise<FileItem[]> {
    return this.systemRepository.getUploadedFiles(filters);
  }

  async getUploadedFile(id: number): Promise<FileItem | undefined> {
    return this.systemRepository.getUploadedFile(id);
  }

  async createUploadedFile(fileData: InsertUploadedFile): Promise<UploadedFile> {
    return this.systemRepository.createUploadedFile(fileData);
  }

  async deleteUploadedFile(id: number): Promise<boolean> {
    return this.systemRepository.deleteUploadedFile(id);
  }

  async getUploadedFilesStats(): Promise<StorageStats> {
    return this.systemRepository.getUploadedFilesStats();
  }

  async createOwnerConfig(config: InsertOwnerConfig): Promise<OwnerConfig> {
    return this.systemRepository.createOwnerConfig(config);
  }

  async getOwnerConfig(key: string): Promise<OwnerConfig | undefined> {
    return this.systemRepository.getOwnerConfig(key);
  }

  async getAllOwnerConfigs(): Promise<OwnerConfig[]> {
    return this.systemRepository.getAllOwnerConfigs();
  }

  async getOwnerConfigsByCategory(category: string): Promise<OwnerConfig[]> {
    return this.systemRepository.getOwnerConfigsByCategory(category);
  }

  async updateOwnerConfig(key: string, value: string, lastModifiedBy: number): Promise<OwnerConfig | undefined> {
    return this.systemRepository.updateOwnerConfig(key, value, lastModifiedBy);
  }

  async deleteOwnerConfig(key: string): Promise<void> {
    return this.systemRepository.deleteOwnerConfig(key);
  }

  async getUserAnalytics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    adminUsers: number;
    verifiedUsers: number;
    pendingAdminRequests: number;
  }> {
    return this.systemRepository.getUserAnalytics();
  }

  async getTransactionAnalytics(): Promise<{
    totalTransactions: number;
    completedTransactions: number;
    pendingTransactions: number;
    disputedTransactions: number;
    totalRevenue: string;
    totalCommission: string;
    averageTransactionValue: string;
    transactionsToday: number;
    transactionsThisWeek: number;
    transactionsThisMonth: number;
    revenueToday: string;
    revenueThisWeek: string;
    revenueThisMonth: string;
  }> {
    return this.systemRepository.getTransactionAnalytics();
  }

  async getEscrowAnalytics(): Promise<{
    totalEscrows: number;
    pendingEscrows: number;
    activeEscrows: number;
    completedEscrows: number;
    disputedEscrows: number;
    averageEscrowValue: string;
    escrowsToday: number;
    averageCompletionTime: number;
  }> {
    return this.systemRepository.getEscrowAnalytics();
  }

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
    return this.systemRepository.getChatAnalytics();
  }

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
    return this.systemRepository.getAllChatsWithDetails();
  }

  async getAllUsersWithDetails(): Promise<Array<{
    id: number;
    username: string;
    email: string;
    displayName?: string;
    role: string;
    isVerified: boolean;
    walletBalance: string;
    totalProducts: number;
    totalTransactions: number;
    adminRequestPending: boolean;
    documentsCount: number;
    approvedDocuments: number;
    createdAt: string;
  }>> {
    return this.systemRepository.getAllUsersWithDetails();
  }

  async getSystemHealthMetrics(): Promise<{
    totalUsers: number;
    activeUsersToday: number;
    totalProducts: number;
    activeProducts: number;
    totalTransactions: number;
    transactionsToday: number;
    systemLoad: number;
    errorRate: number;
    responseTime: number;
  }> {
    return this.systemRepository.getSystemHealthMetrics();
  }
}

export const storage = new DatabaseStorage();
