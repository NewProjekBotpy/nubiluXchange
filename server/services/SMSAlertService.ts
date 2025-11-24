import twilio from 'twilio';
import { logInfo, logError } from "../utils/logger";
import { PaymentsRepository } from "../repositories/PaymentsRepository";
import { UserRepository } from "../repositories/UserRepository";
import { SecurityAlertService } from "./SecurityAlertService";

const paymentsRepo = new PaymentsRepository();
const userRepo = new UserRepository();
import type { SecurityAlert } from "./SecurityAlertService";
import { hasAdminAccess } from "@shared/auth-utils";

export class SMSAlertService {
  private static client: twilio.Twilio | null = null;
  private static isConfigured = false;
  private static configurationAttempted = false;

  /**
   * Initialize Twilio SMS service
   */
  static initialize(): void {
    if (this.configurationAttempted) {
      return;
    }
    this.configurationAttempted = true;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_FROM_PHONE;

    logInfo(`SMS Alert Service initialization - SID: ${accountSid ? 'present' : 'missing'}, TOKEN: ${authToken ? 'present' : 'missing'}, FROM: ${fromPhone ? 'present' : 'missing'}`);

    if (!accountSid || !authToken || !fromPhone) {
      logInfo('🔧 Twilio SMS not configured - SMS alerts disabled (development mode)');
      logInfo('💡 To enable SMS alerts: Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE environment variables');
      this.isConfigured = false;
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      this.isConfigured = true;
      logInfo('✅ SMS Alert service configured successfully');
    } catch (error: any) {
      logError(error, 'Failed to configure SMS service');
      this.isConfigured = false;
    }
  }

  /**
   * Send SMS alert for critical security issues
   */
  static async sendSecurityAlert(
    phoneNumber: string,
    alert: SecurityAlert,
    userDisplayName?: string
  ): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      logError(new Error('SMS service not configured'), 'SMS service not configured');
      
      await paymentsRepo.createSmsLog({
        phoneNumber,
        message: 'SMS service not configured',
        status: 'failed',
        priority: alert.severity === 'critical' ? 'critical' : alert.severity === 'high' ? 'high' : 'medium',
        alertType: alert.type,
        metadata: {},
        errorMessage: 'SMS service not configured'
      });
      
