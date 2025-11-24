import { adminBlacklistCreateSchema, type AdminBlacklist, type AdminBlacklistCreate, type Product, type User } from "@shared/schema";
import { logUserActivity } from "../utils/activity-logger";
import { logError, logWarning, logInfo, logDebug } from '../utils/logger';
import type { Request } from "express";
import { AdminRepository } from "../repositories/AdminRepository";
import { UserRepository } from "../repositories/UserRepository";

const adminRepo = new AdminRepository();
const userRepo = new UserRepository();

export class BlacklistService {
  /**
   * Check if a user is blacklisted by ID, username, or email
   */
  static async checkUserBlacklist(
    user: User | { id?: number; username?: string; email?: string }
  ): Promise<{ isBlacklisted: boolean; entries: AdminBlacklist[] }> {
    const blacklistEntries: AdminBlacklist[] = [];

    // Check blacklist by user ID
    if (user.id) {
      const idEntries = await adminRepo.getBlacklistEntries({
        type: 'user',
        targetId: user.id,
        isActive: true
      });
      blacklistEntries.push(...idEntries);
    }

    // Check blacklist by username
    if (user.username) {
      const usernameEntries = await adminRepo.getBlacklistEntries({
        type: 'user',
        value: user.username.toLowerCase(),
        isActive: true
      });
      blacklistEntries.push(...usernameEntries);
    }

    // Check blacklist by email
    if (user.email) {
      const emailEntries = await adminRepo.getBlacklistEntries({
        type: 'user',
        value: user.email.toLowerCase(),
        isActive: true
      });
      blacklistEntries.push(...emailEntries);
    }

    // Remove duplicates based on ID
    const uniqueEntries = blacklistEntries.filter((entry, index, self) => 
      index === self.findIndex(e => e.id === entry.id)
    );

    return {
      isBlacklisted: uniqueEntries.length > 0,
      entries: uniqueEntries
    };
  }

  /**
   * Check if a product is blacklisted by ID, title, or contains blacklisted keywords
   */
  static async checkProductBlacklist(
    product: Product | { id?: number; title?: string; description?: string }
  ): Promise<{ isBlacklisted: boolean; entries: AdminBlacklist[]; reasons: string[] }> {
    const blacklistEntries: AdminBlacklist[] = [];
    const reasons: string[] = [];

    // Check blacklist by product ID
    if (product.id) {
      const idEntries = await adminRepo.getBlacklistEntries({
        type: 'product',
        targetId: product.id,
        isActive: true
      });
      blacklistEntries.push(...idEntries);
      if (idEntries.length > 0) {
        reasons.push('Product ID is blacklisted');
      }
    }

    // Check blacklist by product title
    if (product.title) {
      const titleEntries = await adminRepo.getBlacklistEntries({
        type: 'product',
        value: product.title.toLowerCase(),
        isActive: true
      });
      blacklistEntries.push(...titleEntries);
      if (titleEntries.length > 0) {
        reasons.push('Product title is blacklisted');
      }
    }

    // Check for blacklisted keywords in title and description
    const keywordEntries = await adminRepo.getBlacklistEntries({
      type: 'keyword',
      isActive: true
    });

    const searchableText = `${product.title || ''} ${product.description || ''}`.toLowerCase();
    
    for (const keywordEntry of keywordEntries) {
      if (searchableText.includes(keywordEntry.value.toLowerCase())) {
        blacklistEntries.push(keywordEntry);
        reasons.push(`Contains blacklisted keyword: "${keywordEntry.value}"`);
      }
    }

    // Remove duplicates based on ID
    const uniqueEntries = blacklistEntries.filter((entry, index, self) => 
      index === self.findIndex(e => e.id === entry.id)
    );

    return {
      isBlacklisted: uniqueEntries.length > 0,
      entries: uniqueEntries,
      reasons: Array.from(new Set(reasons)) // Remove duplicate reasons
    };
  }

  /**
   * Check if an IP address is blacklisted
   */
  static async checkIpBlacklist(
    ipAddress: string
  ): Promise<{ isBlacklisted: boolean; entries: AdminBlacklist[] }> {
    const ipEntries = await adminRepo.getBlacklistEntries({
      type: 'ip_address',
      value: ipAddress,
      isActive: true
    });

    return {
      isBlacklisted: ipEntries.length > 0,
      entries: ipEntries
    };
  }

  /**
   * Comprehensive blacklist check for a user registration attempt
   */
  static async validateUserRegistration(
    userData: { username: string; email: string },
    ipAddress?: string,
    req?: Request
  ): Promise<{ allowed: boolean; violations: string[]; blacklistEntries: AdminBlacklist[] }> {
    const violations: string[] = [];
    const blacklistEntries: AdminBlacklist[] = [];

    // Check user data against blacklist
    const userCheck = await this.checkUserBlacklist(userData);
    if (userCheck.isBlacklisted) {
      violations.push('Username or email is blacklisted');
      blacklistEntries.push(...userCheck.entries);
    }

    // Check IP address if provided
    if (ipAddress) {
      const ipCheck = await this.checkIpBlacklist(ipAddress);
      if (ipCheck.isBlacklisted) {
        violations.push('IP address is blacklisted');
        blacklistEntries.push(...ipCheck.entries);
      }
    }

    const allowed = violations.length === 0;

    // Log the validation attempt
    if (req && (!allowed || blacklistEntries.length > 0)) {
      await logUserActivity(
        null, // No user ID for registration attempt
        'security',
        'system_action',
        {
          type: 'user_registration',
          username: userData.username,
          email: userData.email,
          ipAddress,
          violations,
          allowed
        },
        undefined,
        req
      );
    }

    return {
      allowed,
      violations,
      blacklistEntries
    };
  }

