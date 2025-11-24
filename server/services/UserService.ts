import { UserRepository } from "../repositories/UserRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";
import { logUserActivity } from "../utils/activity-logger";
import { logError, logWarning, logInfo, logDebug } from '../utils/logger';
import { insertUserSchema, type SecuritySettingsRequest } from "@shared/schema";
import type { Request } from "express";
import { hasAdminAccess } from "@shared/auth-utils";
import { hashPassword, comparePassword } from "../utils/auth";

const userRepo = new UserRepository();
const transactionRepo = new TransactionRepository();

export class UserService {
  static async getUserProfile(userId: number, currentUserId?: number) {
    try {
      const user = await userRepo.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Remove sensitive data from response
      const { password, ...userProfile } = user;
      
      // If viewing own profile, return all data
      if (currentUserId === userId) {
        return userProfile;
      }
      
      // For other users, return limited public profile (including avatar settings for display)
      return {
        id: userProfile.id,
        username: userProfile.username,
        displayName: userProfile.displayName,
        bio: userProfile.bio,
        profilePicture: userProfile.profilePicture,
        bannerImage: userProfile.bannerImage,
        avatarAuraColor: userProfile.avatarAuraColor,
        avatarBorderStyle: userProfile.avatarBorderStyle,
        isVerified: userProfile.isVerified,
        createdAt: userProfile.createdAt
      };
    } catch (error: any) {
      logError(error, 'Get user profile error', {
        service: 'UserService',
        userId,
        currentUserId
      });
      
      if (error.message.includes('not found')) {
        throw error;
      }
      
      throw new Error('Failed to retrieve user profile. Please try again.');
    }
  }

  static async updateUserProfile(userId: number, profileData: any, req?: Request) {
    try {
      const user = await userRepo.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Validate profile data (exclude sensitive fields)
      const allowedUpdates = insertUserSchema.partial().omit({
        password: true,
        role: true,
        walletBalance: true,
        isAdminApproved: true,
        adminApprovedAt: true,
        approvedByOwnerId: true,
        adminRequestPending: true,
        adminRequestReason: true,
        adminRequestAt: true
      }).parse(profileData);
      
      const updatedUser = await userRepo.updateUser(userId, allowedUpdates);
      if (!updatedUser) {
        throw new Error('Failed to update profile');
      }
      
      // Log profile update activity
      await logUserActivity(userId, 'profile_update', 'user_action', {
        updatedFields: Object.keys(allowedUpdates)
      }, undefined, req);
      
      // Remove password from response
      const { password, ...userResponse } = updatedUser;
      return userResponse;
    } catch (error: any) {
      logError(error, 'Update user profile error', {
        service: 'UserService',
        userId
      });
      
      if (error.message.includes('not found') || error.message.includes('Failed to update')) {
        throw error;
      }
      
      if (error.name === 'ZodError') {
        throw new Error('Invalid profile data. Please check your input and try again.');
      }
      
      throw new Error('Failed to update user profile. Please try again.');
    }
  }

  static async switchUserRole(userId: number, newRole: string, req?: Request) {
    try {
      const user = await userRepo.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Validate role change
      const validRoles = ['user', 'seller'];
      if (!validRoles.includes(newRole)) {
        throw new Error('Invalid role');
      }
      
      // Prevent role escalation - users can only switch between user and seller
      if (hasAdminAccess(user)) {
        throw new Error('Cannot change admin or owner roles');
      }
      
      const updatedUser = await userRepo.updateUser(userId, { role: newRole });
      if (!updatedUser) {
        throw new Error('Failed to update role');
      }
      
      // Log role change activity
      await logUserActivity(userId, 'role_switch', 'user_action', {
        oldRole: user.role,
        newRole: newRole
      }, undefined, req);
      
      // Remove password from response
      const { password, ...userResponse } = updatedUser;
      return userResponse;
    } catch (error: any) {
      logError(error, 'Switch user role error', {
        service: 'UserService',
        userId,
        newRole
      });
      
      if (error.message.includes('not found') || error.message.includes('Invalid role') || 
          error.message.includes('Cannot change') || error.message.includes('Failed to update')) {
        throw error;
      }
      
      throw new Error('Failed to switch user role. Please try again.');
    }
  }

