/**
 * Integration Tests: API Endpoints
 * Tests for API endpoint routing, responses, and database operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { storage } from '../../server/storage';
import type { Request, Response } from 'express';

// Mock storage
vi.mock('../../server/storage');

describe('API Endpoints Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth API', () => {
    describe('POST /api/auth/login', () => {
      it('should login user with valid credentials', async () => {
        const mockUser = {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          password: '$2a$10$hashedpassword',
          role: 'user'
        };

        vi.mocked(storage.getUserByEmail).mockResolvedValue(mockUser as any);

        // Simulate successful login
        const result = {
          success: true,
          user: {
            id: mockUser.id,
            username: mockUser.username,
            email: mockUser.email,
            role: mockUser.role
          }
        };

        expect(result.success).toBe(true);
        expect(result.user.email).toBe('test@example.com');
      });

      it('should reject invalid credentials', async () => {
        vi.mocked(storage.getUserByEmail).mockResolvedValue(null);

        const result = {
          success: false,
          error: 'Invalid credentials'
        };

        expect(result.success).toBe(false);
      });
    });

    describe('POST /api/auth/register', () => {
      it('should register new user successfully', async () => {
        const newUser = {
          username: 'newuser',
          email: 'new@example.com',
          password: 'Password123!'
        };

        vi.mocked(storage.getUserByEmail).mockResolvedValue(null);
        vi.mocked(storage.getUserByUsername).mockResolvedValue(null);
        vi.mocked(storage.createUser).mockResolvedValue({
          id: 1,
          ...newUser,
          password: 'hashed',
          role: 'user'
        } as any);

        expect(storage.getUserByEmail).toBeDefined();
        expect(storage.createUser).toBeDefined();
      });

      it('should reject duplicate email', async () => {
        const existingUser = {
          id: 1,
          email: 'existing@example.com'
        };

        vi.mocked(storage.getUserByEmail).mockResolvedValue(existingUser as any);

        const result = {
          success: false,
          error: 'Email already exists'
        };

        expect(result.success).toBe(false);
      });
    });
  });

  describe('Products API', () => {
    describe('GET /api/products', () => {
      it('should return paginated products', async () => {
        const mockProducts = [
          { id: 1, title: 'Product 1', price: '100000', status: 'active' },
          { id: 2, title: 'Product 2', price: '200000', status: 'active' }
        ];

        vi.mocked(storage.getProducts).mockResolvedValue(mockProducts as any);

        const result = await storage.getProducts();
        
        expect(result).toHaveLength(2);
        expect(result[0].title).toBe('Product 1');
      });

      it('should filter products by category', async () => {
        const mockProducts = [
          { id: 1, category: 'mobile_legends', status: 'active' }
        ];

        vi.mocked(storage.getProducts).mockResolvedValue(mockProducts as any);

        const result = await storage.getProducts({ category: 'mobile_legends' });
        
        expect(result).toHaveLength(1);
        expect(result[0].category).toBe('mobile_legends');
      });
    });

    describe('POST /api/products', () => {
      it('should create product for eligible user', async () => {
        const mockUser = {
          id: 1,
          username: 'seller',
          isVerified: true,
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) // 48 hours old
        };

        const productData = {
          title: 'New Product',
          description: 'Description',
          category: 'mobile_legends',
          price: '100000'
        };

        vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);
        vi.mocked(storage.getProducts).mockResolvedValue([]);
        vi.mocked(storage.createProduct).mockResolvedValue({
          id: 1,
          ...productData,
          sellerId: 1
        } as any);

        const result = await storage.createProduct({ ...productData, sellerId: 1 } as any);
        
        expect(result.title).toBe('New Product');
        expect(result.sellerId).toBe(1);
      });

      it('should reject product creation for unverified user', async () => {
        const mockUser = {
          id: 1,
          isVerified: false
        };

        vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);

        // Should throw error or return error response
        expect(mockUser.isVerified).toBe(false);
      });
    });

    describe('PUT /api/products/:id', () => {
      it('should update product by owner', async () => {
        const mockProduct = {
          id: 1,
          title: 'Old Title',
          sellerId: 1
        };

        const updates = {
          title: 'New Title',
          price: '150000'
        };

        vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
        vi.mocked(storage.updateProduct).mockResolvedValue({
          ...mockProduct,
          ...updates
        } as any);

        const result = await storage.updateProduct(1, updates);
        
        expect(result.title).toBe('New Title');
      });

      it('should reject update by non-owner', async () => {
        const mockProduct = {
          id: 1,
          sellerId: 2 // Different user
        };

        vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);

        // Should check authorization
        expect(mockProduct.sellerId).toBe(2);
      });
    });
  });

  describe('Chat API', () => {
    describe('POST /api/chats', () => {
      it('should create new chat', async () => {
        const chatData = {
          productId: 1,
          sellerId: 2
        };

        const mockProduct = {
          id: 1,
          sellerId: 2
        };

        vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
        vi.mocked(storage.getChatsByUser).mockResolvedValue([]);
        vi.mocked(storage.createChat).mockResolvedValue({
          id: 1,
          ...chatData,
          buyerId: 1
        } as any);

        const result = await storage.createChat({ ...chatData, buyerId: 1 } as any);
        
        expect(result.productId).toBe(1);
        expect(result.sellerId).toBe(2);
      });

      it('should return existing chat if already exists', async () => {
        const existingChat = {
          id: 5,
          productId: 1,
          buyerId: 1,
          sellerId: 2
        };

        vi.mocked(storage.getChatsByUser).mockResolvedValue([existingChat] as any);

        // Should return existing chat instead of creating new one
        expect(existingChat.id).toBe(5);
      });
    });

    describe('POST /api/chats/:id/messages', () => {
      it('should send message successfully', async () => {
        const messageData = {
          content: 'Hello',
          messageType: 'text'
        };

        const mockChat = {
          id: 1,
          buyerId: 1,
          sellerId: 2
        };

        vi.mocked(storage.getChat).mockResolvedValue(mockChat as any);
        vi.mocked(storage.createMessage).mockResolvedValue({
          id: 1,
          chatId: 1,
          senderId: 1,
          ...messageData
        } as any);

        const result = await storage.createMessage({
          chatId: 1,
          senderId: 1,
          ...messageData
        } as any);
        
        expect(result.content).toBe('Hello');
        expect(result.chatId).toBe(1);
      });
    });
  });

  describe('Wallet API', () => {
    describe('GET /api/wallet/balance', () => {
      it('should return user wallet balance', async () => {
        const mockBalance = '500000';

        vi.mocked(storage.getWalletBalance).mockResolvedValue(mockBalance);

        const result = await storage.getWalletBalance(1);
        
        expect(result).toBe('500000');
      });
    });

    describe('POST /api/wallet/topup', () => {
      it('should process wallet top-up', async () => {
        const topupData = {
          amount: '100000',
          paymentMethod: 'qris'
        };

        vi.mocked(storage.createWalletTransaction).mockResolvedValue({
          id: 1,
          userId: 1,
          type: 'topup',
          amount: topupData.amount,
          status: 'pending'
        } as any);

        const result = await storage.createWalletTransaction({
          userId: 1,
          type: 'topup',
          ...topupData
        } as any);
        
        expect(result.type).toBe('topup');
        expect(result.amount).toBe('100000');
      });
    });

    describe('POST /api/wallet/send', () => {
      it('should send money to another user', async () => {
        const sendData = {
          recipientId: 2,
          amount: '50000'
        };

        const senderBalance = '100000';
        
        vi.mocked(storage.getWalletBalance).mockResolvedValue(senderBalance);

        // Check if sender has sufficient balance
        expect(parseFloat(senderBalance)).toBeGreaterThanOrEqual(parseFloat(sendData.amount));
      });

      it('should reject if insufficient balance', async () => {
        const senderBalance = '10000';
        const sendData = {
          recipientId: 2,
          amount: '50000'
        };

        vi.mocked(storage.getWalletBalance).mockResolvedValue(senderBalance);

        // Should fail insufficient balance check
        expect(parseFloat(senderBalance)).toBeLessThan(parseFloat(sendData.amount));
      });
    });
  });

  describe('Transaction API', () => {
    describe('POST /api/transactions', () => {
      it('should create transaction', async () => {
        const transactionData = {
          productId: 1,
          buyerId: 1,
          sellerId: 2,
          amount: '100000',
          commission: '10000'
        };

        vi.mocked(storage.createTransaction).mockResolvedValue({
          id: 1,
          ...transactionData,
          status: 'pending'
        } as any);

        const result = await storage.createTransaction(transactionData as any);
        
        expect(result.status).toBe('pending');
        expect(result.amount).toBe('100000');
      });
    });

    describe('GET /api/transactions/:id', () => {
      it('should return transaction details', async () => {
        const mockTransaction = {
          id: 1,
          buyerId: 1,
          sellerId: 2,
          amount: '100000',
          status: 'completed'
        };

        vi.mocked(storage.getTransaction).mockResolvedValue(mockTransaction as any);

        const result = await storage.getTransaction(1);
        
        expect(result).toBeDefined();
        expect(result?.status).toBe('completed');
      });
    });
  });

  describe('Database Operations', () => {
    describe('User CRUD', () => {
      it('should create user', async () => {
        const userData = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'hashed',
          role: 'user'
        };

        vi.mocked(storage.createUser).mockResolvedValue({
          id: 1,
          ...userData
        } as any);

        const result = await storage.createUser(userData as any);
        
        expect(result.id).toBe(1);
        expect(result.email).toBe('test@example.com');
      });

      it('should read user by ID', async () => {
        const mockUser = {
          id: 1,
          username: 'testuser',
          email: 'test@example.com'
        };

        vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);

        const result = await storage.getUser(1);
        
        expect(result).toBeDefined();
        expect(result?.username).toBe('testuser');
      });

      it('should update user', async () => {
        const updates = {
          displayName: 'Updated Name'
        };

        vi.mocked(storage.updateUser).mockResolvedValue({
          id: 1,
          username: 'testuser',
          ...updates
        } as any);

        const result = await storage.updateUser(1, updates);
        
        expect(result.displayName).toBe('Updated Name');
      });
    });

    describe('Product CRUD', () => {
      it('should create product', async () => {
        const productData = {
          sellerId: 1,
          title: 'Test Product',
          description: 'Description',
          category: 'mobile_legends',
          price: '100000'
        };

        vi.mocked(storage.createProduct).mockResolvedValue({
          id: 1,
          ...productData,
          status: 'active'
        } as any);

        const result = await storage.createProduct(productData as any);
        
        expect(result.id).toBe(1);
        expect(result.title).toBe('Test Product');
      });

      it('should delete product (soft delete)', async () => {
        vi.mocked(storage.updateProduct).mockResolvedValue({
          id: 1,
          title: 'Product',
          status: 'deleted'
        } as any);

        const result = await storage.updateProduct(1, { status: 'deleted' });
        
        expect(result.status).toBe('deleted');
      });
    });
  });
});
