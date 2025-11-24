import type { ISystemRepository, FileItem, StorageStats } from "./interfaces/ISystemRepository";
import type {
  News,
  InsertNews,
  UploadedFile,
  InsertUploadedFile,
  SmsLog,
  InsertSmsLog,
  RevenueReport,
  InsertRevenueReport,
  OwnerConfig,
  InsertOwnerConfig,
  Season,
  InsertSeason,
  SeasonParticipant,
  InsertSeasonParticipant,
  SeasonReward,
  InsertSeasonReward,
  User,
  Product,
  Transaction,
  Chat,
  Message,
  EscrowTransaction,
  ChatMonitoring
} from "@shared/schema";
import {
  news,
  uploadedFiles,
  smsLogs,
  revenueReports,
  ownerConfigs,
  seasons,
  seasonParticipants,
  seasonRewards,
  users,
  products,
  transactions,
  chats,
  messages,
  escrowTransactions,
  chatMonitoring,
  adminVerificationDocuments
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, and, or, gt, lt, gte, lte, count, sum, sql } from "drizzle-orm";

/**
 * SystemRepository
 * 
 * Handles all system-level database operations including:
 * - News management
 * - File upload tracking
 * - SMS logs tracking
 * - Revenue reporting and analytics
 * - Owner configuration management
 * - Season management (gamification)
 * - Owner-specific analytics (user, transaction, escrow, chat)
 * - Advanced owner operations (system health, detailed reports)
 */
export class SystemRepository implements ISystemRepository {

  // ===========================
  // NEWS OPERATIONS
  // ===========================

  /**
   * Get all published news articles
   */
  async getPublishedNews(): Promise<News[]> {
    return await db.select().from(news)
      .where(eq(news.isPublished, true))
      .orderBy(desc(news.isPinned), desc(news.createdAt));
  }

  /**
   * Get a single published news article by ID
   */
  async getNewsById(id: number): Promise<News | undefined> {
    const [newsItem] = await db.select().from(news)
      .where(and(eq(news.id, id), eq(news.isPublished, true)));
    return newsItem;
  }

  /**
   * Create a new news article
   */
  async createNews(newsData: InsertNews): Promise<News> {
    const [newNews] = await db.insert(news).values({
      ...newsData,
      updatedAt: new Date()
    }).returning();
    return newNews;
  }

