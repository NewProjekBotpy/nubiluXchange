/**
 * Unit Tests: ProductService
 * Tests for product service methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from '../../server/services/ProductService';
import { storage } from '../../server/storage';
import { logPostingActivity } from '../../server/utils/activity-logger';

// Mock dependencies
vi.mock('../../server/storage');
vi.mock('../../server/utils/activity-logger');

describe('ProductService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkUserEligibility', () => {
    it('should allow eligible user to create products', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        role: 'user',
        isVerified: true,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) // 48 hours old
      };

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(storage.getProducts).mockResolvedValue([]);

      const result = await ProductService.checkUserEligibility(1);

      expect(result.eligible).toBe(true);
    });

    it('should reject new account (less than 24 hours)', async () => {
      const mockUser = {
        id: 1,
        username: 'newuser',
        role: 'user',
        isVerified: true,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours old
      };

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);

      const result = await ProductService.checkUserEligibility(1);

      expect(result.eligible).toBe(false);
      expect(result.reason?.toLowerCase()).toContain('tunggu');
    });

    it('should reject unverified user', async () => {
      const mockUser = {
        id: 1,
        username: 'unverified',
        role: 'user',
        isVerified: false,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000)
      };

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);

      const result = await ProductService.checkUserEligibility(1);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('verifikasi');
    });

    it('should limit new users to max products', async () => {
      const mockUser = {
        id: 1,
        username: 'newuser',
        role: 'user',
        isVerified: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days old
      };

      const mockProducts = [
        { id: 1, sellerId: 1 },
        { id: 2, sellerId: 1 },
        { id: 3, sellerId: 1 }
      ];

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(storage.getProducts).mockResolvedValue(mockProducts as any);

      const result = await ProductService.checkUserEligibility(1);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('dibatasi');
    });

    it('should reject non-existent user', async () => {
      vi.mocked(storage.getUser).mockResolvedValue(null);

      const result = await ProductService.checkUserEligibility(999);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('User not found');
    });
  });

  describe('createProduct', () => {
    it('should create product for eligible user', async () => {
      const productData = {
        title: 'Test Product',
        description: 'Test Description',
        price: '100000',
        category: 'mobile_legends',
        sellerId: 1,
        gameData: {}
      };

      const mockUser = {
        id: 1,
        username: 'testuser',
        role: 'user',
        isVerified: true,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000)
      };

      const mockProduct = {
        id: 1,
        ...productData,
        sellerId: 1
      };

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(storage.getProducts).mockResolvedValue([]);
      vi.mocked(storage.createProduct).mockResolvedValue(mockProduct as any);

      const result = await ProductService.createProduct(productData, 1);

      expect(result.title).toBe('Test Product');
      expect(storage.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          ...productData,
          sellerId: 1
        })
      );
      expect(logPostingActivity).toHaveBeenCalledWith(1, 'product', 1, undefined);
    });

    it('should throw error for ineligible user', async () => {
      const productData = {
        title: 'Test Product',
        description: 'Test Description',
        price: '100000',
        category: 'mobile_legends',
        gameData: {}
      };

      const mockUser = {
        id: 1,
        isVerified: false,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000)
      };

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);

      await expect(ProductService.createProduct(productData, 1))
        .rejects.toThrow();
    });
  });

  describe('updateProduct', () => {
    it('should update product by owner', async () => {
      const productId = 1;
      const updates = {
        title: 'Updated Title',
        price: '150000'
      };

      const mockProduct = {
        id: productId,
        title: 'Original Title',
        sellerId: 1
      };

      const updatedProduct = {
        ...mockProduct,
        ...updates
      };

      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(storage.updateProduct).mockResolvedValue(updatedProduct as any);

      const result = await ProductService.updateProduct(productId, updates, 1);

      expect(result.title).toBe('Updated Title');
      expect(storage.updateProduct).toHaveBeenCalledWith(productId, updates);
      expect(logPostingActivity).toHaveBeenCalledWith(1, 'product_update', productId, undefined);
    });

    it('should throw error for non-existent product', async () => {
      vi.mocked(storage.getProduct).mockResolvedValue(null);

      await expect(ProductService.updateProduct(999, {}, 1))
        .rejects.toThrow('Product not found');
    });

    it('should throw error for unauthorized user', async () => {
      const mockProduct = {
        id: 1,
        sellerId: 2
      };

      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);

      await expect(ProductService.updateProduct(1, {}, 1))
        .rejects.toThrow('Not authorized');
    });
  });

  describe('deleteProduct', () => {
    it('should mark product as deleted by owner', async () => {
      const productId = 1;

      const mockProduct = {
        id: productId,
        title: 'Test Product',
        sellerId: 1,
        status: 'available'
      };

      const deletedProduct = {
        ...mockProduct,
        status: 'deleted'
      };

      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(storage.updateProduct).mockResolvedValue(deletedProduct as any);

      const result = await ProductService.deleteProduct(productId, 1);

      expect(storage.updateProduct).toHaveBeenCalledWith(productId, { status: 'deleted' });
      expect(logPostingActivity).toHaveBeenCalledWith(1, 'product_delete', productId, undefined);
    });

    it('should throw error for non-existent product', async () => {
      vi.mocked(storage.getProduct).mockResolvedValue(null);

      await expect(ProductService.deleteProduct(999, 1))
        .rejects.toThrow('Product not found');
    });

    it('should throw error for unauthorized user', async () => {
      const mockProduct = {
        id: 1,
        sellerId: 2
      };

      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);

      await expect(ProductService.deleteProduct(1, 1))
        .rejects.toThrow('Not authorized');
    });
  });

  describe('getProduct', () => {
    it('should return product by ID', async () => {
      const mockProduct = {
        id: 1,
        title: 'Test Product',
        sellerId: 1
      };

      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);

      const result = await ProductService.getProduct(1);

      expect(result).toEqual(mockProduct);
      expect(storage.getProduct).toHaveBeenCalledWith(1);
    });

    it('should throw error for non-existent product', async () => {
      vi.mocked(storage.getProduct).mockResolvedValue(null);

      await expect(ProductService.getProduct(999))
        .rejects.toThrow('Product not found');
    });
  });

  describe('getProducts', () => {
    it('should return filtered products', async () => {
      const mockProducts = [
        { id: 1, title: 'Product 1', category: 'mobile_legends' },
        { id: 2, title: 'Product 2', category: 'mobile_legends' }
      ];

      vi.mocked(storage.getProducts).mockResolvedValue(mockProducts as any);

      const result = await ProductService.getProducts({ category: 'mobile_legends' });

      expect(result.length).toBe(2);
      expect(storage.getProducts).toHaveBeenCalledWith({ category: 'mobile_legends' });
    });

    it('should return all products when no filter', async () => {
      const mockProducts = [
        { id: 1, title: 'Product 1' },
        { id: 2, title: 'Product 2' },
        { id: 3, title: 'Product 3' }
      ];

      vi.mocked(storage.getProducts).mockResolvedValue(mockProducts as any);

      const result = await ProductService.getProducts({});

      expect(result.length).toBe(3);
    });
  });
});
