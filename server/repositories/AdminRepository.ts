import type { IAdminRepository } from "./interfaces/IAdminRepository";
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
import {
  adminConfigs,
  adminTemplates,
  adminRules,
  adminBlacklist,
  adminActivityLogs,
  adminOtpCodes,
  adminVerificationDocuments,
  securityAlerts,
  verificationSessions,
  fraudAlerts,
  news,
  products,
  statusUpdates,
  users,
  reviews
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, and, or, gt, lt, gte, lte, count, ilike, sql } from "drizzle-orm";

// Type alias for consistency
export type VerificationDocument = AdminVerificationDocument;

/**
 * AdminRepository
 * 
 * Handles all admin-related database operations including:
 * - Admin configuration management
 * - Admin templates (email, SMS, notification templates)
 * - Admin rules (automated moderation, security rules)
 * - Admin blacklist management
 * - Admin activity logging
 * - Admin OTP codes for verification
 * - Admin verification documents
 * - Security alerts
 * - Verification sessions
 * - Fraud alert management
 * - Content moderation
 */
export class AdminRepository implements IAdminRepository {

  // ===========================
  // Admin Configuration Operations
  // ===========================

  async getAdminConfig(key: string): Promise<AdminConfig | undefined> {
    const [config] = await db.select().from(adminConfigs).where(eq(adminConfigs.key, key));
    return config || undefined;
  }

  async getAllAdminConfigs(): Promise<AdminConfig[]> {
    return await db.select().from(adminConfigs).orderBy(adminConfigs.key);
  }

  async setAdminConfig(config: InsertAdminConfig): Promise<AdminConfig> {
    // Try to upsert - update if exists, insert if not
    try {
      const [updated] = await db.update(adminConfigs)
        .set({ 
          value: config.value, 
          description: config.description,
          updatedBy: config.updatedBy,
          updatedAt: new Date()
        })
        .where(eq(adminConfigs.key, config.key))
        .returning();
      
      if (updated) return updated;
    } catch (error) {
      // If update fails (key doesn't exist), insert new record
    }
    
    const [newConfig] = await db.insert(adminConfigs).values(config).returning();
    return newConfig;
  }

  async updateAdminConfig(key: string, value: string, updatedBy: number): Promise<AdminConfig | undefined> {
    const [config] = await db.update(adminConfigs)
      .set({ value, updatedBy, updatedAt: new Date() })
      .where(eq(adminConfigs.key, key))
      .returning();
    return config || undefined;
  }

  // ===========================
  // Admin Template Operations
  // ===========================

  async getAdminTemplate(id: number): Promise<AdminTemplate | undefined> {
    const [template] = await db.select().from(adminTemplates).where(eq(adminTemplates.id, id));
    return template || undefined;
  }

  async getAdminTemplatesByType(type: string): Promise<AdminTemplate[]> {
    return await db.select().from(adminTemplates)
      .where(eq(adminTemplates.type, type))
      .orderBy(adminTemplates.name);
  }

  async getAllAdminTemplates(): Promise<AdminTemplate[]> {
    return await db.select().from(adminTemplates).orderBy(adminTemplates.type, adminTemplates.name);
  }

  async createAdminTemplate(template: InsertAdminTemplate): Promise<AdminTemplate> {
    const templateData = {
      ...template,
      variables: template.variables ? [...template.variables] as string[] : []
    };
    const [newTemplate] = await db.insert(adminTemplates).values(templateData).returning();
    return newTemplate;
  }

  async updateAdminTemplate(id: number, updates: Partial<AdminTemplate>): Promise<AdminTemplate | undefined> {
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    const [template] = await db.update(adminTemplates)
      .set(updateData)
      .where(eq(adminTemplates.id, id))
      .returning();
    return template || undefined;
  }

  async deleteAdminTemplate(id: number): Promise<void> {
    await db.delete(adminTemplates).where(eq(adminTemplates.id, id));
  }

  // ===========================
  // Admin Rule Operations
  // ===========================

  async getAdminRule(id: number): Promise<AdminRule | undefined> {
    const [rule] = await db.select().from(adminRules).where(eq(adminRules.id, id));
    return rule || undefined;
  }

  async getAdminRulesByType(ruleType: string): Promise<AdminRule[]> {
    return await db.select().from(adminRules)
      .where(eq(adminRules.ruleType, ruleType))
      .orderBy(adminRules.priority, adminRules.name);
  }

