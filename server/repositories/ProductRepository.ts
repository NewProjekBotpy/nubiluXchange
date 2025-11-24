import { IProductRepository } from "./interfaces/IProductRepository";
import {
  products,
  users,
  type Product,
  type InsertProduct
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, and, or, ne, ilike, sql } from "drizzle-orm";

/**
 * ProductRepository
 * 
 * Handles all core product-related database operations including:
 * - Product CRUD operations (get, getAll with filters, create, update)
 * - Advanced filtering (category, seller, price range, search, premium status)
 * - Sorting options (price, rating, newest)
 */
export class ProductRepository implements IProductRepository {
  
  /**
   * Get a single product by ID
   * @param id - Product ID
   * @returns Product if found, undefined otherwise
   */
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  /**
   * Get products with advanced filtering and sorting
   * 
   * Supports filtering by:
   * - category: Filter by product category
   * - sellerId: Filter by seller user ID
   * - status: Filter by product status (default: "active")
   * - searchQuery: Full-text search on title, description, and category
   * - minPrice/maxPrice: Price range filtering
   * - isPremium: Filter premium products
   * - excludeProductIds: Exclude specific product IDs
   * - excludeSellerIds: Exclude products from specific sellers
   * 
   * Supports sorting by:
   * - price_low: Price ascending
   * - price_high: Price descending
   * - rating: Rating descending
   * - newest: Creation date descending (default)
   * 
   * @param filters - Optional filters and sorting options
   * @returns Array of products with seller information
   */
  async getProducts(filters?: { 
    category?: string; 
    sellerId?: number; 
    limit?: number; 
    offset?: number;
    excludeProductIds?: number[];
    excludeSellerIds?: number[];
    sortBy?: string;
    status?: string;
    searchQuery?: string;
    minPrice?: number;
    maxPrice?: number;
    isPremium?: boolean;
  }): Promise<any[]> {
    // Build where conditions array
    const conditions = [eq(products.status, filters?.status || "active")];
    
    if (filters?.category) {
      conditions.push(eq(products.category, filters.category));
    }
    
    if (filters?.sellerId) {
      conditions.push(eq(products.sellerId, filters.sellerId));
    }

    if (filters?.excludeProductIds && filters.excludeProductIds.length > 0) {
      for (const id of filters.excludeProductIds) {
        conditions.push(ne(products.id, id));
      }
    }

    if (filters?.excludeSellerIds && filters.excludeSellerIds.length > 0) {
      for (const id of filters.excludeSellerIds) {
        conditions.push(ne(products.sellerId, id));
      }
    }

    // Database-level text search (case-insensitive)
    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const searchTerm = `%${filters.searchQuery.toLowerCase().trim()}%`;
      conditions.push(
        or(
          ilike(products.title, searchTerm),
          ilike(products.description, searchTerm),
          ilike(products.category, searchTerm)
        )!
      );
    }

    // Price range filters (cast text to numeric for proper comparison)
    if (filters?.minPrice !== undefined && filters.minPrice > 0) {
      conditions.push(sql`CAST(${products.price} AS DECIMAL) >= ${filters.minPrice}`);
    }
    if (filters?.maxPrice !== undefined && filters.maxPrice > 0) {
      conditions.push(sql`CAST(${products.price} AS DECIMAL) <= ${filters.maxPrice}`);
    }

    // Premium filter
    if (filters?.isPremium !== undefined) {
      conditions.push(eq(products.isPremium, filters.isPremium));
    }
    
    // Build query with seller information
    let baseQuery = db.select({
      // Product fields
      id: products.id,
      sellerId: products.sellerId,
      title: products.title,
      description: products.description,
      price: products.price,
      category: products.category,
      thumbnail: products.thumbnail,
      images: products.images,
      gameData: products.gameData,
      status: products.status,
      viewCount: products.viewCount,
      rating: products.rating,
      isPremium: products.isPremium,
      reviewCount: products.reviewCount,
      createdAt: products.createdAt,
      // Seller fields with rating
      seller: {
        username: users.username,
        displayName: users.displayName,
        profilePicture: users.profilePicture,
        isVerified: users.isVerified,
        sellerRating: users.sellerRating,
        sellerReviewCount: users.sellerReviewCount
      }
    })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));

    // Apply sorting (cast to numeric for price and rating)
    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'price_low':
          baseQuery = baseQuery.orderBy(sql`CAST(${products.price} AS DECIMAL) ASC`) as any;
          break;
        case 'price_high':
          baseQuery = baseQuery.orderBy(sql`CAST(${products.price} AS DECIMAL) DESC`) as any;
          break;
        case 'rating':
          baseQuery = baseQuery.orderBy(sql`CAST(${products.rating} AS DECIMAL) DESC`) as any;
          break;
        case 'newest':
          baseQuery = baseQuery.orderBy(desc(products.createdAt)) as any;
          break;
        default:
          baseQuery = baseQuery.orderBy(desc(products.createdAt)) as any;
      }
    } else {
      baseQuery = baseQuery.orderBy(desc(products.createdAt)) as any;
    }
      
    // Apply pagination
    let paginatedQuery = baseQuery;
    
    // Always apply a limit to prevent unbounded queries
    const effectiveLimit = filters?.limit || 50;
    paginatedQuery = paginatedQuery.limit(effectiveLimit) as any;
    
    if (filters?.offset) {
      paginatedQuery = paginatedQuery.offset(filters.offset) as any;
    }
    
    return await paginatedQuery;
  }

  /**
   * Create a new product
   * @param product - Product data to insert
   * @returns Created product with generated ID
   */
  async createProduct(product: InsertProduct): Promise<Product> {
    // Ensure JSONB fields are properly typed
    const productData = {
      ...product,
      images: product.images ? [...product.images] as string[] : [],
      gameData: product.gameData || {}
    };
    const result = await db.insert(products).values([productData]).returning();
    return result[0];
  }

  /**
   * Update an existing product
   * @param id - Product ID
   * @param updates - Partial product data to update
   * @returns Updated product if found, undefined otherwise
   */
  async updateProduct(id: number, updates: Partial<Product>): Promise<Product | undefined> {
    const [product] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return product || undefined;
  }
}

/**
 * Singleton instance of ProductRepository
 * 
 * Use this instance throughout the application for product-related database operations.
 * 
 * @example
 * import { productRepository } from './repositories/ProductRepository';
 * 
 * const product = await productRepository.getProduct(1);
 * const allProducts = await productRepository.getProducts({ category: 'mobile_legends' });
 */
export const productRepository = new ProductRepository();
