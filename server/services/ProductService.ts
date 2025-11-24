import { ProductRepository } from "../repositories/ProductRepository";
import { UserRepository } from "../repositories/UserRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";
import { logPostingActivity } from "../utils/activity-logger";
import { logError, logWarning, logInfo, logDebug } from '../utils/logger';
import { insertProductSchema } from "@shared/schema";
import type { Request } from "express";

const productRepo = new ProductRepository();
const userRepo = new UserRepository();
const transactionRepo = new TransactionRepository();

export class ProductService {
  /**
   * Check if user is eligible to create products
   */
  static async checkUserEligibility(userId: number): Promise<{ eligible: boolean; reason?: string }> {
    try {
      const user = await userRepo.getUser(userId);
      if (!user) {
        return { eligible: false, reason: 'User not found' };
      }

      // Check if user account is at least 24 hours old
      if (!user.createdAt) {
        return { eligible: false, reason: 'Data tanggal pembuatan akun tidak valid' };
      }
      
      const accountAge = Date.now() - user.createdAt.getTime();
      const minAccountAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (accountAge < minAccountAge) {
        const hoursRemaining = Math.ceil((minAccountAge - accountAge) / (60 * 60 * 1000));
        return { 
          eligible: false, 
          reason: `Akun Anda terlalu baru. Tunggu ${hoursRemaining} jam lagi sebelum dapat membuat produk.` 
        };
      }

      // Check if user is verified (optional requirement)
      if (!user.isVerified) {
        return { 
          eligible: false, 
          reason: 'Akun Anda belum terverifikasi. Silakan verifikasi email terlebih dahulu.' 
        };
      }

      // Check if user has required role (user, seller, admin, or owner can create products)
      const validRoles = ['user', 'seller', 'admin', 'owner'];
      if (!validRoles.includes(user.role)) {
        return { 
          eligible: false, 
          reason: 'Role akun tidak valid untuk membuat produk.' 
        };
      }

      // Check if user has too many products already (limit for new users)
      const userProducts = await productRepo.getProducts({ sellerId: userId });
      const maxProductsForNewUsers = 3;
      
      if (userProducts.length >= maxProductsForNewUsers && accountAge < 7 * 24 * 60 * 60 * 1000) { // 7 days
        return { 
          eligible: false, 
          reason: `User baru dibatasi maksimal ${maxProductsForNewUsers} produk dalam 7 hari pertama.` 
        };
      }

      return { eligible: true };
    } catch (error: any) {
      logError(error, 'Check user eligibility error', userId);
      throw new Error('Failed to check user eligibility. Please try again.');
    }
  }

  static async createProduct(productData: any, userId: number, req?: Request) {
    try {
      // Check user eligibility for creating products
      const eligibility = await this.checkUserEligibility(userId);
      if (!eligibility.eligible) {
        throw new Error(eligibility.reason || 'User tidak memenuhi syarat untuk membuat produk');
      }

      const validatedData = insertProductSchema.parse(productData);
      
      const newProduct = await productRepo.createProduct({
        ...validatedData,
        sellerId: userId
      });
      
      // Log product creation activity
      await logPostingActivity(userId, 'product', newProduct.id, req);
      
      return newProduct;
    } catch (error: any) {
      logError(error, 'Create product error', userId);
      
      if (error.message.includes('eligibility') || error.message.includes('syarat')) {
        throw error;
      }
      
      if (error.name === 'ZodError') {
        throw new Error('Invalid product data. Please check your input and try again.');
      }
      
      throw new Error('Failed to create product. Please try again or contact support.');
    }
  }

  static async updateProduct(productId: number, productData: any, userId: number, req?: Request) {
    try {
      const product = await productRepo.getProduct(productId);
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Verify ownership
      if (product.sellerId !== userId) {
        throw new Error('Not authorized to update this product');
      }
      
      const updates = insertProductSchema.partial().parse(productData);
      const updatedProduct = await productRepo.updateProduct(productId, updates);
      
      if (!updatedProduct) {
        throw new Error('Failed to update product');
      }
      
      // Log product update activity
      await logPostingActivity(userId, 'product_update', productId, req);
      
      return updatedProduct;
    } catch (error: any) {
      logError(error, `Update product error - productId: ${productId}`, userId);
      
      if (error.message.includes('not found') || error.message.includes('Not authorized')) {
        throw error;
      }
      
      if (error.name === 'ZodError') {
        throw new Error('Invalid product data. Please check your input and try again.');
      }
      
      throw new Error('Failed to update product. Please try again or contact support.');
    }
  }