  static async getAllUsers() {
    try {
      const users = await userRepo.getAllUsers();
      
      // Remove passwords from response
      return users.map(user => {
        const { password, ...userResponse } = user;
        return userResponse;
      });
    } catch (error: any) {
      logError(error, 'Get all users error', {
        service: 'UserService'
      });
      throw new Error('Failed to retrieve users. Please try again.');
    }
  }

  static async getUserWalletInfo(userId: number) {
    try {
      const user = await userRepo.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const balance = await transactionRepo.getWalletBalance(userId);
      const transactions = await transactionRepo.getWalletTransactionsByUser(userId);
      
      return {
        balance,
        transactions,
        lastUpdated: new Date().toISOString()
      };
    } catch (error: any) {
      logError(error, 'Get user wallet info error', {
        service: 'UserService',
        userId
      });
      
      if (error.message.includes('not found')) {
        throw error;
      }
      
      throw new Error('Failed to retrieve wallet information. Please try again.');
    }
  }

  static async requestAdminRole(userId: number, reason: string, req?: Request) {
    try {
      const user = await userRepo.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (hasAdminAccess(user)) {
        throw new Error('User already has admin privileges');
      }
      
      if (user.adminRequestPending) {
        throw new Error('Admin request already pending');
      }
      
      const updatedUser = await userRepo.updateUser(userId, {
        adminRequestPending: true,
        adminRequestReason: reason,
        adminRequestAt: new Date()
      });
      
      // Log admin request activity
      await logUserActivity(userId, 'admin_request', 'user_action', {
        reason: reason,
        requestTimestamp: new Date().toISOString()
      }, undefined, req);
      
      return {
        message: 'Admin role request submitted successfully',
        user: updatedUser
      };
    } catch (error: any) {
      logError(error, 'Request admin role error', {
        service: 'UserService',
        userId
      });
      
      if (error.message.includes('not found') || error.message.includes('already has admin') || 
          error.message.includes('already pending')) {
        throw error;
      }
      
      throw new Error('Failed to submit admin role request. Please try again.');
    }
  }

  static async getPendingAdminRequests() {
    try {
      const users = await userRepo.getAllUsers();
      
      return users
        .filter(user => user.adminRequestPending && !user.isAdminApproved)
        .map(user => {
          const { password, ...userResponse } = user;
          return userResponse;
        });
    } catch (error: any) {
      logError(error, 'Get pending admin requests error', {
        service: 'UserService'
      });
      throw new Error('Failed to retrieve pending admin requests. Please try again.');
    }
  }

  static async updateSecuritySettings(userId: number, securityData: SecuritySettingsRequest, req?: Request) {
    try {
      const user = await userRepo.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const updates: Partial<typeof user> = {};
      const updatedFields: string[] = [];

      // Only validate current password if changing password or other sensitive fields
      if (securityData.newPassword) {
        // Require current password when changing password
        if (!securityData.currentPassword) {
          throw new Error('Current password is required to change password');
        }
        const isPasswordValid = await comparePassword(securityData.currentPassword, user.password);
        if (!isPasswordValid) {
          throw new Error('Current password is incorrect');
        }
        updates.password = await hashPassword(securityData.newPassword);
        updatedFields.push('password');
      }

      if (securityData.email && securityData.email !== user.email) {
        const existingUser = await userRepo.getUserByEmail(securityData.email);
        if (existingUser && existingUser.id !== userId) {
          throw new Error('Email already in use by another account');
        }
        updates.email = securityData.email;
        updatedFields.push('email');
      }

      if (securityData.phoneNumber !== undefined && securityData.phoneNumber !== user.phoneNumber) {
        updates.phoneNumber = securityData.phoneNumber;
        updatedFields.push('phoneNumber');
      }

      if (updatedFields.length === 0) {
        throw new Error('No changes detected');
      }

      const updatedUser = await userRepo.updateUser(userId, updates);
      if (!updatedUser) {
        throw new Error('Failed to update security settings');
      }

      await logUserActivity(userId, 'security_update', 'user_action', {
        updatedFields,
        timestamp: new Date().toISOString()
      }, undefined, req);

      const { password, ...userResponse } = updatedUser;
      return userResponse;
    } catch (error: any) {
      logError(error, 'Update security settings error', {
        service: 'UserService',
        userId
      });

      if (error.message.includes('not found') || 
          error.message.includes('incorrect') || 
          error.message.includes('already in use') ||
          error.message.includes('No changes') ||
          error.message.includes('Failed to update')) {
        throw error;
      }

      throw new Error('Failed to update security settings. Please try again.');
    }
  }
}