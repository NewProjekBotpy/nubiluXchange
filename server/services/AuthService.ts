import { UserRepository } from "../repositories/UserRepository";
import { hashPassword, comparePassword, generateToken } from "../utils/auth";
import { logUserActivity } from "../utils/activity-logger";
import { userRegisterSchema } from "@shared/schema";
import { logError, logWarning, logInfo, logDebug } from "../utils/logger";
import type { Request, Response } from "express";
import { TwoFactorService } from "./TwoFactorService";
import { encryptIfAvailable, decryptIfEncrypted } from "../utils/crypto-encryption";
import * as bcrypt from "bcryptjs";

const userRepo = new UserRepository();

export class AuthService {
  static async register(userData: any, req?: Request, res?: Response) {
    // Use secure registration schema (no privilege escalation)
    const validatedData = userRegisterSchema.parse(userData);
    
    // Check if user already exists
    const existingUserByEmail = await userRepo.getUserByEmail(validatedData.email);
    if (existingUserByEmail) {
      const error: any = new Error('Email already registered');
      error.code = 'EMAIL_ALREADY_EXISTS';
      throw error;
    }
    
    const existingUserByUsername = await userRepo.getUserByUsername(validatedData.username);
    if (existingUserByUsername) {
      const error: any = new Error('Username already taken');
      error.code = 'USERNAME_ALREADY_EXISTS';
      throw error;
    }
    
    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);
    
    // Create user with secure defaults
    const newUser = await userRepo.createUser({
      ...validatedData,
      password: hashedPassword,
      // Security: Always set role to 'user' for public registration
      role: 'user',
      walletBalance: '0',
      isVerified: false,
      isAdminApproved: false,
      adminRequestPending: false
    });
    
    // Generate JWT token for session storage
    const token = generateToken({
      id: newUser.id,
      role: newUser.role
    });
    