  /**
   * Update an existing news article
   */
  async updateNews(id: number, updates: Partial<News>): Promise<News | undefined> {
    const [updatedNews] = await db.update(news)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(news.id, id))
      .returning();
    return updatedNews;
  }

  /**
   * Delete a news article
   */
  async deleteNews(id: number): Promise<boolean> {
    const result = await db.delete(news)
      .where(eq(news.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ===========================
  // FILE UPLOAD TRACKING OPERATIONS
  // ===========================

  /**
   * Get uploaded files with optional filters
   * Includes uploader username information
   */
  async getUploadedFiles(filters?: { uploadedBy?: number; category?: string; limit?: number }): Promise<FileItem[]> {
    const conditions = [];
    
    if (filters?.uploadedBy) {
      conditions.push(eq(uploadedFiles.uploadedBy, filters.uploadedBy));
    }
    if (filters?.category) {
      conditions.push(eq(uploadedFiles.category, filters.category));
    }

    const baseQuery = db
      .select({
        id: uploadedFiles.id,
        filename: uploadedFiles.filename,
        originalName: uploadedFiles.originalName,
        mimetype: uploadedFiles.mimetype,
        size: uploadedFiles.size,
        uploadedBy: uploadedFiles.uploadedBy,
        url: uploadedFiles.url,
        category: uploadedFiles.category,
        createdAt: uploadedFiles.createdAt,
        uploaderUsername: users.username,
      })
      .from(uploadedFiles)
      .leftJoin(users, eq(uploadedFiles.uploadedBy, users.id));

    const whereQuery = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    const orderedQuery = whereQuery.orderBy(desc(uploadedFiles.createdAt));

    const results = filters?.limit 
      ? await orderedQuery.limit(filters.limit)
      : await orderedQuery;
    
    return results.map(row => ({
      id: row.id,
      filename: row.filename,
      originalName: row.originalName,
      mimetype: row.mimetype,
      size: row.size,
      uploadedBy: row.uploadedBy,
      url: row.url,
      category: row.category || null,
      createdAt: row.createdAt || new Date(),
      uploaderUsername: row.uploaderUsername || 'Unknown',
    }));
  }

  /**
   * Get a single uploaded file by ID with uploader information
   */
  async getUploadedFile(id: number): Promise<FileItem | undefined> {
    const [result] = await db
      .select({
        id: uploadedFiles.id,
        filename: uploadedFiles.filename,
        originalName: uploadedFiles.originalName,
        mimetype: uploadedFiles.mimetype,
        size: uploadedFiles.size,
        uploadedBy: uploadedFiles.uploadedBy,
        url: uploadedFiles.url,
        category: uploadedFiles.category,
        createdAt: uploadedFiles.createdAt,
        uploaderUsername: users.username,
      })
      .from(uploadedFiles)
      .leftJoin(users, eq(uploadedFiles.uploadedBy, users.id))
      .where(eq(uploadedFiles.id, id));

    if (!result) return undefined;

    return {
      id: result.id,
      filename: result.filename,
      originalName: result.originalName,
      mimetype: result.mimetype,
      size: result.size,
      uploadedBy: result.uploadedBy,
      url: result.url,
      category: result.category || null,
      createdAt: result.createdAt || new Date(),
      uploaderUsername: result.uploaderUsername || 'Unknown',
    };
  }

  /**
   * Create a new uploaded file record
   */
  async createUploadedFile(fileData: InsertUploadedFile): Promise<UploadedFile> {
    const [created] = await db.insert(uploadedFiles).values({
      ...fileData,
      createdAt: new Date(),
    }).returning();
    return created;
  }

  /**
   * Delete an uploaded file record
   */
  async deleteUploadedFile(id: number): Promise<boolean> {
    const result = await db.delete(uploadedFiles).where(eq(uploadedFiles.id, id)).returning();
    return result.length > 0;
  }

  /**
   * Get storage statistics for all uploaded files
   */
  async getUploadedFilesStats(): Promise<StorageStats> {
    const allFiles = await db.select().from(uploadedFiles);
    
    const totalFiles = allFiles.length;
    const totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    
    let imageCount = 0;
    let videoCount = 0;
    let documentCount = 0;
    let otherCount = 0;

    for (const file of allFiles) {
      const mime = file.mimetype.toLowerCase();
      
      if (mime.startsWith('image/')) {
        imageCount++;
      } else if (mime.startsWith('video/')) {
        videoCount++;
      } else if (
        mime.includes('pdf') || 
        mime.includes('document') || 
        mime.includes('text') || 
        mime.includes('msword') || 
        mime.includes('wordprocessingml') ||
        mime.includes('spreadsheet') ||
        mime.includes('presentation')
      ) {
        documentCount++;
      } else {
        otherCount++;
      }
    }

    return {
      totalFiles,
      totalSize,
      imageCount,
      videoCount,
      documentCount,
      otherCount,
    };
  }

  // ===========================
  // SMS LOGS OPERATIONS
  // ===========================

  /**
   * Create a new SMS log entry
   */
  async createSmsLog(log: InsertSmsLog): Promise<SmsLog> {
    const [newLog] = await db.insert(smsLogs).values(log).returning();
    return newLog;
  }

  /**
   * Get SMS logs with optional filters
   */
  async getSmsLogs(filters?: { 
    phoneNumber?: string; 
    status?: string; 
    alertType?: string; 
    limit?: number; 
    offset?: number;
  }): Promise<SmsLog[]> {
    let query = db.select().from(smsLogs);

    const conditions = [];
    
    if (filters?.phoneNumber) {
      conditions.push(eq(smsLogs.phoneNumber, filters.phoneNumber));
    }
    
    if (filters?.status) {
      conditions.push(eq(smsLogs.status, filters.status));
    }
    
    if (filters?.alertType) {
      conditions.push(eq(smsLogs.alertType, filters.alertType));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(smsLogs.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  /**
   * Get all SMS logs for a specific phone number
   */
  async getSmsLogsByPhone(phoneNumber: string): Promise<SmsLog[]> {
    return await db.select().from(smsLogs)
      .where(eq(smsLogs.phoneNumber, phoneNumber))
      .orderBy(desc(smsLogs.createdAt));
  }

  /**
   * Get SMS log statistics
   */
  async getSmsLogStats(): Promise<{ 
    totalSent: number; 
    totalFailed: number; 
    totalPending: number;
  }> {
    const allLogs = await db.select().from(smsLogs);
    
    const stats = {
      totalSent: allLogs.filter(log => log.status === 'sent').length,
      totalFailed: allLogs.filter(log => log.status === 'failed').length,
      totalPending: allLogs.filter(log => log.status === 'pending').length
    };
    
    return stats;
  }

  // ===========================
  // REVENUE REPORT OPERATIONS
  // ===========================

  /**
   * Create a new revenue report
   */
  async createRevenueReport(report: InsertRevenueReport): Promise<RevenueReport> {
    const [created] = await db.insert(revenueReports).values(report).returning();
    return created;
  }

  /**
   * Get a revenue report by ID
   */
  async getRevenueReport(id: number): Promise<RevenueReport | undefined> {
    const [report] = await db.select().from(revenueReports).where(eq(revenueReports.id, id));
    return report || undefined;
  }

  /**
   * Get a revenue report by date
   */
  async getRevenueReportByDate(date: Date): Promise<RevenueReport | undefined> {
    const [report] = await db.select().from(revenueReports)
      .where(eq(revenueReports.reportDate, date));
    return report || undefined;
  }

  /**
   * Get revenue reports with optional date range filter
   */
  async getRevenueReports(filters?: { startDate?: Date; endDate?: Date; limit?: number }): Promise<RevenueReport[]> {
    const baseQuery = db.select().from(revenueReports);
    
    // Build where conditions
    const conditions = [];
    if (filters?.startDate && filters?.endDate) {
      conditions.push(gt(revenueReports.reportDate, filters.startDate));
      conditions.push(lt(revenueReports.reportDate, filters.endDate));
    }
    
    // Build query with proper chaining
    const whereQuery = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;
    
    const orderedQuery = whereQuery.orderBy(desc(revenueReports.reportDate));
    
    const finalQuery = filters?.limit 
      ? orderedQuery.limit(filters.limit)
      : orderedQuery;
    
    return await finalQuery;
  }

  /**
   * Update an existing revenue report
   */
  async updateRevenueReport(id: number, updates: Partial<RevenueReport>): Promise<RevenueReport | undefined> {
    const [updated] = await db.update(revenueReports)
      .set(updates)
      .where(eq(revenueReports.id, id))
      .returning();
    return updated || undefined;
  }

  /**
   * Get comprehensive revenue analytics for a date range
   */
  async getRevenueAnalytics(startDate: Date, endDate: Date): Promise<{
    totalRevenue: string;
    totalCommission: string;
    totalTransactions: number;
    averageTransactionValue: string;
    topCategories: Array<{ category: string; revenue: string; count: number }>;
    dailyReports: RevenueReport[];
  }> {
    const reports = await this.getRevenueReports({ startDate, endDate });
    
    const totalRevenue = reports.reduce((sum, report) => sum + parseFloat(report.totalRevenue || '0'), 0);
    const totalCommission = reports.reduce((sum, report) => sum + parseFloat(report.totalCommission || '0'), 0);
    const totalTransactions = reports.reduce((sum, report) => sum + (report.totalTransactions || 0), 0);
    
    // Get category analytics from transactions
    const categoryQuery = await db.select({
      category: products.category,
      revenue: transactions.amount,
      count: transactions.id
    })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .where(and(
      gt(transactions.createdAt, startDate),
      lt(transactions.createdAt, endDate),
      eq(transactions.status, 'completed')
    ));

    const categoryMap = new Map<string, { revenue: number; count: number }>();
    categoryQuery.forEach(row => {
      const existing = categoryMap.get(row.category) || { revenue: 0, count: 0 };
      existing.revenue += parseFloat(row.revenue || '0');
      existing.count += 1;
      categoryMap.set(row.category, existing);
    });

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        category,
        revenue: stats.revenue.toString(),
        count: stats.count
      }))
      .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))
      .slice(0, 5);

    return {
      totalRevenue: totalRevenue.toString(),
      totalCommission: totalCommission.toString(),
      totalTransactions,
      averageTransactionValue: totalTransactions > 0 ? (totalRevenue / totalTransactions).toString() : '0',
      topCategories,
      dailyReports: reports
    };
  }

  // ===========================
  // OWNER CONFIG OPERATIONS
  // ===========================

  /**
   * Create a new owner configuration
   */
  async createOwnerConfig(config: InsertOwnerConfig): Promise<OwnerConfig> {
    const [created] = await db.insert(ownerConfigs).values(config).returning();
    return created;
  }

  /**
   * Get an owner configuration by key
   */
  async getOwnerConfig(key: string): Promise<OwnerConfig | undefined> {
    const [config] = await db.select().from(ownerConfigs).where(eq(ownerConfigs.key, key));
    return config || undefined;
  }

  /**
   * Get all owner configurations
   */
  async getAllOwnerConfigs(): Promise<OwnerConfig[]> {
    return await db.select().from(ownerConfigs).orderBy(ownerConfigs.category, ownerConfigs.key);
  }

  /**
   * Get owner configurations by category
   */
  async getOwnerConfigsByCategory(category: string): Promise<OwnerConfig[]> {
    return await db.select().from(ownerConfigs)
      .where(eq(ownerConfigs.category, category))
      .orderBy(ownerConfigs.key);
  }

  /**
   * Update an owner configuration
   */
  async updateOwnerConfig(key: string, value: string, lastModifiedBy: number): Promise<OwnerConfig | undefined> {
    const [updated] = await db.update(ownerConfigs)
      .set({ value, lastModifiedBy, updatedAt: new Date() })
      .where(eq(ownerConfigs.key, key))
      .returning();
    return updated || undefined;
  }

  /**
   * Delete an owner configuration
   */
  async deleteOwnerConfig(key: string): Promise<void> {
    await db.delete(ownerConfigs).where(eq(ownerConfigs.key, key));
  }

  // ===========================
  // SEASON MANAGEMENT OPERATIONS
  // ===========================

  /**
   * Get all seasons
   */
  async getAllSeasons(): Promise<Season[]> {
    return await db.select().from(seasons).orderBy(desc(seasons.createdAt));
  }

  /**
   * Get a single season by ID
   */
  async getSeason(id: number): Promise<Season | undefined> {
    const [season] = await db.select().from(seasons).where(eq(seasons.id, id));
    return season || undefined;
  }

  /**
   * Create a new season
   */
  async createSeason(season: InsertSeason): Promise<Season> {
    const [newSeason] = await db.insert(seasons).values(season).returning();
    return newSeason;
  }

  /**
   * Update an existing season
   */
  async updateSeason(id: number, updates: Partial<Season>): Promise<Season | undefined> {
    const [updated] = await db.update(seasons)
      .set(updates)
      .where(eq(seasons.id, id))
      .returning();
    return updated || undefined;
  }

  /**
   * Delete a season
   */
  async deleteSeason(id: number): Promise<boolean> {
    const result = await db.delete(seasons).where(eq(seasons.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // ===========================
  // SEASON PARTICIPANT OPERATIONS
  // ===========================

  /**
   * Get all participants for a season with user information
   */
  async getSeasonParticipants(seasonId: number): Promise<Array<SeasonParticipant & { user?: Pick<User, 'id' | 'username' | 'email' | 'profilePicture'> }>> {
    const participants = await db.select({
      id: seasonParticipants.id,
      seasonId: seasonParticipants.seasonId,
      userId: seasonParticipants.userId,
      registeredAt: seasonParticipants.registeredAt,
      rank: seasonParticipants.rank,
      score: seasonParticipants.score,
      rewards: seasonParticipants.rewards,
      isActive: seasonParticipants.isActive,
      user: {
        id: users.id,
        username: users.username,
        email: users.email,
        profilePicture: users.profilePicture
      }
    })
    .from(seasonParticipants)
    .leftJoin(users, eq(seasonParticipants.userId, users.id))
    .where(eq(seasonParticipants.seasonId, seasonId))
    .orderBy(seasonParticipants.rank);

    return participants as any;
  }

  /**
   * Create a new season participant
   */
  async createSeasonParticipant(participant: InsertSeasonParticipant): Promise<SeasonParticipant> {
    const [newParticipant] = await db.insert(seasonParticipants).values(participant).returning();
    return newParticipant;
  }

  /**
   * Update a season participant
   */
  async updateSeasonParticipant(id: number, updates: Partial<SeasonParticipant>): Promise<SeasonParticipant | undefined> {
    const [updated] = await db.update(seasonParticipants)
      .set(updates)
      .where(eq(seasonParticipants.id, id))
      .returning();
    return updated || undefined;
  }

  // ===========================
  // SEASON REWARD OPERATIONS
  // ===========================

  /**
   * Get all rewards for a season
   */
  async getSeasonRewards(seasonId: number): Promise<SeasonReward[]> {
    return await db.select().from(seasonRewards)
      .where(eq(seasonRewards.seasonId, seasonId))
      .orderBy(desc(seasonRewards.createdAt));
  }

  /**
   * Create a new season reward
   */
  async createSeasonReward(reward: InsertSeasonReward): Promise<SeasonReward> {
    const [newReward] = await db.insert(seasonRewards).values(reward).returning();
    return newReward;
  }

  /**
   * Update a season reward
   */
  async updateSeasonReward(id: number, updates: Partial<SeasonReward>): Promise<SeasonReward | undefined> {
    const [updated] = await db.update(seasonRewards)
      .set(updates)
      .where(eq(seasonRewards.id, id))
      .returning();
    return updated || undefined;
  }

  // ===========================
  // OWNER-SPECIFIC ANALYTICS OPERATIONS
  // ===========================

  /**
   * Get comprehensive user analytics
   */
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
    const allUsers = await db.select().from(users);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.walletBalance !== '0' || u.role !== 'user').length,
      newUsersToday: allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= todayStart).length,
      newUsersThisWeek: allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= weekStart).length,
      newUsersThisMonth: allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= monthStart).length,
      adminUsers: allUsers.filter(u => u.role === 'admin' || u.role === 'owner').length,
      verifiedUsers: allUsers.filter(u => u.isVerified).length,
      pendingAdminRequests: allUsers.filter(u => u.adminRequestPending).length
    };
  }

  /**
   * Get comprehensive transaction analytics
   */
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
    const allTransactions = await db.select().from(transactions);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const completedTransactions = allTransactions.filter(t => t.status === 'completed');
    
    const totalRevenue = completedTransactions
      .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    
    const totalCommission = completedTransactions
      .reduce((sum, t) => sum + parseFloat(t.commission || '0'), 0);

    const revenueToday = completedTransactions
      .filter(t => t.createdAt && new Date(t.createdAt) >= todayStart)
      .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    
    const revenueThisWeek = completedTransactions
      .filter(t => t.createdAt && new Date(t.createdAt) >= weekStart)
      .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    
    const revenueThisMonth = completedTransactions
      .filter(t => t.createdAt && new Date(t.createdAt) >= monthStart)
      .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

    return {
      totalTransactions: allTransactions.length,
      completedTransactions: completedTransactions.length,
      pendingTransactions: allTransactions.filter(t => t.status === 'pending').length,
      disputedTransactions: allTransactions.filter(t => t.status === 'refunded').length,
      totalRevenue: totalRevenue.toString(),
      totalCommission: totalCommission.toString(),
      averageTransactionValue: allTransactions.length > 0 ? (totalRevenue / allTransactions.length).toString() : '0',
      transactionsToday: allTransactions.filter(t => t.createdAt && new Date(t.createdAt) >= todayStart).length,
      transactionsThisWeek: allTransactions.filter(t => t.createdAt && new Date(t.createdAt) >= weekStart).length,
      transactionsThisMonth: allTransactions.filter(t => t.createdAt && new Date(t.createdAt) >= monthStart).length,
      revenueToday: revenueToday.toString(),
      revenueThisWeek: revenueThisWeek.toString(),
      revenueThisMonth: revenueThisMonth.toString()
    };
  }

  /**
   * Get comprehensive escrow analytics
   */
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
    const allEscrows = await db.select().from(escrowTransactions);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const completedEscrows = allEscrows.filter(e => e.status === 'completed');
    const totalValue = completedEscrows.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);
    
    // Calculate average completion time
    const completionTimes = completedEscrows
      .filter(e => e.completedAt)
      .map(e => new Date(e.completedAt!).getTime() - new Date(e.createdAt!).getTime());
    const avgCompletionTime = completionTimes.length > 0 
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length / (1000 * 60 * 60 * 24) // days
      : 0;

    return {
      totalEscrows: allEscrows.length,
      pendingEscrows: allEscrows.filter(e => e.status === 'pending').length,
      activeEscrows: allEscrows.filter(e => e.status === 'active').length,
      completedEscrows: completedEscrows.length,
      disputedEscrows: allEscrows.filter(e => e.status === 'disputed').length,
      averageEscrowValue: completedEscrows.length > 0 ? (totalValue / completedEscrows.length).toString() : '0',
      escrowsToday: allEscrows.filter(e => e.createdAt && new Date(e.createdAt) >= todayStart).length,
      averageCompletionTime: avgCompletionTime
    };
  }

  /**
   * Get comprehensive chat analytics
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

  // ===========================
  // ADVANCED OWNER OPERATIONS
  // ===========================

  /**
   * Get all chats with comprehensive details
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

  /**
   * Get all users with comprehensive details
   */
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
    const allUsers = await db.select().from(users);
    const allProducts = await db.select().from(products);
    const allTransactions = await db.select().from(transactions);
    const allDocuments = await db.select().from(adminVerificationDocuments);

    return allUsers.map(user => {
      const userProducts = allProducts.filter(p => p.sellerId === user.id);
      const userTransactions = allTransactions.filter(t => t.buyerId === user.id || t.sellerId === user.id);
      const userDocuments = allDocuments.filter(d => d.userId === user.id);
      const approvedDocs = userDocuments.filter(d => d.status === 'approved');

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName || undefined,
        role: user.role,
        isVerified: user.isVerified || false,
        walletBalance: user.walletBalance || '0',
        totalProducts: userProducts.length,
        totalTransactions: userTransactions.length,
        adminRequestPending: user.adminRequestPending || false,
        documentsCount: userDocuments.length,
        approvedDocuments: approvedDocs.length,
        createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString()
      };
    });
  }

  /**
   * Get system health metrics
   */
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
    const userAnalytics = await this.getUserAnalytics();
    const transactionAnalytics = await this.getTransactionAnalytics();
    const allProducts = await db.select().from(products);
    
    return {
      totalUsers: userAnalytics.totalUsers,
      activeUsersToday: userAnalytics.newUsersToday,
      totalProducts: allProducts.length,
      activeProducts: allProducts.filter(p => p.status === 'active').length,
      totalTransactions: transactionAnalytics.totalTransactions,
      transactionsToday: transactionAnalytics.transactionsToday,
      systemLoad: Math.random() * 100, // Placeholder - would need actual monitoring
      errorRate: Math.random() * 5, // Placeholder - would need actual error tracking
      responseTime: Math.random() * 200 + 50 // Placeholder - would need actual response time tracking
    };
  }
}