      return false;
    }

    try {
      const fromPhone = process.env.TWILIO_FROM_PHONE!;
      
      // Format phone number to international format if needed
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      let message = `🔒 NXE SECURITY ALERT\n\n`;
      message += `Type: ${alert.type.replace(/_/g, ' ').toUpperCase()}\n`;
      message += `Severity: ${alert.severity.toUpperCase()}\n`;
      message += `Description: ${alert.description}\n\n`;
      
      if (userDisplayName) {
        message += `User: ${userDisplayName}\n`;
      }
      
      message += `Time: ${alert.detectedAt.toLocaleString('id-ID')}\n\n`;
      message += `Please check the admin panel for more details.`;

      const result = await this.client.messages.create({
        body: message,
        from: fromPhone,
        to: formattedPhone
      });

      await paymentsRepo.createSmsLog({
        phoneNumber: formattedPhone,
        message,
        status: 'sent',
        priority: alert.severity === 'critical' ? 'critical' : alert.severity === 'high' ? 'high' : 'medium',
        alertType: alert.type,
        metadata: {},
        sentAt: new Date()
      });

      logInfo(`SMS security alert sent successfully: ${result.sid}`);
      return true;
    } catch (error: any) {
      logError(error, `Failed to send SMS security alert to ${phoneNumber}`);
      
      await paymentsRepo.createSmsLog({
        phoneNumber,
        message: `Failed to send security alert: ${alert.type}`,
        status: 'failed',
        priority: alert.severity === 'critical' ? 'critical' : alert.severity === 'high' ? 'high' : 'medium',
        alertType: alert.type,
        metadata: {},
        errorMessage: error.message
      });
      
      return false;
    }
  }

  /**
   * Send SMS for critical system alerts
   */
  static async sendSystemAlert(
    phoneNumber: string,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      logError(new Error('SMS service not configured'), 'SMS service not configured');
      
      await paymentsRepo.createSmsLog({
        phoneNumber,
        message: `${title}: ${message}`,
        status: 'failed',
        priority,
        alertType: 'test',
        metadata: {},
        errorMessage: 'SMS service not configured'
      });
      
      return false;
    }

    try {
      const fromPhone = process.env.TWILIO_FROM_PHONE!;
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      const priorityEmoji = {
        low: '🔵',
        medium: '🟡',
        high: '🟠',
        critical: '🔴'
      }[priority];
      
      let smsMessage = `${priorityEmoji} NXE SYSTEM ALERT\n\n`;
      smsMessage += `${title}\n\n`;
      smsMessage += `${message}\n\n`;
      smsMessage += `Priority: ${priority.toUpperCase()}\n`;
      smsMessage += `Time: ${new Date().toLocaleString('id-ID')}`;

      const result = await this.client.messages.create({
        body: smsMessage,
        from: fromPhone,
        to: formattedPhone
      });

      await paymentsRepo.createSmsLog({
        phoneNumber: formattedPhone,
        message: smsMessage,
        status: 'sent',
        priority,
        alertType: 'test',
        metadata: {},
        sentAt: new Date()
      });

      logInfo(`SMS system alert sent successfully: ${result.sid}`);
      return true;
    } catch (error: any) {
      logError(error, `Failed to send SMS system alert to ${phoneNumber}`);
      
      await paymentsRepo.createSmsLog({
        phoneNumber,
        message: `${title}: ${message}`,
        status: 'failed',
        priority,
        alertType: 'test',
        metadata: {},
        errorMessage: error.message
      });
      
      return false;
    }
  }

  /**
   * Send SMS for payment fraud alerts
   */
  static async sendPaymentFraudAlert(
    phoneNumber: string,
    amount: string,
    transactionId: string,
    userDisplayName?: string
  ): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      await paymentsRepo.createSmsLog({
        phoneNumber,
        message: `Payment fraud alert for transaction ${transactionId}`,
        status: 'failed',
        priority: 'critical',
        alertType: 'payment_fraud',
        metadata: {},
        errorMessage: 'SMS service not configured'
      });
      
      return false;
    }

    try {
      const fromPhone = process.env.TWILIO_FROM_PHONE!;
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      let message = `🚨 PAYMENT FRAUD ALERT\n\n`;
      message += `Suspicious transaction detected!\n\n`;
      message += `Amount: Rp ${amount}\n`;
      message += `Transaction ID: ${transactionId}\n`;
      
      if (userDisplayName) {
        message += `User: ${userDisplayName}\n`;
      }
      
      message += `Time: ${new Date().toLocaleString('id-ID')}\n\n`;
      message += `Action required: Check admin panel immediately.`;

      const result = await this.client.messages.create({
        body: message,
        from: fromPhone,
        to: formattedPhone
      });

      await paymentsRepo.createSmsLog({
        phoneNumber: formattedPhone,
        message,
        status: 'sent',
        priority: 'critical',
        alertType: 'payment_fraud',
        metadata: {},
        sentAt: new Date()
      });

      logInfo(`SMS payment fraud alert sent successfully: ${result.sid}`);
      return true;
    } catch (error: any) {
      logError(error, `Failed to send SMS payment fraud alert to ${phoneNumber}`);
      
      await paymentsRepo.createSmsLog({
        phoneNumber,
        message: `Payment fraud alert for transaction ${transactionId}`,
        status: 'failed',
        priority: 'critical',
        alertType: 'payment_fraud',
        metadata: {},
        errorMessage: error.message
      });
      
      return false;
    }
  }

  /**
   * Send SMS notification to admins about critical alerts
   */
  static async notifyAdminsViaPhone(alert: SecurityAlert): Promise<void> {
    if (!this.isConfigured) {
      return;
    }

    try {
      // Get all users and filter for admin and owner users with phone numbers
      const allUsers = await userRepo.getAllUsers();
      const admins = allUsers.filter(user => 
        hasAdminAccess(user)
      );
      
      for (const admin of admins) {
        if (admin.phoneNumber && this.isValidPhoneNumber(admin.phoneNumber)) {
          await this.sendSecurityAlert(
            admin.phoneNumber, 
            alert, 
            admin.displayName || admin.username
          );
          
          // Add small delay between SMS to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error: any) {
      logError(error, 'Failed to notify admins via SMS');
    }
  }

  /**
   * Test SMS configuration
   */
  static async testConfiguration(testPhoneNumber: string): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      const success = await this.sendSystemAlert(
        testPhoneNumber,
        'SMS Test',
        'This is a test message from NXE Marketplace SMS Alert system. If you received this, SMS alerts are working correctly.',
        'low'
      );

      return success;
    } catch (error: any) {
      logError(error, 'SMS configuration test failed');
      return false;
    }
  }

  /**
   * Format phone number to international format
   */
  private static formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    let formatted = phoneNumber.replace(/\D/g, '');
    
    // If starts with 0 (Indonesian format), replace with +62
    if (formatted.startsWith('0')) {
      formatted = '+62' + formatted.substring(1);
    }
    // If doesn't start with + and doesn't start with 62, assume Indonesian
    else if (!formatted.startsWith('+') && !formatted.startsWith('62')) {
      formatted = '+62' + formatted;
    }
    // If starts with 62 but not +62
    else if (formatted.startsWith('62') && !formatted.startsWith('+62')) {
      formatted = '+' + formatted;
    }
    // If already starts with +, keep as is
    else if (formatted.startsWith('+')) {
      // Already formatted correctly
    }
    
    return formatted;
  }

  /**
   * Validate phone number format
   */
  private static isValidPhoneNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber);
    // Basic validation for international format
    return /^\+[1-9]\d{1,14}$/.test(formatted);
  }

  /**
   * Get configuration status
   */
  static getStatus(): { configured: boolean; ready: boolean } {
    return {
      configured: this.isConfigured,
      ready: this.client !== null
    };
  }
}