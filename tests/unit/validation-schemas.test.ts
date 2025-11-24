/**
 * Unit Tests: Validation Schemas
 * Tests for Zod validation schemas in shared/schema.ts
 */

import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  userRegisterSchema,
  insertProductSchema,
  insertChatSchema,
  messageCreateSchema,
  midtransChargeSchema,
  midtransWebhookSchema,
  twoFactorSetupSchema,
  twoFactorVerifySchema,
  sendMoneySchema,
  requestMoneySchema,
  passwordChangeSchema
} from '../../shared/schema';

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Test123!@#'
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'Test123!@#'
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require password', () => {
      const invalidData = {
        email: 'test@example.com'
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('userRegisterSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#',
        displayName: 'Test User'
      };

      const result = userRegisterSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept any length username', () => {
      const validData = {
        username: 'ab', // Short username is allowed
        email: 'test@example.com',
        password: 'Test123!@#'
      };

      const result = userRegisterSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept any length password', () => {
      const validData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123' // Short password is allowed at schema level
      };

      const result = userRegisterSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow optional display name', () => {
      const validData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#'
      };

      const result = userRegisterSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('insertProductSchema', () => {
    it('should validate correct product data', () => {
      const validData = {
        sellerId: 1,
        title: 'Mobile Legends Account',
        description: 'High tier account with skins',
        category: 'mobile_legends',
        price: '500000',
        gameData: {
          rank: 'Mythic',
          heroes: 50
        }
      };

      const result = insertProductSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require seller ID', () => {
      const invalidData = {
        title: 'Mobile Legends Account',
        description: 'Test description',
        category: 'mobile_legends',
        price: '100000'
      };

      const result = insertProductSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require title', () => {
      const invalidData = {
        sellerId: 1,
        description: 'Test description',
        category: 'mobile_legends',
        price: '100000'
      };

      const result = insertProductSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate price format', () => {
      const validData = {
        sellerId: 1,
        title: 'Test Product',
        description: 'Test',
        category: 'mobile_legends',
        price: '100000'
      };

      const result = insertProductSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('insertChatSchema', () => {
    it('should validate chat creation with both buyer and seller ID', () => {
      const validData = {
        productId: 1,
        buyerId: 3,
        sellerId: 2
      };

      const result = insertChatSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require both buyer ID and seller ID', () => {
      const invalidData = {
        productId: 1,
        sellerId: 2
      };

      const result = insertChatSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow optional product ID', () => {
      const validData = {
        buyerId: 3,
        sellerId: 2
      };

      const result = insertChatSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('messageCreateSchema', () => {
    it('should validate text message', () => {
      const validData = {
        chatId: 1,
        senderId: 1,
        content: 'Hello, is this product available?',
        messageType: 'text'
      };

      const result = messageCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate image message', () => {
      const validData = {
        chatId: 1,
        senderId: 1,
        content: 'https://example.com/image.jpg',
        messageType: 'image'
      };

      const result = messageCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require content', () => {
      const invalidData = {
        chatId: 1,
        senderId: 1,
        messageType: 'text'
      };

      const result = messageCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should default to text type if not specified', () => {
      const validData = {
        chatId: 1,
        senderId: 1,
        content: 'Test message'
      };

      const result = messageCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.messageType).toBe('text');
      }
    });
  });

  describe('midtransChargeSchema', () => {
    it('should validate Midtrans charge request', () => {
      const validData = {
        amount: 100000,
        productId: 1,
        payment_type: 'qris'
      };

      const result = midtransChargeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should enforce minimum amount', () => {
      const invalidData = {
        amount: 100, // Too small
        productId: 1,
        payment_type: 'qris'
      };

      const result = midtransChargeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate payment types', () => {
      const validMethods = ['qris', 'gopay', 'shopeepay'];
      
      for (const method of validMethods) {
        const data = {
          amount: 100000,
          productId: 1,
          payment_type: method
        };

        const result = midtransChargeSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('midtransWebhookSchema', () => {
    it('should validate webhook data', () => {
      const validData = {
        order_id: 'ORDER-123',
        status_code: '200',
        gross_amount: '100000.00',
        signature_key: 'abc123',
        transaction_status: 'settlement',
        transaction_id: 'TXN-123',
        payment_type: 'qris'
      };

      const result = midtransWebhookSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require all webhook fields', () => {
      const invalidData = {
        order_id: 'ORDER-123',
        status_code: '200'
        // Missing required fields
      };

      const result = midtransWebhookSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('twoFactorSetupSchema', () => {
    it('should validate 2FA setup request with empty body', () => {
      const validData = {};

      const result = twoFactorSetupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should not require any fields', () => {
      const validData = {};

      const result = twoFactorSetupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('twoFactorVerifySchema', () => {
    it('should validate 2FA verification', () => {
      const validData = {
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456'
      };

      const result = twoFactorVerifySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should enforce 6-digit token format', () => {
      const invalidData = {
        secret: 'JBSWY3DPEHPK3PXP',
        token: '12345' // Too short
      };

      const result = twoFactorVerifySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require secret', () => {
      const invalidData = {
        token: '123456'
      };

      const result = twoFactorVerifySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('sendMoneySchema', () => {
    it('should validate money send request', () => {
      const validData = {
        receiverUsername: 'testuser',
        amount: 50000,
        message: 'Payment for services'
      };

      const result = sendMoneySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should enforce minimum amount', () => {
      const invalidData = {
        receiverUsername: 'testuser',
        amount: 500 // Below minimum
      };

      const result = sendMoneySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow optional message', () => {
      const validData = {
        receiverUsername: 'testuser',
        amount: 50000
      };

      const result = sendMoneySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('requestMoneySchema', () => {
    it('should validate money request', () => {
      const validData = {
        receiverUsername: 'testuser',
        amount: 100000,
        message: 'Payment for product'
      };

      const result = requestMoneySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow optional message', () => {
      const validData = {
        receiverUsername: 'testuser',
        amount: 100000
      };

      const result = requestMoneySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should enforce minimum amount', () => {
      const invalidData = {
        receiverUsername: 'testuser',
        amount: 500 // Below minimum
      };

      const result = requestMoneySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('passwordChangeSchema', () => {
    it('should validate password change', () => {
      const validData = {
        currentPassword: 'OldPass123',
        newPassword: 'NewPass456'
      };

      const result = passwordChangeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should enforce new password strength', () => {
      const invalidData = {
        currentPassword: 'OldPass123',
        newPassword: '123' // Too weak - no uppercase or lowercase
      };

      const result = passwordChangeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require password complexity', () => {
      const invalidData = {
        currentPassword: 'OldPass123',
        newPassword: 'weakpassword' // No uppercase or digit
      };

      const result = passwordChangeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require both passwords', () => {
      const invalidData = {
        currentPassword: 'OldPass123'
      };

      const result = passwordChangeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
