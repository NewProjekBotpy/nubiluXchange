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
  User
} from "@shared/schema";

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

export interface ISystemRepository {
  // News operations
  getPublishedNews(): Promise<News[]>;
  getNewsById(id: number): Promise<News | undefined>;
  createNews(news: InsertNews): Promise<News>;
  updateNews(id: number, updates: Partial<News>): Promise<News | undefined>;
  deleteNews(id: number): Promise<boolean>;

  // File upload tracking operations
  getUploadedFiles(filters?: { uploadedBy?: number; category?: string; limit?: number }): Promise<FileItem[]>;
  getUploadedFile(id: number): Promise<FileItem | undefined>;
  createUploadedFile(fileData: InsertUploadedFile): Promise<UploadedFile>;
  deleteUploadedFile(id: number): Promise<boolean>;
  getUploadedFilesStats(): Promise<StorageStats>;

  // SMS logs operations
  createSmsLog(log: InsertSmsLog): Promise<SmsLog>;
  getSmsLogs(filters?: { phoneNumber?: string; status?: string; alertType?: string; limit?: number; offset?: number }): Promise<SmsLog[]>;
  getSmsLogsByPhone(phoneNumber: string): Promise<SmsLog[]>;
  getSmsLogStats(): Promise<{ totalSent: number; totalFailed: number; totalPending: number }>;

  // Revenue report operations
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

  // Owner config operations
  createOwnerConfig(config: InsertOwnerConfig): Promise<OwnerConfig>;
  getOwnerConfig(key: string): Promise<OwnerConfig | undefined>;
  getAllOwnerConfigs(): Promise<OwnerConfig[]>;
  getOwnerConfigsByCategory(category: string): Promise<OwnerConfig[]>;
  updateOwnerConfig(key: string, value: string, lastModifiedBy: number): Promise<OwnerConfig | undefined>;
  deleteOwnerConfig(key: string): Promise<void>;

  // Season management operations
  getAllSeasons(): Promise<Season[]>;
  getSeason(id: number): Promise<Season | undefined>;
  createSeason(season: InsertSeason): Promise<Season>;
  updateSeason(id: number, updates: Partial<Season>): Promise<Season | undefined>;
  deleteSeason(id: number): Promise<boolean>;

  // Season participant operations
  getSeasonParticipants(seasonId: number): Promise<Array<SeasonParticipant & { user?: Pick<User, 'id' | 'username' | 'email' | 'profilePicture'> }>>;
  createSeasonParticipant(participant: InsertSeasonParticipant): Promise<SeasonParticipant>;
  updateSeasonParticipant(id: number, updates: Partial<SeasonParticipant>): Promise<SeasonParticipant | undefined>;

  // Season reward operations
  getSeasonRewards(seasonId: number): Promise<SeasonReward[]>;
  createSeasonReward(reward: InsertSeasonReward): Promise<SeasonReward>;
  updateSeasonReward(id: number, updates: Partial<SeasonReward>): Promise<SeasonReward | undefined>;

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
}