    // Set httpOnly cookie instead of returning token
    if (res) {
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });
    }
    
    // Store user ID in session for additional security
    if (req && req.session) {
      (req.session as any).userId = newUser.id;
    }
    
    // Log registration activity
    await logUserActivity(newUser.id, 'register', 'user_action', {
      username: newUser.username,
      email: newUser.email
    }, undefined, req);
    
    // Remove password from response
    const { password, ...userResponse } = newUser;
    
    return {
      message: 'User registered successfully',
      user: userResponse
      // Note: No token in response body for security
    };
  }

  static async login(email: string, password: string, req?: Request, res?: Response) {
    // Get user by email
    const user = await userRepo.getUserByEmail(email);
    if (!user) {
      // Log failed login attempt (user not found)
      await logUserActivity(
        null,
        'auth_failed',
        'user_action',
        {
          email,
          reason: 'user_not_found',
          ipAddress: req?.ip,
          userAgent: req?.get('User-Agent')
        },
        undefined,
        req,
        'error'
      );
      
      const error: any = new Error('Invalid email or password');
      error.code = 'AUTH_INVALID_CREDENTIALS';
      throw error;
    }
    
    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      // Log failed login attempt (invalid password)
      await logUserActivity(
        user.id,
        'auth_failed',
        'user_action',
        {
          email,
          reason: 'invalid_password',
          ipAddress: req?.ip,
          userAgent: req?.get('User-Agent')
        },
        undefined,
        req,
        'error'
      );
      
      const error: any = new Error('Invalid email or password');
      error.code = 'AUTH_INVALID_CREDENTIALS';
      throw error;
    }
    
    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Log 2FA challenge initiated
      await logUserActivity(user.id, '2fa_challenge', 'user_action', {
        username: user.username,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent')
      }, undefined, req);
      
      // Return 2FA required response (DO NOT set cookie yet)
      return {
        requiresTwoFactor: true,
        userId: user.id,
        message: 'Two-factor authentication required'
      };
    }
    
    // Generate JWT token for cookie storage
    const token = generateToken({
      id: user.id,
      role: user.role
    });
    
    // Set httpOnly cookie instead of returning token
    if (res) {
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });
    }
    
    // Store user ID in session for additional security
    if (req && req.session) {
      (req.session as any).userId = user.id;
    }
    
    // Log login activity
    await logUserActivity(user.id, 'login', 'user_action', {
      username: user.username,
      loginTimestamp: new Date().toISOString()
    }, undefined, req);
    
    // Remove password from response
    const { password: _, ...userResponse } = user;
    
    return {
      message: 'Login successful',
      user: userResponse
      // Note: No token in response body for security
    };
  }

  static async logout(userId: number, req?: Request, res?: Response) {
    // Clear httpOnly cookie
    if (res) {
      res.clearCookie('auth_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      });
    }
    
    // Clear session data
    if (req && req.session) {
      (req.session as any).userId = null;
      req.session.destroy((err) => {
        if (err) {
          logError(err as Error, 'Session destruction error during logout', {
            userId,
            operation: 'logout'
          });
        }
      });
    }
    
    // Log logout activity
    await logUserActivity(userId, 'logout', 'user_action', {
      logoutTimestamp: new Date().toISOString()
    }, undefined, req);
    
    return { message: 'Logout successful' };
  }

  static async getCurrentUser(userId: number) {
    const user = await userRepo.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Remove password from response
    const { password, ...userResponse } = user;
    return userResponse;
  }

  // 2FA Setup - Generate temporary secret and QR code
  static async setupTwoFactor(userId: number, req?: Request) {
    const user = await userRepo.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate TOTP secret (temporary, stored server-side)
    const secret = TwoFactorService.generateTOTPSecret();
    
    // SECURITY FIX: Encrypt and store secret server-side with 15-minute expiry
    const encryptedSecret = encryptIfAvailable(secret);
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    await userRepo.updateUser(userId, {
      pendingTotpSecret: encryptedSecret,
      pendingTotpExpiry: expiryTime
    });
    
    // Generate QR code for authenticator app
    const qrCodeDataUrl = await TwoFactorService.generateQRCode(secret, user.email);

    // Log 2FA setup initiation
    await logUserActivity(userId, '2fa_setup_initiated', 'user_action', {
      username: user.username
    }, undefined, req);

    return {
      qrCodeUrl: qrCodeDataUrl,
      message: 'Scan QR code with your authenticator app and verify with a token'
      // SECURITY: Secret is NOT returned to client - stored server-side only
    };
  }

  // 2FA Verify - Verify token and save 2FA settings
  static async verifyTwoFactor(userId: number, token: string, req?: Request) {
    const user = await userRepo.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // SECURITY FIX: Retrieve secret from server-side storage (not from request)
    if (!user.pendingTotpSecret || !user.pendingTotpExpiry) {
      const error: any = new Error('No pending 2FA setup found. Please restart the setup process.');
      error.code = '2FA_SETUP_NOT_FOUND';
      throw error;
    }

    // Check if pending secret has expired
    if (user.pendingTotpExpiry < new Date()) {
      // Clear expired pending secret
      await userRepo.updateUser(userId, {
        pendingTotpSecret: null,
        pendingTotpExpiry: null
      });
      
      const error: any = new Error('2FA setup expired. Please restart the setup process.');
      error.code = '2FA_SETUP_EXPIRED';
      throw error;
    }

    // Decrypt the pending secret
    const decryptedSecret = decryptIfEncrypted(user.pendingTotpSecret);

    // Verify TOTP token
    const isValidToken = TwoFactorService.verifyTOTP(decryptedSecret, token);
    if (!isValidToken) {
      // Log failed 2FA verification
      await logUserActivity(userId, '2fa_verify_failed', 'user_action', {
        username: user.username,
        reason: 'invalid_token'
      }, undefined, req, 'error');
      
      const error: any = new Error('Invalid verification token');
      error.code = 'INVALID_2FA_TOKEN';
      throw error;
    }

    // Generate new backup codes for saving
    const backupCodes = TwoFactorService.generateBackupCodes();
    
    // SECURITY: Re-encrypt secret for permanent storage
    const storedSecret = encryptIfAvailable(decryptedSecret);
    
    // Hash backup codes before saving
    const hashedBackupCodes = await TwoFactorService.hashBackupCodes(backupCodes);

    // Save 2FA settings to database and clear pending setup
    await userRepo.updateUser(userId, {
      twoFactorEnabled: true,
      twoFactorSecret: storedSecret,
      backupCodes: hashedBackupCodes,
      twoFactorVerifiedAt: new Date(),
      pendingTotpSecret: null, // Clear pending secret
      pendingTotpExpiry: null   // Clear pending expiry
    });

    // Log successful 2FA setup
    await logUserActivity(userId, '2fa_enabled', 'user_action', {
      username: user.username
    }, undefined, req);

    return {
      success: true,
      backupCodes, // Return plain backup codes ONE TIME ONLY
      message: 'Two-factor authentication enabled successfully. Save your backup codes in a safe place.'
    };
  }

  // 2FA Disable - Verify password and disable 2FA
  static async disableTwoFactor(userId: number, password: string, req?: Request) {
    const user = await userRepo.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify password before disabling 2FA
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      // Log failed disable attempt
      await logUserActivity(userId, '2fa_disable_failed', 'user_action', {
        username: user.username,
        reason: 'invalid_password'
      }, undefined, req, 'error');
      
      const error: any = new Error('Invalid password');
      error.code = 'INVALID_PASSWORD';
      throw error;
    }

    // Clear 2FA fields (including any pending setup)
    await userRepo.updateUser(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: null,
      twoFactorVerifiedAt: null,
      pendingTotpSecret: null,
      pendingTotpExpiry: null
    });

    // Log 2FA disabled
    await logUserActivity(userId, '2fa_disabled', 'user_action', {
      username: user.username
    }, undefined, req);

    return {
      success: true,
      message: 'Two-factor authentication disabled successfully'
    };
  }

  // 2FA Regenerate Backup Codes
  static async regenerateBackupCodes(userId: number, req?: Request) {
    const user = await userRepo.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Ensure 2FA is enabled
    if (!user.twoFactorEnabled) {
      const error: any = new Error('Two-factor authentication is not enabled');
      error.code = '2FA_NOT_ENABLED';
      throw error;
    }

    // Generate new backup codes
    const backupCodes = TwoFactorService.generateBackupCodes();
    
    // Hash backup codes
    const hashedBackupCodes = await TwoFactorService.hashBackupCodes(backupCodes);

    // Update backup codes in database
    await userRepo.updateUser(userId, {
      backupCodes: hashedBackupCodes
    });

    // Log backup codes regeneration
    await logUserActivity(userId, '2fa_backup_codes_regenerated', 'user_action', {
      username: user.username
    }, undefined, req);

    return {
      backupCodes, // Return plain backup codes ONE TIME ONLY
      message: 'Backup codes regenerated successfully. Save them in a safe place.'
    };
  }

  // 2FA Login - Verify 2FA token and complete login
  static async loginWithTwoFactor(userId: number, token: string, useBackupCode: boolean = false, req?: Request, res?: Response) {
    const user = await userRepo.getUser(userId);
    if (!user) {
      // Log failed 2FA login attempt
      await logUserActivity(
        userId,
        '2fa_login_failed',
        'user_action',
        {
          reason: 'user_not_found',
          ipAddress: req?.ip,
          userAgent: req?.get('User-Agent')
        },
        undefined,
        req,
        'error'
      );
      
      const error: any = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    // Ensure 2FA is enabled
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      const error: any = new Error('Two-factor authentication is not enabled for this user');
      error.code = '2FA_NOT_ENABLED';
      throw error;
    }

    let isValid = false;

    if (useBackupCode) {
      // Verify backup code
      if (!user.backupCodes || user.backupCodes.length === 0) {
        const error: any = new Error('No backup codes available');
        error.code = 'NO_BACKUP_CODES';
        throw error;
      }

      // Find valid backup code
      const validCodeIndex = await TwoFactorService.findValidBackupCodeIndex(user.backupCodes, token);
      
      if (validCodeIndex === -1) {
        // Log failed backup code attempt
        await logUserActivity(userId, '2fa_login_failed', 'user_action', {
          username: user.username,
          reason: 'invalid_backup_code',
          ipAddress: req?.ip,
          userAgent: req?.get('User-Agent')
        }, undefined, req, 'error');
        
        const error: any = new Error('Invalid backup code');
        error.code = 'INVALID_BACKUP_CODE';
        throw error;
      }

      // Remove used backup code
      const updatedBackupCodes = [...user.backupCodes];
      updatedBackupCodes.splice(validCodeIndex, 1);
      
      await userRepo.updateUser(userId, {
        backupCodes: updatedBackupCodes
      });

      isValid = true;

      // Log backup code used
      await logUserActivity(userId, '2fa_backup_code_used', 'user_action', {
        username: user.username,
        remainingCodes: updatedBackupCodes.length
      }, undefined, req);
    } else {
      // SECURITY FIX: Decrypt TOTP secret before verification
      // Handles both encrypted (new) and plaintext (legacy) formats
      const decryptedSecret = decryptIfEncrypted(user.twoFactorSecret);
      isValid = TwoFactorService.verifyTOTP(decryptedSecret, token);
      
      if (!isValid) {
        // Log failed TOTP verification
        await logUserActivity(userId, '2fa_login_failed', 'user_action', {
          username: user.username,
          reason: 'invalid_totp_token',
          ipAddress: req?.ip,
          userAgent: req?.get('User-Agent')
        }, undefined, req, 'error');
        
        const error: any = new Error('Invalid authentication token');
        error.code = 'INVALID_2FA_TOKEN';
        throw error;
      }
    }

    // Generate JWT token
    const jwtToken = generateToken({
      id: user.id,
      role: user.role
    });

    // Set httpOnly cookie
    if (res) {
      res.cookie('auth_token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });
    }

    // Store user ID in session
    if (req && req.session) {
      (req.session as any).userId = user.id;
    }

    // Log successful 2FA login
    await logUserActivity(userId, '2fa_login_success', 'user_action', {
      username: user.username,
      method: useBackupCode ? 'backup_code' : 'totp',
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent')
    }, undefined, req);

    // Remove password from response
    const { password, ...userResponse } = user;

    return {
      message: 'Login successful',
      user: userResponse
    };
  }
  
  // SMS 2FA Methods
  
  /**
   * Send SMS code for 2FA verification
   */
  static async sendSMSCode(userId: number, phoneNumber: string, req?: Request) {
    const user = await userRepo.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if SMS 2FA is available
    if (!TwoFactorService.isSMSAvailable()) {
      const error: any = new Error('SMS 2FA tidak tersedia saat ini. Silakan gunakan aplikasi authenticator atau kode backup.');
      error.code = 'SMS_2FA_UNAVAILABLE';
      throw error;
    }
    
    // Send SMS code
    const result = await TwoFactorService.sendSMSCode(userId, phoneNumber);
    
    if (!result.success) {
      const error: any = new Error(result.message);
      error.code = 'SMS_SEND_FAILED';
      throw error;
    }
    
    // Log SMS code sent
    await logUserActivity(userId, 'sms_2fa_code_sent', 'user_action', {
      username: user.username,
      phoneNumber: phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    }, undefined, req);
    
    return {
      success: true,
      message: result.message,
      expiresAt: TwoFactorService.getSMSCodeExpiry(userId)
    };
  }
  
  /**
   * Verify SMS code for 2FA login
   */
  static async verifySMSCode(userId: number, code: string, req?: Request, res?: Response) {
    const user = await userRepo.getUser(userId);
    if (!user) {
      const error: any = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }
    
    // Verify SMS code
    const result = await TwoFactorService.verifySMSCode(userId, code);
    
    if (!result.success) {
      // Log failed SMS verification
      await logUserActivity(userId, 'sms_2fa_verify_failed', 'user_action', {
        username: user.username,
        reason: 'invalid_code'
      }, undefined, req, 'error');
      
      const error: any = new Error(result.message);
      error.code = 'SMS_VERIFICATION_FAILED';
      throw error;
    }
    
    // Generate JWT token
    const jwtToken = generateToken({
      id: user.id,
      role: user.role
    });
    
    // Set httpOnly cookie
    if (res) {
      res.cookie('auth_token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });
    }
    
    // Store user ID in session
    if (req && req.session) {
      (req.session as any).userId = user.id;
    }
    
    // Log successful SMS 2FA login
    await logUserActivity(userId, 'sms_2fa_login_success', 'user_action', {
      username: user.username,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent')
    }, undefined, req);
    
    // Remove password from response
    const { password, ...userResponse } = user;
    
    return {
      success: true,
      message: 'Login berhasil dengan SMS 2FA',
      user: userResponse
    };
  }
}