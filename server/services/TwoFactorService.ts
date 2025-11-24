import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcryptjs';
import twilio from 'twilio';
import { logInfo, logError } from '../utils/logger';

interface SMSCodeData {
  code: string;
  phoneNumber: string;
  expiresAt: Date;
  attempts: number;
}

export class TwoFactorService {
  private static smsCodesMap = new Map<number, SMSCodeData>();
  private static twilioClient: twilio.Twilio | null = null;
  private static twilioConfigured = false;
  
  /**
   * Initialize Twilio client for SMS 2FA
   */
  private static initializeTwilio(): void {
    if (this.twilioConfigured) {
      return;
    }
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_FROM_PHONE;
    
    if (!accountSid || !authToken || !fromPhone) {
      logInfo('SMS 2FA not configured - Twilio credentials missing');
      this.twilioConfigured = false;
      return;
    }
    
    try {
      this.twilioClient = twilio(accountSid, authToken);
      this.twilioConfigured = true;
      logInfo('✅ SMS 2FA (Twilio) configured successfully');
    } catch (error: any) {
      logError(error, 'Failed to configure Twilio for SMS 2FA');
      this.twilioConfigured = false;
    }
  }
  
  /**
   * Check if SMS 2FA is available
   */
  static isSMSAvailable(): boolean {
    this.initializeTwilio();
    return this.twilioConfigured && this.twilioClient !== null;
  }
  /**
   * Generate a TOTP secret (base32 encoded)
   * @returns Base32 encoded TOTP secret
   */
  static generateTOTPSecret(): string {
    const secret = authenticator.generateSecret();
    return secret;
  }

  /**
   * Generate QR code data URL for TOTP setup
   * @param secret - The TOTP secret (base32 encoded)
   * @param userEmail - User's email address
   * @returns Promise resolving to QR code data URL
   */
  static async generateQRCode(secret: string, userEmail: string): Promise<string> {
    const otpAuthUrl = authenticator.keyuri(
      userEmail,
      'NXE',
      secret
    );
    
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
    return qrCodeDataUrl;
  }

