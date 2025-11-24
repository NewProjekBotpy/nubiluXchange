import type {
  AdminConfig,
  InsertAdminConfig,
  AdminTemplate,
  InsertAdminTemplate,
  AdminRule,
  InsertAdminRule,
  AdminBlacklist,
  InsertAdminBlacklist,
  AdminActivityLog,
  InsertAdminActivityLog,
  AdminOtpCode,
  InsertAdminOtpCode,
  AdminVerificationDocument,
  InsertAdminVerificationDocument,
  SecurityAlert,
  InsertSecurityAlert,
  VerificationSession,
  InsertVerificationSession,
  FraudAlert,
  InsertFraudAlert,
  News,
  Product,
  StatusUpdate
} from "@shared/schema";

// Type alias for consistency
export type VerificationDocument = AdminVerificationDocument;

export interface IAdminRepository {
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

  // Admin verification document operations
  createAdminVerificationDocument(document: InsertAdminVerificationDocument): Promise<AdminVerificationDocument>;
  getAdminVerificationDocument(id: number): Promise<AdminVerificationDocument | undefined>;
  getAdminVerificationDocumentsByUser(userId: number): Promise<AdminVerificationDocument[]>;
  getAllPendingDocuments(): Promise<AdminVerificationDocument[]>;
  updateAdminVerificationDocument(id: number, updates: Partial<AdminVerificationDocument>): Promise<AdminVerificationDocument | undefined>;
  deleteAdminVerificationDocument(id: number): Promise<void>;

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
}
