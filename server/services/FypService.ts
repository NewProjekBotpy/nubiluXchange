import { UserRepository } from "../repositories/UserRepository";
import { ProductRepository } from "../repositories/ProductRepository";
import { logUserActivity } from "../utils/activity-logger";
import { logError, logWarning, logInfo, logDebug } from '../utils/logger';
import { insertUserInteractionSchema, insertUserPreferencesSchema } from "@shared/schema";
import type { Request } from "express";
import type { UserInteraction, InsertUserInteraction, UserPreferences, InsertUserPreferences, Product } from "@shared/schema";

const userRepo = new UserRepository();
const productRepo = new ProductRepository();

export class FypService {
  // Track user interactions for FYP algorithm
  static async trackInteraction(interactionData: InsertUserInteraction, req?: Request) {
    const validatedData = insertUserInteractionSchema.parse(interactionData);
    
    const interaction = await userRepo.createUserInteraction(validatedData);
    
    // Log interaction activity for analytics
    if (req) {
      await logUserActivity(
        validatedData.userId, 
        'interaction', 
        'user_action',
        { 
          productId: validatedData.productId,
          interactionType: validatedData.interactionType 
        },
        undefined,
        req
      );
    }
    
    return interaction;
  }

  // Get personalized product recommendations for a user
  static async getPersonalizedRecommendations(userId: number, limit: number = 10): Promise<Product[]> {
    try {
      // Get user preferences
      const userPrefs = await userRepo.getUserPreferences(userId);
      
      // Get user interaction history
      const recentInteractions = await userRepo.getUserInteractions(userId, { limit: 100 });
      
      // Calculate user interest scores by category and seller
      const categoryScores = this.calculateCategoryScores(recentInteractions);
      const sellerScores = this.calculateSellerScores(recentInteractions);
      
      // Get candidate products (exclude already viewed/purchased)
      const interactedProductIds = new Set(
        recentInteractions
          .map((i: UserInteraction) => i.productId)
          .filter((id): id is number => id !== null)
      );
      const excludedSellers = userPrefs?.excludedSellers || [];
      
      const candidateProducts = await productRepo.getProducts({
        limit: limit * 3, // Get more candidates for better filtering
        excludeProductIds: Array.from(interactedProductIds),
        excludeSellerIds: excludedSellers,
        status: 'active'
      });
      
      // Score and rank products
      const scoredProducts = candidateProducts.map(product => ({
        product,
        score: this.calculateProductScore(product, categoryScores, sellerScores, userPrefs)
      }));
      
      // Sort by score and apply user filters
      const filteredProducts = scoredProducts
        .filter(item => this.applyUserFilters(item.product, userPrefs))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.product);
        
      return filteredProducts;
      
    } catch (error) {
      logError(error, 'Error generating personalized recommendations', { service: 'FypService', userId, limit });
      // Fallback to popular products if FYP fails
      return await this.getFallbackRecommendations(limit);
    }
  }

  // Calculate category interest scores based on user interactions
  private static calculateCategoryScores(interactions: UserInteraction[]): Record<string, number> {
    const categoryScores: Record<string, number> = {};
    const weights = {
      'view': 1,
      'click': 2, 
      'share': 3,
      'purchase': 10,
      'add_to_favorites': 4,
      'inquire': 3,
      'search': 1
    };
    
    interactions.forEach(interaction => {
      if (interaction.metadata && typeof interaction.metadata === 'object' && 'category' in interaction.metadata) {
        const category = interaction.metadata.category as string;
        if (category) {
          const weight = weights[interaction.interactionType as keyof typeof weights] || 1;
          categoryScores[category] = (categoryScores[category] || 0) + weight;
        }
      }
    });
    
    // Normalize scores
    const maxScore = Math.max(...Object.values(categoryScores), 1);
    Object.keys(categoryScores).forEach(category => {
      categoryScores[category] = categoryScores[category] / maxScore;
    });
    
    return categoryScores;
  }

  // Calculate seller preference scores
  private static calculateSellerScores(interactions: UserInteraction[]): Record<number, number> {
    const sellerScores: Record<number, number> = {};
    const weights = {
      'view': 1,
      'click': 2,
      'share': 3, 
      'purchase': 15, // Heavy weight for purchases
      'add_to_favorites': 5,
      'inquire': 4,
      'search': 1
    };
    
    interactions.forEach(interaction => {
      if (interaction.metadata && typeof interaction.metadata === 'object' && 'sellerId' in interaction.metadata) {
        const sellerId = interaction.metadata.sellerId as number;
        if (sellerId) {
          const weight = weights[interaction.interactionType as keyof typeof weights] || 1;
          sellerScores[sellerId] = (sellerScores[sellerId] || 0) + weight;
        }
      }
    });
    
    // Normalize scores
    const maxScore = Math.max(...Object.values(sellerScores), 1);
    Object.keys(sellerScores).forEach(sellerId => {
      sellerScores[Number(sellerId)] = sellerScores[Number(sellerId)] / maxScore;
    });
    
    return sellerScores;
  }

  // Calculate score for a single product based on user preferences
  private static calculateProductScore(
    product: Product, 
    categoryScores: Record<string, number>,
    sellerScores: Record<number, number>,
    userPrefs?: UserPreferences | null
  ): number {
    let score = 0;
    
    // Category preference score (40% of total weight)
    const categoryScore = categoryScores[product.category] || 0;
    score += categoryScore * 0.4;
    
    // Seller preference score (20% of total weight)
    const sellerScore = sellerScores[product.sellerId] || 0;
    score += sellerScore * 0.2;
    
    // Price preference score (15% of total weight)
    if (userPrefs?.priceRange) {
      const { min = 0, max = Infinity } = userPrefs.priceRange;
      const price = parseFloat(product.price.toString());
      if (price >= min && price <= max) {
        score += 0.15;
      } else {
        // Penalize products outside price range
        const distance = price < min ? (min - price) / min : (price - max) / max;
        score += Math.max(0, 0.15 - distance * 0.1);
      }
    } else {
      score += 0.075; // Neutral score if no price preference
    }
    
    // Product popularity score (10% of total weight)  
    // This could be based on review count, purchase count, etc.
    const popularityScore = Math.min(1, (product.reviewCount || 0) / 100);
    score += popularityScore * 0.1;
    
    // Product freshness score (10% of total weight)
    const now = new Date();
    const productAge = now.getTime() - new Date(product.createdAt || now).getTime();
    const daysSinceCreation = productAge / (1000 * 60 * 60 * 24);
    const freshnessScore = Math.max(0, Math.min(1, (30 - daysSinceCreation) / 30));
    score += freshnessScore * 0.1;
    
    // Randomness factor for exploration (5% of total weight)
    score += Math.random() * 0.05;
    
    return Math.max(0, Math.min(1, score));
  }

  // Apply user content filters
  private static applyUserFilters(product: Product, userPrefs?: UserPreferences | null): boolean {
    if (!userPrefs?.contentFilters) return true;
    
    const filters = userPrefs.contentFilters;
    
    // Check category filters
    if (filters.excludedCategories?.includes(product.category)) {
      return false;
    }
    
    // Check minimum price filter
    if (filters.minPrice && parseFloat(product.price.toString()) < filters.minPrice) {
      return false;
    }
    
    // Check maximum price filter  
    if (filters.maxPrice && parseFloat(product.price.toString()) > filters.maxPrice) {
      return false;
    }
    
    // Note: Seller verification would require a join query
    // This feature would need to be implemented at the storage level
    
    return true;
  }

  // Fallback recommendations when FYP fails
  private static async getFallbackRecommendations(limit: number): Promise<Product[]> {
    // Return popular/recent products as fallback
    return await productRepo.getProducts({
      limit,
      sortBy: 'popular', // assuming this sorts by view count or similar
      status: 'active'
    });
  }

  // Get or create user preferences
  static async getUserPreferences(userId: number): Promise<UserPreferences | null> {
    return await userRepo.getUserPreferences(userId);
  }

  // Update user preferences
  static async updateUserPreferences(
    userId: number, 
    preferencesData: Partial<InsertUserPreferences>,
    req?: Request
  ): Promise<UserPreferences> {
    const validatedData = insertUserPreferencesSchema.partial().parse(preferencesData);
    
    // Try to update existing preferences first
    let preferences = await userRepo.updateUserPreferences(userId, validatedData);
    
    // If no existing preferences, create new ones
    if (!preferences) {
      const newPreferencesData = insertUserPreferencesSchema.parse({
        userId,
        ...validatedData
      });
      preferences = await userRepo.createUserPreferences(newPreferencesData);
    }
    
    // Log preference update activity
    if (req) {
      await logUserActivity(
        userId,
        'preferences_update',
        'user_action', 
        { updatedFields: Object.keys(validatedData) },
        undefined,
        req
      );
    }
    
    return preferences;
  }

  // Get user interaction history
  static async getUserInteractionHistory(
    userId: number, 
    filters?: { 
      interactionType?: string, 
      limit?: number, 
      offset?: number,
      startDate?: Date,
      endDate?: Date
    }
  ): Promise<UserInteraction[]> {
    return await userRepo.getUserInteractions(userId, filters);
  }

  // Get FYP analytics for admin/owner
  static async getFypAnalytics(timeframe: 'day' | 'week' | 'month' = 'week') {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;  
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }
    
    const interactions = await userRepo.getAllUserInteractions({
      startDate,
      endDate
    });
    
    return {
      totalInteractions: interactions.length,
      interactionsByType: this.groupInteractionsByType(interactions),
      topCategories: this.getTopCategories(interactions),
      activeUsers: new Set(interactions.map(i => i.userId)).size
    };
  }

  // Helper methods for analytics
  private static groupInteractionsByType(interactions: UserInteraction[]) {
    return interactions.reduce((acc: Record<string, number>, interaction) => {
      acc[interaction.interactionType] = (acc[interaction.interactionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private static getTopCategories(interactions: UserInteraction[]) {
    const categoryCounts = interactions.reduce((acc, interaction) => {
      if (interaction.metadata && typeof interaction.metadata === 'object' && 'category' in interaction.metadata) {
        const category = interaction.metadata.category as string;
        if (category) {
          acc[category] = (acc[category] || 0) + 1;
        }
      }
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }));
  }
}