  static async deleteProduct(productId: number, userId: number, req?: Request) {
    try {
      const product = await productRepo.getProduct(productId);
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Verify ownership
      if (product.sellerId !== userId) {
        throw new Error('Not authorized to delete this product');
      }
      
      // Update product status to deleted instead of actually deleting
      const updatedProduct = await productRepo.updateProduct(productId, { status: 'deleted' });
      
      // Log product deletion activity
      await logPostingActivity(userId, 'product_delete', productId, req);
      
      return updatedProduct;
    } catch (error: any) {
      logError(error, `Delete product error - productId: ${productId}`, userId);
      
      if (error.message.includes('not found') || error.message.includes('Not authorized')) {
        throw error;
      }
      
      throw new Error('Failed to delete product. Please try again or contact support.');
    }
  }

  static async getProduct(productId: number) {
    try {
      const product = await productRepo.getProduct(productId);
      if (!product) {
        throw new Error('Product not found');
      }
      
      return product;
    } catch (error: any) {
      logError(error, `Get product error - productId: ${productId}`);
      
      if (error.message.includes('not found')) {
        throw error;
      }
      
      throw new Error('Failed to retrieve product. Please try again.');
    }
  }

  static async getProducts(filters?: { category?: string; sellerId?: number; limit?: number; offset?: number }) {
    try {
      return await productRepo.getProducts(filters);
    } catch (error: any) {
      logError(error, 'Get products error');
      throw new Error('Failed to retrieve products. Please try again.');
    }
  }

  static async getSellerProducts(sellerId: number, limit?: number, offset?: number) {
    try {
      return await productRepo.getProducts({ sellerId, limit, offset });
    } catch (error: any) {
      logError(error, `Get seller products error - sellerId: ${sellerId}`, sellerId);
      throw new Error('Failed to retrieve seller products. Please try again.');
    }
  }

  static async getProductsByCategory(category: string, limit?: number, offset?: number) {
    try {
      return await productRepo.getProducts({ category, limit, offset });
    } catch (error: any) {
      logError(error, `Get products by category error - category: ${category}`);
      throw new Error('Failed to retrieve products by category. Please try again.');
    }
  }

  static async searchProducts(query: string, filters?: { 
    category?: string; 
    minPrice?: number; 
    maxPrice?: number; 
    sortBy?: string; 
    isPremium?: string;
    limit?: number; 
    offset?: number;
  }) {
    try {
      // Build filters for database-level search (much more efficient)
      const dbFilters: any = {
        searchQuery: query && query.trim() ? query.trim() : undefined,
        limit: filters?.limit,
        offset: filters?.offset,
        sortBy: filters?.sortBy
      };

      // Category filter
      if (filters?.category && filters.category !== 'all' && filters.category.trim() !== '') {
        dbFilters.category = filters.category;
      }

      // Price filters
      if (filters?.minPrice !== undefined && filters.minPrice !== null && filters.minPrice > 0) {
        dbFilters.minPrice = filters.minPrice;
      }
      if (filters?.maxPrice !== undefined && filters.maxPrice !== null && filters.maxPrice > 0) {
        dbFilters.maxPrice = filters.maxPrice;
      }

      // Premium filter
      if (filters?.isPremium && filters.isPremium !== 'all') {
        dbFilters.isPremium = filters.isPremium === 'premium';
      }

      // Delegate all filtering, sorting, and searching to the database
      return await productRepo.getProducts(dbFilters);
    } catch (error: any) {
      logError(error, `Search products error - query: ${query}`);
      throw new Error('Failed to search products. Please try again.');
    }
  }

  static async getSellerStats(sellerId: number) {
    try {
      const products = await productRepo.getProducts({ sellerId });
      const transactions = await transactionRepo.getTransactionsByUser(sellerId);
      
      const activeProducts = products.filter(p => p.status === 'active').length;
      const soldProducts = products.filter(p => p.status === 'sold').length;
      const totalRevenue = transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      return {
        activeProducts,
        soldProducts,
        totalProducts: products.length,
        totalRevenue: totalRevenue.toString(),
        transactions: transactions.length
      };
    } catch (error: any) {
      logError(error, `Get seller stats error - sellerId: ${sellerId}`, sellerId);
      throw new Error('Failed to retrieve seller statistics. Please try again.');
    }
  }
}