  /**
   * Verify TOTP token
   * @param secret - The TOTP secret (base32 encoded)
   * @param token - The 6-digit TOTP token to verify
   * @returns Boolean indicating if token is valid
   */
  static verifyTOTP(secret: string, token: string): boolean {
    try {
      const isValid = authenticator.verify({
        token,
        secret
      });
      return isValid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate backup codes (plain text)
   * @returns Array of 10 random backup codes (8 characters each, alphanumeric uppercase)
   */
  static generateBackupCodes(): string[] {
    const codes: string[] = [];
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    for (let i = 0; i < 10; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex];
      }
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Hash backup codes using bcrypt
   * @param codes - Array of plain text backup codes
   * @returns Promise resolving to array of hashed backup codes
   */
  static async hashBackupCodes(codes: string[]): Promise<string[]> {
    const hashedCodes = await Promise.all(
      codes.map(code => bcrypt.hash(code, 10))
    );
    return hashedCodes;
  }

  /**
   * Verify a backup code against hashed codes
   * @param hashedCodes - Array of hashed backup codes
   * @param inputCode - The plain text backup code to verify
   * @returns Promise resolving to boolean indicating if code is valid
   */
  static async verifyBackupCode(hashedCodes: string[], inputCode: string): Promise<boolean> {
    for (const hashedCode of hashedCodes) {
      const isValid = await bcrypt.compare(inputCode, hashedCode);
      if (isValid) {
        return true;
      }
    }
    return false;
  }

  /**
   * Find and return the index of the valid backup code
   * This is useful for removing the used backup code from the list
   * @param hashedCodes - Array of hashed backup codes
   * @param inputCode - The plain text backup code to verify
   * @returns Promise resolving to index of valid code, or -1 if not found
   */
  static async findValidBackupCodeIndex(hashedCodes: string[], inputCode: string): Promise<number> {
    for (let i = 0; i < hashedCodes.length; i++) {
      const isValid = await bcrypt.compare(inputCode, hashedCodes[i]);
      if (isValid) {
        return i;
      }
    }
    return -1;
  }
  
  /**
   * Generate a 6-digit SMS code
   * @returns 6-digit numeric code as string
   */
  private static generateSMSCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  /**
   * Format phone number to international format
   * @param phoneNumber - Phone number to format
   * @returns Formatted phone number with country code
   */
  private static formatPhoneNumber(phoneNumber: string): string {
    let formatted = phoneNumber.replace(/\D/g, '');
    
    if (formatted.startsWith('0')) {
      formatted = '62' + formatted.substring(1);
    }
    
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    
    return formatted;
  }
  
  /**
   * Clean up expired SMS codes
   */
  private static cleanupExpiredCodes(): void {
    const now = new Date();
    for (const [userId, data] of Array.from(this.smsCodesMap.entries())) {
      if (data.expiresAt < now) {
        this.smsCodesMap.delete(userId);
      }
    }
  }
  
  /**
   * Send SMS code for 2FA
   * @param userId - User ID to send code to
   * @param phoneNumber - Phone number to send code to
   * @returns Promise resolving to success status and message
   */
  static async sendSMSCode(userId: number, phoneNumber: string): Promise<{ success: boolean; message: string }> {
    this.initializeTwilio();
    
    if (!this.twilioConfigured || !this.twilioClient) {
      return {
        success: false,
        message: 'SMS 2FA tidak tersedia. Silakan gunakan aplikasi authenticator atau kode backup.'
      };
    }
    
    try {
      // Clean up expired codes
      this.cleanupExpiredCodes();
      
      // Generate 6-digit code
      const code = this.generateSMSCode();
      
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Store code with 5-minute expiry
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      this.smsCodesMap.set(userId, {
        code,
        phoneNumber: formattedPhone,
        expiresAt,
        attempts: 0
      });
      
      // Send SMS via Twilio
      const fromPhone = process.env.TWILIO_FROM_PHONE!;
      const message = `Kode verifikasi 2FA NubiluXchange Anda: ${code}\n\nKode ini akan kedaluwarsa dalam 5 menit.\nJangan bagikan kode ini kepada siapa pun.`;
      
      await this.twilioClient.messages.create({
        body: message,
        from: fromPhone,
        to: formattedPhone
      });
      
      logInfo(`SMS 2FA code sent to user ${userId} at ${formattedPhone}`);
      
      return {
        success: true,
        message: `Kode verifikasi telah dikirim ke ${formattedPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}`
      };
    } catch (error: any) {
      logError(error, `Failed to send SMS 2FA code to user ${userId}`);
      return {
        success: false,
        message: 'Gagal mengirim kode SMS. Silakan coba lagi atau gunakan metode verifikasi lain.'
      };
    }
  }
  
  /**
   * Verify SMS code for 2FA
   * @param userId - User ID to verify code for
   * @param code - 6-digit code to verify
   * @returns Promise resolving to verification result
   */
  static async verifySMSCode(userId: number, code: string): Promise<{ success: boolean; message: string }> {
    // Clean up expired codes
    this.cleanupExpiredCodes();
    
    const smsData = this.smsCodesMap.get(userId);
    
    if (!smsData) {
      return {
        success: false,
        message: 'Kode SMS tidak ditemukan atau telah kedaluwarsa. Silakan minta kode baru.'
      };
    }
    
    // Check expiry
    if (smsData.expiresAt < new Date()) {
      this.smsCodesMap.delete(userId);
      return {
        success: false,
        message: 'Kode SMS telah kedaluwarsa. Silakan minta kode baru.'
      };
    }
    
    // Increment attempts
    smsData.attempts++;
    
    // Check max attempts (5 attempts)
    if (smsData.attempts > 5) {
      this.smsCodesMap.delete(userId);
      return {
        success: false,
        message: 'Terlalu banyak percobaan gagal. Silakan minta kode baru.'
      };
    }
    
    // Verify code
    if (smsData.code !== code.trim()) {
      return {
        success: false,
        message: `Kode SMS tidak valid. Sisa percobaan: ${6 - smsData.attempts}`
      };
    }
    
    // Success - remove code from map
    this.smsCodesMap.delete(userId);
    
    return {
      success: true,
      message: 'Verifikasi SMS berhasil'
    };
  }
  
  /**
   * Get SMS code expiry time for a user
   * @param userId - User ID
   * @returns Expiry time or null if no code exists
   */
  static getSMSCodeExpiry(userId: number): Date | null {
    const smsData = this.smsCodesMap.get(userId);
    return smsData ? smsData.expiresAt : null;
  }
}
