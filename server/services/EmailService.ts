import { logInfo, logError, logDebug } from '../utils/logger';

/**
 * Email Service
 * Handles email sending with template support
 * 
 * Note: This is a placeholder implementation. In production, you should integrate
 * with email providers like SendGrid, Mailgun, AWS SES, or SMTP services.
 */

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  type: string;
  data?: Record<string, any>;
}

export class EmailService {
  /**
   * Send email
   * In production, replace this with actual email provider integration
   */
  static async sendEmail(emailData: EmailData): Promise<void> {
    const { to, subject, body, type } = emailData;

    try {
      logInfo(`📧 Sending email: ${type} to ${to}`);
      
      // TODO: Integrate with email provider (SendGrid, Mailgun, AWS SES, etc.)
      // Example with SendGrid:
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // await sgMail.send({ to, subject, html: body });

      // For now, just log the email
      logDebug('========== EMAIL PREVIEW ==========');
      logDebug(`To: ${to}`, { service: 'EmailService', emailType: type });
      logDebug(`Subject: ${subject}`, { service: 'EmailService', emailType: type });
      logDebug(`Type: ${type}`, { service: 'EmailService', emailType: type });
      logDebug(`Body:\n${body}`, { service: 'EmailService', emailType: type });
      logDebug('===================================');

      logInfo(`✅ Email sent successfully: ${type} to ${to}`);
    } catch (error) {
      logError(error, `Failed to send email: ${type} to ${to}`);
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(to: string, username: string): Promise<void> {
    const subject = 'Welcome to Our Platform!';
    const body = this.getWelcomeEmailTemplate(username);

    await this.sendEmail({
      to,
      subject,
      body,
      type: 'welcome'
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const subject = 'Password Reset Request';
    const body = this.getPasswordResetTemplate(resetToken);

    await this.sendEmail({
      to,
      subject,
      body,
      type: 'password_reset'
    });
  }

  /**
   * Send transaction notification email
   */
  static async sendTransactionEmail(to: string, transactionData: any): Promise<void> {
    const subject = 'Transaction Completed';
    const body = this.getTransactionEmailTemplate(transactionData);

    await this.sendEmail({
      to,
      subject,
      body,
      type: 'transaction',
      data: transactionData
    });
  }

  /**
   * Send notification digest email
   */
  static async sendNotificationDigest(to: string, notifications: any[]): Promise<void> {
    const subject = 'Your Daily Notification Digest';
    const body = this.getNotificationDigestTemplate(notifications);

    await this.sendEmail({
      to,
      subject,
      body,
      type: 'notification_digest',
      data: { notifications }
    });
  }

  /**
   * Send order confirmation email
   */
  static async sendOrderConfirmation(to: string, orderData: any): Promise<void> {
    const subject = 'Order Confirmation';
    const body = this.getOrderConfirmationTemplate(orderData);

    await this.sendEmail({
      to,
      subject,
      body,
      type: 'order_confirmation',
      data: orderData
    });
  }

  // ===================================
  // EMAIL TEMPLATES
  // ===================================

  private static getWelcomeEmailTemplate(username: string): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4A5568;">Welcome to Our Platform!</h1>
            <p>Hi ${username},</p>
            <p>Thank you for joining our community. We're excited to have you on board!</p>
            <p>Get started by exploring our marketplace and connecting with other users.</p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p style="margin-top: 30px;">Best regards,<br>The Team</p>
          </div>
        </body>
      </html>
    `;
  }

  private static getPasswordResetTemplate(resetToken: string): string {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
    
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4A5568;">Password Reset Request</h1>
            <p>You requested to reset your password. Click the button below to proceed:</p>
            <div style="margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #4299E1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #718096; font-size: 14px;">
              If you didn't request this, you can safely ignore this email.
              This link will expire in 1 hour.
            </p>
            <p style="color: #718096; font-size: 14px;">
              Or copy this link: ${resetUrl}
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static getTransactionEmailTemplate(transactionData: any): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4A5568;">Transaction Completed</h1>
            <p>Your transaction has been processed successfully.</p>
            <div style="background-color: #F7FAFC; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p><strong>Transaction ID:</strong> ${transactionData.id}</p>
              <p><strong>Amount:</strong> ${transactionData.amount}</p>
              <p><strong>Status:</strong> ${transactionData.status}</p>
              <p><strong>Date:</strong> ${new Date(transactionData.createdAt).toLocaleDateString()}</p>
            </div>
            <p>Thank you for your transaction!</p>
          </div>
        </body>
      </html>
    `;
  }

  private static getNotificationDigestTemplate(notifications: any[]): string {
    const notificationItems = notifications.map(n => `
      <li style="margin-bottom: 10px; padding: 10px; background-color: #F7FAFC; border-radius: 4px;">
        <strong>${n.title}</strong><br>
        <span style="color: #718096; font-size: 14px;">${n.message}</span>
      </li>
    `).join('');

    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4A5568;">Your Daily Notification Digest</h1>
            <p>Here's a summary of your recent notifications:</p>
            <ul style="list-style: none; padding: 0;">
              ${notificationItems}
            </ul>
            <p style="margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/notifications" style="color: #4299E1;">
                View all notifications
              </a>
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static getOrderConfirmationTemplate(orderData: any): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4A5568;">Order Confirmation</h1>
            <p>Thank you for your order! Here are the details:</p>
            <div style="background-color: #F7FAFC; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p><strong>Order ID:</strong> ${orderData.id}</p>
              <p><strong>Product:</strong> ${orderData.productTitle}</p>
              <p><strong>Amount:</strong> ${orderData.amount}</p>
              <p><strong>Status:</strong> ${orderData.status}</p>
            </div>
            <p>We'll notify you once your order is processed.</p>
            <p style="margin-top: 30px;">Best regards,<br>The Team</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Batch send emails
   */
  static async sendBulkEmails(emails: EmailData[]): Promise<void> {
    logInfo(`Sending ${emails.length} bulk emails`);

    const results = await Promise.allSettled(
      emails.map(email => this.sendEmail(email))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logInfo(`Bulk email sending complete: ${successful} successful, ${failed} failed`);
  }
}