  async getAllAdminRules(): Promise<AdminRule[]> {
    return await db.select().from(adminRules).orderBy(adminRules.priority, adminRules.ruleType, adminRules.name);
  }

  async getActiveAdminRules(): Promise<AdminRule[]> {
    return await db.select().from(adminRules)
      .where(eq(adminRules.isActive, true))
      .orderBy(adminRules.priority, adminRules.ruleType, adminRules.name);
  }

  async createAdminRule(rule: InsertAdminRule): Promise<AdminRule> {
    const [newRule] = await db.insert(adminRules).values(rule).returning();
    return newRule;
  }

  async updateAdminRule(id: number, updates: Partial<AdminRule>): Promise<AdminRule | undefined> {
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    const [rule] = await db.update(adminRules)
      .set(updateData)
      .where(eq(adminRules.id, id))
      .returning();
    return rule || undefined;
  }

  async deleteAdminRule(id: number): Promise<void> {
    await db.delete(adminRules).where(eq(adminRules.id, id));
  }

  // ===========================
  // Admin Blacklist Operations
  // ===========================

  async getAdminBlacklistItem(id: number): Promise<AdminBlacklist | undefined> {
    const [item] = await db.select().from(adminBlacklist).where(eq(adminBlacklist.id, id));
    return item || undefined;
  }

  async getAdminBlacklistByType(type: string): Promise<AdminBlacklist[]> {
    return await db.select().from(adminBlacklist)
      .where(eq(adminBlacklist.type, type))
      .orderBy(desc(adminBlacklist.createdAt));
  }

  async getAllAdminBlacklist(): Promise<AdminBlacklist[]> {
    return await db.select().from(adminBlacklist).orderBy(desc(adminBlacklist.createdAt));
  }

  async getActiveAdminBlacklist(): Promise<AdminBlacklist[]> {
    return await db.select().from(adminBlacklist)
      .where(eq(adminBlacklist.isActive, true))
      .orderBy(desc(adminBlacklist.createdAt));
  }

  async checkBlacklist(type: string, value: string): Promise<AdminBlacklist | undefined> {
    const [item] = await db.select().from(adminBlacklist)
      .where(and(
        eq(adminBlacklist.type, type),
        eq(adminBlacklist.value, value),
        eq(adminBlacklist.isActive, true)
      ));
    return item || undefined;
  }

  async createAdminBlacklistItem(item: InsertAdminBlacklist): Promise<AdminBlacklist> {
    const [newItem] = await db.insert(adminBlacklist).values(item).returning();
    return newItem;
  }

  async updateAdminBlacklistItem(id: number, updates: Partial<AdminBlacklist>): Promise<AdminBlacklist | undefined> {
    const [item] = await db.update(adminBlacklist)
      .set(updates)
      .where(eq(adminBlacklist.id, id))
      .returning();
    return item || undefined;
  }

  async deleteAdminBlacklistItem(id: number): Promise<void> {
    await db.delete(adminBlacklist).where(eq(adminBlacklist.id, id));
  }

  // ===========================
  // Admin Activity Logs Operations
  // ===========================

  async createAdminActivityLog(log: InsertAdminActivityLog): Promise<AdminActivityLog> {
    // Ensure details is a proper object
    const logData = {
      ...log,
      details: typeof log.details === 'object' && !Array.isArray(log.details) ? log.details : { value: log.details }
    };
    const [newLog] = await db.insert(adminActivityLogs).values(logData).returning();
    return newLog;
  }

