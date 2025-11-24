import type {
  Product,
  InsertProduct
} from "@shared/schema";

/**
 * IProductRepository
 * 
 * Interface for core product database operations.
 * Handles basic CRUD operations for products.
 */
export interface IProductRepository {
  /**
   * Get a single product by ID
   * @param id - Product ID
   * @returns Product if found, undefined otherwise
   */
  getProduct(id: number): Promise<Product | undefined>;

  /**
   * Get products with advanced filtering and sorting
   * @param filters - Optional filters including category, seller, price range, search, etc.
   * @returns Array of products matching the filters
   */
  getProducts(filters?: { 
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
  }): Promise<Product[]>;

  /**
   * Create a new product
   * @param product - Product data to insert
   * @returns Created product with generated ID
   */
  createProduct(product: InsertProduct): Promise<Product>;

  /**
   * Update an existing product
   * @param id - Product ID
   * @param updates - Partial product data to update
   * @returns Updated product if found, undefined otherwise
   */
  updateProduct(id: number, updates: Partial<Product>): Promise<Product | undefined>;
}