  /**
   * Comprehensive blacklist check for a product creation/update attempt
   */
  static async validateProduct(
    product: { id?: number; title: string; description?: string; sellerId: number },
    req?: Request
  ): Promise<{ allowed: boolean; violations: string[]; blacklistEntries: AdminBlacklist[] }> {
    const violations: string[] = [];
    const blacklistEntries: AdminBlacklist[] = [];

    // Check product against blacklist
    const productCheck = await this.checkProductBlacklist(product);
    if (productCheck.isBlacklisted) {
      violations.push(...productCheck.reasons);
      blacklistEntries.push(...productCheck.entries);
    }

    // Check if seller is blacklisted
    const seller = await userRepo.getUser(product.sellerId);
    if (!seller) {
      // If seller doesn't exist, this is a critical data integrity issue
      violations.push('Product seller account not found - data integrity issue');
      logError(new Error('Seller not found'), 'Blacklist validation: Seller not found for product', { 
        service: 'BlacklistService', 
        sellerId: product.sellerId, 
        productId: product.id || 'new' 
      });
    } else {
      const sellerCheck = await this.checkUserBlacklist(seller);
      if (sellerCheck.isBlacklisted) {
        violations.push('Product seller is blacklisted');
        blacklistEntries.push(...sellerCheck.entries);
      }
    }

    const allowed = violations.length === 0;

    // Log the validation attempt
    if (req && (!allowed || blacklistEntries.length > 0)) {
      await logUserActivity(
        product.sellerId,
        'security',
        'system_action',
        {
          type: 'product_validation',
          productId: product.id,
          productTitle: product.title,
          violations,
          allowed
        },
        undefined,
        req
      );
    }

    return {
      allowed,
      violations,
      blacklistEntries
    };
  }

  /**
   * Add a new blacklist entry with validation and logging
   */
  static async addBlacklistEntry(
    entry: AdminBlacklistCreate,
    adminUserId: number,
    req?: Request
  ): Promise<AdminBlacklist> {
    // Validate the entry data
    const validatedData = adminBlacklistCreateSchema.parse({
      ...entry,
      // Normalize values for consistent searching
      value: entry.value.toLowerCase().trim()
    });

    // Check for existing active entry with same type and value
    const existingEntries = await adminRepo.getBlacklistEntries({
      type: validatedData.type,
      value: validatedData.value,
      isActive: true
    });

    if (existingEntries.length > 0) {
      throw new Error(`Blacklist entry already exists for ${validatedData.type}: ${validatedData.value}`);
    }

    // Create the blacklist entry
    const blacklistEntry = await adminRepo.createBlacklistEntry({
      ...validatedData,
      createdBy: adminUserId
    });

    // Log the blacklist creation
    if (req) {
      await logUserActivity(
        adminUserId,
        'admin_action',
        'system_action',
        {
          blacklistId: blacklistEntry.id,
          type: blacklistEntry.type,
          value: blacklistEntry.value,
          reason: blacklistEntry.reason,
          targetId: blacklistEntry.targetId
        },
        undefined,
        req
      );
    }

    return blacklistEntry;
  }

  /**
   * Remove/deactivate a blacklist entry
   */
  static async removeBlacklistEntry(
    entryId: number,
    adminUserId: number,
    req?: Request
  ): Promise<AdminBlacklist | undefined> {
    const updatedEntry = await adminRepo.updateBlacklistEntry(entryId, { 
      isActive: false 
    });

    if (updatedEntry && req) {
      await logUserActivity(
        adminUserId,
        'admin_action',
        'system_action',
        {
          blacklistId: updatedEntry.id,
          type: updatedEntry.type,
          value: updatedEntry.value
        },
        undefined,
        req
      );
    }

    return updatedEntry || undefined;
  }

  /**
   * Bulk check multiple users against blacklist (for admin reports)
   */
  static async bulkCheckUsers(
    userIds: number[]
  ): Promise<Record<number, { isBlacklisted: boolean; entries: AdminBlacklist[] }>> {
    const results: Record<number, { isBlacklisted: boolean; entries: AdminBlacklist[] }> = {};

    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      // Get users in batch
      const users = await Promise.all(
        batch.map(id => userRepo.getUser(id))
      );

      // Check each user
      for (let j = 0; j < users.length; j++) {
        const user = users[j];
        const userId = batch[j];
        
        if (user) {
          results[userId] = await this.checkUserBlacklist(user);
        } else {
          results[userId] = { isBlacklisted: false, entries: [] };
        }
      }
    }

    return results;
  }

  /**
   * Get blacklist statistics for admin dashboard
   */
  static async getBlacklistStats(): Promise<{
    totalActive: number;
    byType: Record<string, number>;
    recentEntries: AdminBlacklist[];
  }> {
    const allActiveEntries = await adminRepo.getBlacklistEntries({
      isActive: true
    });

    const byType = allActiveEntries.reduce((acc: Record<string, number>, entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + 1;
      return acc;
    }, {});

    // Get recent entries (last 10)
    const recentEntries = allActiveEntries
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
      .slice(0, 10);

    return {
      totalActive: allActiveEntries.length,
      byType,
      recentEntries
    };
  }
}