  async getAdminActivityLogs(filters?: { userId?: number; adminId?: number; action?: string; category?: string; createdAtFrom?: Date; createdAtTo?: Date; limit?: number; offset?: number }): Promise<AdminActivityLog[]> {
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(adminActivityLogs.userId, filters.userId));
    }
    if (filters?.adminId) {
      conditions.push(eq(adminActivityLogs.adminId, filters.adminId));
    }
    if (filters?.action) {
      conditions.push(eq(adminActivityLogs.action, filters.action));
    }
    if (filters?.category) {
      conditions.push(eq(adminActivityLogs.category, filters.category));
    }
    if (filters?.createdAtFrom) {
      conditions.push(gte(adminActivityLogs.createdAt, filters.createdAtFrom));
    }
    if (filters?.createdAtTo) {
      conditions.push(lte(adminActivityLogs.createdAt, filters.createdAtTo));
    }

    const baseQuery = db.select().from(adminActivityLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(adminActivityLogs.createdAt));

    if (filters?.limit && filters?.offset) {
      return await baseQuery.limit(filters.limit).offset(filters.offset);
    } else if (filters?.limit) {
      return await baseQuery.limit(filters.limit);
    }

    return await baseQuery;
  }

  async getAdminActivityLogsByUser(userId: number): Promise<AdminActivityLog[]> {
    return await db.select().from(adminActivityLogs)
      .where(eq(adminActivityLogs.userId, userId))
      .orderBy(desc(adminActivityLogs.createdAt));
  }

  async getAdminActivityLogsByAdmin(adminId: number): Promise<AdminActivityLog[]> {
    return await db.select().from(adminActivityLogs)
      .where(eq(adminActivityLogs.adminId, adminId))
      .orderBy(desc(adminActivityLogs.createdAt));
  }

  async getAdminActivityLogsByAction(action: string): Promise<AdminActivityLog[]> {
    return await db.select().from(adminActivityLogs)
      .where(eq(adminActivityLogs.action, action))
      .orderBy(desc(adminActivityLogs.createdAt));
  }

  async getAdminActivityStats(): Promise<{ total: number; byCategory: Record<string, number>; byAction: Record<string, number> }> {
    // Get total count
    const totalResult = await db.select({ count: db.$count(adminActivityLogs) }).from(adminActivityLogs);
    const total = totalResult[0]?.count || 0;

    // Get stats by category
    const categoryStats = await db.select({
      category: adminActivityLogs.category,
      count: db.$count(adminActivityLogs)
    })
    .from(adminActivityLogs)
    .groupBy(adminActivityLogs.category);

    // Get stats by action
    const actionStats = await db.select({
      action: adminActivityLogs.action,
      count: db.$count(adminActivityLogs)
    })
    .from(adminActivityLogs)
    .groupBy(adminActivityLogs.action);

    const byCategory: Record<string, number> = {};
    categoryStats.forEach(stat => {
      if (stat.category) {
        byCategory[stat.category] = stat.count;
      }
    });

    const byAction: Record<string, number> = {};
    actionStats.forEach(stat => {
      if (stat.action) {
        byAction[stat.action] = stat.count;
      }
    });

    return { total, byCategory, byAction };
  }

  async getRecentAdminActivityCount(action: string, hoursBack: number): Promise<number> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursBack);
    
    const result = await db.select({ count: db.$count(adminActivityLogs) })
      .from(adminActivityLogs)
      .where(and(
        eq(adminActivityLogs.action, action),
        gt(adminActivityLogs.createdAt, cutoffTime)
      ));
    
    return result[0]?.count || 0;
  }

  async getActivityLogsByUser(userId: number, limit: number = 50): Promise<AdminActivityLog[]> {
    return await db.select().from(adminActivityLogs)
      .where(eq(adminActivityLogs.userId, userId))
      .orderBy(desc(adminActivityLogs.createdAt))
      .limit(limit);
  }

  // ===========================
  // Admin OTP Operations
  // ===========================

  async createAdminOtp(otp: InsertAdminOtpCode): Promise<AdminOtpCode> {
    const [newOtp] = await db.insert(adminOtpCodes).values(otp).returning();
    return newOtp;
  }

  async getAdminOtp(userId: number, purpose: string): Promise<AdminOtpCode | undefined> {
    const [otp] = await db.select().from(adminOtpCodes)
      .where(and(
        eq(adminOtpCodes.userId, userId),
        eq(adminOtpCodes.purpose, purpose),
        eq(adminOtpCodes.isUsed, false),
        gt(adminOtpCodes.expiresAt, new Date())
      ))
      .orderBy(desc(adminOtpCodes.createdAt))
      .limit(1);
    return otp || undefined;
  }

  async validateAdminOtp(userId: number, code: string, purpose: string): Promise<boolean> {
    const [otp] = await db.select().from(adminOtpCodes)
      .where(and(
        eq(adminOtpCodes.userId, userId),
        eq(adminOtpCodes.code, code),
        eq(adminOtpCodes.purpose, purpose),
        eq(adminOtpCodes.isUsed, false),
        gt(adminOtpCodes.expiresAt, new Date())
      ));
    
    if (!otp) return false;

    // Mark OTP as used
    await this.markAdminOtpAsUsed(otp.id);
    return true;
  }

  async markAdminOtpAsUsed(id: number): Promise<void> {
    await db.update(adminOtpCodes)
      .set({ isUsed: true, usedAt: new Date() })
      .where(eq(adminOtpCodes.id, id));
  }

  async cleanupExpiredOtps(): Promise<void> {
    await db.delete(adminOtpCodes)
      .where(or(
        lt(adminOtpCodes.expiresAt, new Date()),
        eq(adminOtpCodes.isUsed, true)
      ));
  }

  // ===========================
  // Admin Verification Document Operations
  // ===========================

  async createAdminVerificationDocument(document: InsertAdminVerificationDocument): Promise<AdminVerificationDocument> {
    const [created] = await db.insert(adminVerificationDocuments).values(document).returning();
    return created;
  }

  async getAdminVerificationDocument(id: number): Promise<AdminVerificationDocument | undefined> {
    const [doc] = await db.select().from(adminVerificationDocuments).where(eq(adminVerificationDocuments.id, id));
    return doc || undefined;
  }

  async getAdminVerificationDocumentsByUser(userId: number): Promise<AdminVerificationDocument[]> {
    return await db.select().from(adminVerificationDocuments)
      .where(eq(adminVerificationDocuments.userId, userId))
      .orderBy(desc(adminVerificationDocuments.createdAt));
  }

  async getAllPendingDocuments(): Promise<AdminVerificationDocument[]> {
    return await db.select().from(adminVerificationDocuments)
      .where(eq(adminVerificationDocuments.status, 'pending'))
      .orderBy(desc(adminVerificationDocuments.createdAt));
  }

  async updateAdminVerificationDocument(id: number, updates: Partial<AdminVerificationDocument>): Promise<AdminVerificationDocument | undefined> {
    const [updated] = await db.update(adminVerificationDocuments)
      .set(updates)
      .where(eq(adminVerificationDocuments.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAdminVerificationDocument(id: number): Promise<void> {
    await db.delete(adminVerificationDocuments).where(eq(adminVerificationDocuments.id, id));
  }

  // ===========================
  // Blacklist Operations (Filtered queries)
  // ===========================

  async getBlacklistEntries(filters?: {
    type?: string;
    value?: string;
    targetId?: number;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<AdminBlacklist[]> {
    const conditions = [];
    
    if (filters?.type) {
      conditions.push(eq(adminBlacklist.type, filters.type));
    }
    if (filters?.value) {
      conditions.push(eq(adminBlacklist.value, filters.value));
    }
    if (filters?.targetId) {
      conditions.push(eq(adminBlacklist.targetId, filters.targetId));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(adminBlacklist.isActive, filters.isActive));
    }

    const baseQuery = db.select().from(adminBlacklist);
    
    const whereQuery = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    let finalQuery = whereQuery.orderBy(desc(adminBlacklist.createdAt));

    if (filters?.limit && filters?.offset) {
      return await finalQuery.limit(filters.limit).offset(filters.offset);
    } else if (filters?.limit) {
      return await finalQuery.limit(filters.limit);
    } else if (filters?.offset) {
      return await finalQuery.offset(filters.offset);
    }

    return await finalQuery;
  }

  async createBlacklistEntry(entry: InsertAdminBlacklist): Promise<AdminBlacklist> {
    const [created] = await db.insert(adminBlacklist).values(entry).returning();
    return created;
  }

  async updateBlacklistEntry(id: number, updates: Partial<AdminBlacklist>): Promise<AdminBlacklist | undefined> {
    const [updated] = await db
      .update(adminBlacklist)
      .set(updates)
      .where(eq(adminBlacklist.id, id))
      .returning();
    return updated;
  }

  // ===========================
  // Security Alert Management (Database)
  // ===========================

  async getSecurityAlerts(): Promise<SecurityAlert[]> {
    return await db.select().from(securityAlerts).orderBy(desc(securityAlerts.detectedAt));
  }

  async getSecurityAlert(id: number): Promise<SecurityAlert | undefined> {
    const [alert] = await db.select().from(securityAlerts).where(eq(securityAlerts.id, id));
    return alert || undefined;
  }

  async createSecurityAlert(alert: Omit<SecurityAlert, 'id'>): Promise<SecurityAlert> {
    const [created] = await db.insert(securityAlerts).values(alert as InsertSecurityAlert).returning();
    return created;
  }

  async updateSecurityAlert(id: number, updates: Partial<SecurityAlert>): Promise<SecurityAlert> {
    const [updated] = await db.update(securityAlerts)
      .set(updates)
      .where(eq(securityAlerts.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Security alert with id ${id} not found`);
    }
    
    return updated;
  }

  async getActiveSecurityAlerts(): Promise<SecurityAlert[]> {
    return await db.select().from(securityAlerts)
      .where(or(eq(securityAlerts.status, 'active'), eq(securityAlerts.status, 'investigating')))
      .orderBy(desc(securityAlerts.detectedAt));
  }

  async getSecurityAlertsByUser(userId: number): Promise<SecurityAlert[]> {
    return await db.select().from(securityAlerts)
      .where(eq(securityAlerts.userId, userId))
      .orderBy(desc(securityAlerts.detectedAt));
  }

  // ===========================
  // Verification Management (Database - uses AdminVerificationDocuments table)
  // ===========================

  async getVerificationDocuments(): Promise<VerificationDocument[]> {
    return await db.select().from(adminVerificationDocuments).orderBy(desc(adminVerificationDocuments.createdAt));
  }

  async getVerificationDocument(id: number): Promise<VerificationDocument | undefined> {
    const [doc] = await db.select().from(adminVerificationDocuments).where(eq(adminVerificationDocuments.id, id));
    return doc || undefined;
  }

  async createVerificationDocument(document: Omit<VerificationDocument, 'id'>): Promise<VerificationDocument> {
    const [created] = await db.insert(adminVerificationDocuments).values(document as InsertAdminVerificationDocument).returning();
    return created;
  }

  async updateVerificationDocument(id: number, updates: Partial<VerificationDocument>): Promise<VerificationDocument> {
    const [updated] = await db.update(adminVerificationDocuments)
      .set(updates)
      .where(eq(adminVerificationDocuments.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Verification document with id ${id} not found`);
    }
    
    return updated;
  }

  async getVerificationDocumentsByUser(userId: number): Promise<VerificationDocument[]> {
    return await db.select().from(adminVerificationDocuments)
      .where(eq(adminVerificationDocuments.userId, userId))
      .orderBy(desc(adminVerificationDocuments.createdAt));
  }

  async getPendingVerificationDocuments(): Promise<VerificationDocument[]> {
    return await db.select().from(adminVerificationDocuments)
      .where(eq(adminVerificationDocuments.status, 'pending'))
      .orderBy(desc(adminVerificationDocuments.createdAt));
  }

  async getVerificationSessions(): Promise<VerificationSession[]> {
    return await db.select().from(verificationSessions).orderBy(desc(verificationSessions.startedAt));
  }

  async getVerificationSession(id: number): Promise<VerificationSession | undefined> {
    const [session] = await db.select().from(verificationSessions).where(eq(verificationSessions.id, id));
    return session || undefined;
  }

  async createVerificationSession(session: Omit<VerificationSession, 'id'>): Promise<VerificationSession> {
    const [created] = await db.insert(verificationSessions).values(session as InsertVerificationSession).returning();
    return created;
  }

  async updateVerificationSession(id: number, updates: Partial<VerificationSession>): Promise<VerificationSession> {
    const [updated] = await db.update(verificationSessions)
      .set(updates)
      .where(eq(verificationSessions.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Verification session with id ${id} not found`);
    }
    
    return updated;
  }

  async getVerificationSessionsByUser(userId: number): Promise<VerificationSession[]> {
    return await db.select().from(verificationSessions)
      .where(eq(verificationSessions.userId, userId))
      .orderBy(desc(verificationSessions.startedAt));
  }

  // ===========================
  // Fraud Alert Management
  // ===========================

  async getFraudAlert(id: number): Promise<FraudAlert | undefined> {
    const [alert] = await db.select().from(fraudAlerts).where(eq(fraudAlerts.id, id));
    return alert || undefined;
  }

  async getFraudAlerts(filters?: {
    status?: string;
    severity?: string;
    alertType?: string;
    limit?: number;
    offset?: number;
  }): Promise<FraudAlert[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(fraudAlerts.status, filters.status));
    }
    if (filters?.severity) {
      conditions.push(eq(fraudAlerts.severity, filters.severity));
    }
    if (filters?.alertType) {
      conditions.push(eq(fraudAlerts.alertType, filters.alertType));
    }

    const baseQuery = db.select().from(fraudAlerts);
    
    const whereQuery = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    let finalQuery = whereQuery.orderBy(desc(fraudAlerts.createdAt));

    if (filters?.limit && filters?.offset) {
      return await finalQuery.limit(filters.limit).offset(filters.offset);
    } else if (filters?.limit) {
      return await finalQuery.limit(filters.limit);
    } else if (filters?.offset) {
      return await finalQuery.offset(filters.offset);
    }

    return await finalQuery;
  }

  async createFraudAlert(alert: InsertFraudAlert): Promise<FraudAlert> {
    const [created] = await db.insert(fraudAlerts).values(alert).returning();
    return created;
  }

  async updateFraudAlert(id: number, updates: Partial<FraudAlert>): Promise<FraudAlert | undefined> {
    const [updated] = await db.update(fraudAlerts)
      .set(updates)
      .where(eq(fraudAlerts.id, id))
      .returning();
    return updated || undefined;
  }

  async acknowledgeFraudAlert(id: number, adminUserId: number): Promise<boolean> {
    const [updated] = await db.update(fraudAlerts)
      .set({
        status: 'investigating',
        acknowledgedAt: new Date(),
        acknowledgedBy: adminUserId
      })
      .where(eq(fraudAlerts.id, id))
      .returning();
    return !!updated;
  }

  async resolveFraudAlert(id: number, adminUserId: number, resolution: string, note?: string): Promise<boolean> {
    const [updated] = await db.update(fraudAlerts)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: adminUserId,
        resolutionNote: note || resolution
      })
      .where(eq(fraudAlerts.id, id))
      .returning();
    return !!updated;
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
    const allAlerts = await db.select().from(fraudAlerts);
    
    // Today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalActive = allAlerts.filter(alert => alert.status === 'active').length;
    const totalToday = allAlerts.filter(alert => alert.createdAt && new Date(alert.createdAt) >= today).length;
    const highPriority = allAlerts.filter(alert => alert.severity === 'high' || alert.severity === 'critical').length;
    
    // Count by type
    const byType: Record<string, number> = {};
    allAlerts.forEach(alert => {
      byType[alert.alertType] = (byType[alert.alertType] || 0) + 1;
    });
    
    // Count by status
    const byStatus: Record<string, number> = {};
    allAlerts.forEach(alert => {
      byStatus[alert.status] = (byStatus[alert.status] || 0) + 1;
    });
    
    // Calculate average response time for resolved alerts
    const resolvedAlerts = allAlerts.filter(alert => 
      alert.status === 'resolved' && alert.acknowledgedAt && alert.resolvedAt
    );
    
    let totalResponseTime = 0;
    resolvedAlerts.forEach(alert => {
      if (alert.acknowledgedAt && alert.resolvedAt) {
        const responseTime = new Date(alert.resolvedAt).getTime() - new Date(alert.acknowledgedAt).getTime();
        totalResponseTime += responseTime / (1000 * 60); // Convert to minutes
      }
    });
    
    const averageResponseTime = resolvedAlerts.length > 0 ? totalResponseTime / resolvedAlerts.length : 0;
    
    // Calculate false positive rate
    const falsePositives = allAlerts.filter(alert => alert.status === 'false_positive').length;
    const falsePositiveRate = allAlerts.length > 0 ? (falsePositives / allAlerts.length) * 100 : 0;
    
    return {
      totalActive,
      totalToday,
      highPriority,
      byType,
      byStatus,
      averageResponseTime,
      falsePositiveRate
    };
  }

  // ===========================
  // Admin Content Management Operations
  // ===========================

  async getNewsCount(): Promise<number> {
    const result = await db.select({ count: count(news.id) }).from(news);
    return Number(result[0]?.count) || 0;
  }

  async getProductsCount(): Promise<number> {
    const result = await db.select({ count: count(products.id) }).from(products);
    return Number(result[0]?.count) || 0;
  }

  async getStatusUpdatesCount(): Promise<number> {
    const result = await db.select({ count: count(statusUpdates.id) }).from(statusUpdates);
    return Number(result[0]?.count) || 0;
  }

  async getPendingReviewsCount(): Promise<number> {
    const result = await db.select({ count: count(reviews.id) })
      .from(reviews)
      .where(eq(reviews.moderationStatus, 'pending'));
    return Number(result[0]?.count) || 0;
  }

  async getFlaggedContentCount(): Promise<number> {
    // Count products that are suspended or under review
    const result = await db.select({ count: count(products.id) })
      .from(products)
      .where(or(eq(products.status, 'suspended'), eq(products.status, 'under_review')));
    return Number(result[0]?.count) || 0;
  }

  async getPublishedTodayCount(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await db.select({ count: count(news.id) })
      .from(news)
      .where(and(
        eq(news.isPublished, true),
        gt(news.createdAt, today),
        lt(news.createdAt, tomorrow)
      ));
    return Number(result[0]?.count) || 0;
  }

  async getNewsForAdmin(search: string, status: string): Promise<News[]> {
    const conditions = [];
    
    if (search) {
      conditions.push(or(
        ilike(news.title, `%${search}%`),
        ilike(news.content, `%${search}%`)
      ));
    }

    if (status !== 'all') {
      switch (status) {
        case 'published':
          conditions.push(eq(news.isPublished, true));
          break;
        case 'draft':
          conditions.push(eq(news.isPublished, false));
          break;
      }
    }

    const baseQuery = db.select().from(news);
    const whereQuery = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    return await whereQuery.orderBy(desc(news.createdAt));
  }

  async getProductsForAdmin(search: string, status: string): Promise<any[]> {
    const conditions = [];
    
    if (search) {
      conditions.push(or(
        ilike(products.title, `%${search}%`),
        ilike(products.description, `%${search}%`)
      ));
    }

    if (status !== 'all') {
      conditions.push(eq(products.status, status));
    }

    const baseQuery = db.select({
      id: products.id,
      title: products.title,
      description: products.description,
      price: products.price,
      status: products.status,
      sellerId: products.sellerId,
      category: products.category,
      images: products.images,
      createdAt: products.createdAt,
      sellerUsername: users.username
    })
    .from(products)
    .leftJoin(users, eq(products.sellerId, users.id));

    const whereQuery = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    return await whereQuery.orderBy(desc(products.createdAt));
  }

  async getStatusUpdatesForAdmin(search: string, status: string): Promise<any[]> {
    const conditions = [];
    
    if (search) {
      conditions.push(ilike(statusUpdates.content, `%${search}%`));
    }

    if (status !== 'all') {
      switch (status) {
        case 'public':
          conditions.push(eq(statusUpdates.isPublic, true));
          break;
        case 'private':
          conditions.push(eq(statusUpdates.isPublic, false));
          break;
        case 'flagged':
          // Add logic for flagged statuses if needed
          break;
      }
    }

    const baseQuery = db.select({
      id: statusUpdates.id,
      userId: statusUpdates.userId,
      content: statusUpdates.content,
      media: statusUpdates.media,
      mediaType: statusUpdates.mediaType,
      isPublic: statusUpdates.isPublic,
      viewCount: statusUpdates.viewCount,
      expiresAt: statusUpdates.expiresAt,
      createdAt: statusUpdates.createdAt,
      username: users.username
    })
    .from(statusUpdates)
    .leftJoin(users, eq(statusUpdates.userId, users.id));

    const whereQuery = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    return await whereQuery.orderBy(desc(statusUpdates.createdAt));
  }

  async moderateProduct(id: number, data: any): Promise<Product | undefined> {
    const [updated] = await db.update(products)
      .set({
        status: data.status,
        ...data
      })
      .where(eq(products.id, id))
      .returning();
    
    return updated;
  }

  async moderateStatusUpdate(id: number, data: any): Promise<StatusUpdate | undefined> {
    const [updated] = await db.update(statusUpdates)
      .set({
        isPublic: data.isPublic,
        ...data
      })
      .where(eq(statusUpdates.id, id))
      .returning();
    
    return updated;
  }

  async moderateNews(id: number, data: any): Promise<News | undefined> {
    const [updated] = await db.update(news)
      .set({
        isPublished: data.isPublished,
        isPinned: data.isPinned,
        ...data
      })
      .where(eq(news.id, id))
      .returning();
    
    return updated;
  }
}
