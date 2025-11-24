import { Request } from 'express';
import { ProductRepository } from '../repositories/ProductRepository';
import { UserRepository } from '../repositories/UserRepository';
import { MediaRepository } from '../repositories/MediaRepository';
import { insertReviewSchema, type Review } from '@shared/schema';
import { logUserActivity } from '../utils/activity-logger';
import { logError, logWarning, logInfo, logDebug } from '../utils/logger';
import { hasAdminAccess } from '@shared/auth-utils';

const productRepo = new ProductRepository();
const userRepo = new UserRepository();
const mediaRepo = new MediaRepository();

// Helper function for security logging using activity logger
const logSecurityEvent = async (
  action: string,
  userId: number,
  details: Record<string, any>,
  req?: Request
) => {
  await logUserActivity(userId, action, 'user_action', details, undefined, req, 'success');
};

export class ReviewService {
  /**
   * Create a new review for a product
   */
  static async createReview(
    reviewData: any,
    userId: number,
    req?: Request
  ): Promise<Review> {
    try {
      // Validate input data
      const validatedData = insertReviewSchema.parse(reviewData);
      
      // Security: Check if user can review this product
      const canReview = await mediaRepo.checkUserCanReview(userId, validatedData.productId);
      if (!canReview) {
        await logSecurityEvent('review_permission_denied', userId, {
          productId: validatedData.productId,
          reason: 'User cannot review this product (no completed transaction or already reviewed)'
        }, req);
        throw new Error('You can only review products you have purchased and not already reviewed');
      }
      
      // Get product details for verification
      const product = await productRepo.getProduct(validatedData.productId);
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Set buyerId and sellerId
      const reviewToCreate = {
        ...validatedData,
        buyerId: userId,
        sellerId: product.sellerId,
        isVerified: true, // Set as verified since we checked transaction exists
      };
      
      // Create the review
      const review = await mediaRepo.createReview(reviewToCreate);
      
      // Update product rating and count
      await mediaRepo.updateProductRatingAndCount(validatedData.productId);
      
      // Log successful review creation
      await logSecurityEvent('review_created', userId, {
        reviewId: review.id,
        productId: validatedData.productId,
        rating: validatedData.rating
      }, req);
      
      return review;
    } catch (error: any) {
      logError(error, 'Create review error', { service: 'ReviewService', userId });
      
      if (error.message.includes('not found') || error.message.includes('can only review')) {
        throw error;
      }
      
      if (error.name === 'ZodError') {
        throw new Error('Invalid review data. Please check your input.');
      }
      
      throw new Error('Failed to create review. Please try again.');
    }
  }

  /**
   * Get reviews for a specific product (public endpoint)
   */
  static async getProductReviews(
    productId: number,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Review[]> {
    try {
      const { limit = 20, offset = 0 } = options;
      
      // Public endpoint only returns approved reviews (security)
      return await mediaRepo.getReviewsByProduct(productId, {
        limit,
        offset
      });
    } catch (error: any) {
      logError(error, 'Get product reviews error', { service: 'ReviewService', productId, limit: options.limit, offset: options.offset });
      throw new Error('Failed to retrieve product reviews. Please try again.');
    }
  }

  /**
   * Get reviews by a specific user (as buyer)
   */
  static async getUserReviews(
    userId: number,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Review[]> {
    try {
      const { limit = 20, offset = 0 } = options;
      
      return await mediaRepo.getReviewsByBuyer(userId, { limit, offset });
    } catch (error: any) {
      logError(error, 'Get user reviews error', { service: 'ReviewService', userId, limit: options.limit, offset: options.offset });
      throw new Error('Failed to retrieve user reviews. Please try again.');
    }
  }

  /**
   * Get reviews for a seller's products
   */
  static async getSellerReviews(
    sellerId: number,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Review[]> {
    try {
      const { limit = 20, offset = 0 } = options;
      
      return await mediaRepo.getReviewsBySeller(sellerId, { limit, offset });
    } catch (error: any) {
      logError(error, 'Get seller reviews error', { service: 'ReviewService', sellerId, limit: options.limit, offset: options.offset });
      throw new Error('Failed to retrieve seller reviews. Please try again.');
    }
  }

  /**
   * Update a review (only by the review author)
   */
  static async updateReview(
    reviewId: number,
    updateData: Partial<{
      rating: number;
      comment: string;
      isPublic: boolean;
    }>,
    userId: number,
    req?: Request
  ): Promise<Review> {
    try {
      // Get existing review
      const existingReview = await mediaRepo.getReview(reviewId);
      if (!existingReview) {
        throw new Error('Review not found');
      }
      
      // Security: Only review author can update
      if (existingReview.buyerId !== userId) {
        await logSecurityEvent('review_update_denied', userId, {
          reviewId,
          reason: 'User not authorized to update this review'
        }, req);
        throw new Error('You can only update your own reviews');
      }
      
      // Validate rating if provided
      if (updateData.rating !== undefined) {
        if (updateData.rating < 1 || updateData.rating > 5) {
          throw new Error('Rating must be between 1 and 5');
        }
      }
      
      // Validate comment if provided
      if (updateData.comment !== undefined && updateData.comment.length > 1000) {
        throw new Error('Review comment must be less than 1000 characters');
      }
      
      // Update the review
      const updatedReview = await mediaRepo.updateReview(reviewId, updateData);
      
      if (!updatedReview) {
        throw new Error('Failed to update review');
      }
      
      // If rating was updated, recalculate product stats
      if (updateData.rating !== undefined) {
        await mediaRepo.updateProductRatingAndCount(existingReview.productId);
      }
      
      // Log review update
      await logSecurityEvent('review_updated', userId, {
        reviewId,
        productId: existingReview.productId,
        changes: Object.keys(updateData)
      }, req);
      
      return updatedReview;
    } catch (error: any) {
      logError(error, 'Update review error', { service: 'ReviewService', reviewId, userId });
      
      if (error.message.includes('not found') || error.message.includes('can only update') || 
          error.message.includes('Rating must') || error.message.includes('comment must') || 
          error.message.includes('Failed to update')) {
        throw error;
      }
      
      throw new Error('Failed to update review. Please try again.');
    }
  }

  /**
   * Delete a review (by author or admin)
   */
  static async deleteReview(
    reviewId: number,
    userId: number,
    req?: Request
  ): Promise<void> {
    try {
      // Get existing review
      const existingReview = await mediaRepo.getReview(reviewId);
      if (!existingReview) {
        throw new Error('Review not found');
      }
      
      // Get user to check permissions
      const user = await userRepo.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Security: Only review author or admin can delete
      const canDelete = existingReview.buyerId === userId || hasAdminAccess(user);
      if (!canDelete) {
        await logSecurityEvent('review_delete_denied', userId, {
          reviewId,
          reason: 'User not authorized to delete this review'
        }, req);
        throw new Error('You can only delete your own reviews');
      }
      
      // Delete the review
      await mediaRepo.deleteReview(reviewId);
      
      // Recalculate product stats
      await mediaRepo.updateProductRatingAndCount(existingReview.productId);
      
      // Log review deletion
      await logSecurityEvent('review_deleted', userId, {
        reviewId,
        productId: existingReview.productId,
        deletedBy: hasAdminAccess(user) ? 'admin' : 'author'
      }, req);
    } catch (error: any) {
      logError(error, 'Delete review error', { service: 'ReviewService', reviewId, userId });
      
      if (error.message.includes('not found') || error.message.includes('can only delete')) {
        throw error;
      }
      
      throw new Error('Failed to delete review. Please try again.');
    }
  }

  /**
   * Vote on review helpfulness with proper duplicate vote prevention
   */
  static async voteReviewHelpful(
    reviewId: number,
    userId: number,
    req?: Request
  ): Promise<{ review: Review; hasVoted: boolean; voteCount: number }> {
    try {
      // Get review
      const review = await mediaRepo.getReview(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }
      
      // Security: Users cannot vote on their own reviews
      if (review.buyerId === userId) {
        throw new Error('You cannot vote on your own review');
      }
      
      // Check if user already voted
      const hasVoted = await mediaRepo.checkUserVotedHelpful(reviewId, userId);
      let newVoteStatus: boolean;
      
      if (hasVoted) {
        // If already voted, remove the vote (toggle functionality)
        await mediaRepo.removeReviewHelpfulVote(reviewId, userId);
        newVoteStatus = false;
        
        await logSecurityEvent('review_vote_removed', userId, {
          reviewId,
          productId: review.productId,
          action: 'vote_removed'
        }, req);
      } else {
        // Add new vote (idempotent operation)
        await mediaRepo.createReviewHelpfulVote({
          reviewId,
          userId
        });
        newVoteStatus = true;
        
        await logSecurityEvent('review_vote_added', userId, {
          reviewId,
          productId: review.productId,
          action: 'vote_added'
        }, req);
      }
      
      // Return updated review with voting status
      const updatedReview = await mediaRepo.getReview(reviewId);
      if (!updatedReview) {
        throw new Error('Failed to retrieve updated review');
      }
      
      const voteCount = await mediaRepo.getReviewHelpfulVoteCount(reviewId);
      
      return {
        review: updatedReview,
        hasVoted: newVoteStatus,
        voteCount
      };
    } catch (error: any) {
      logError(error, 'Vote review helpful error', { service: 'ReviewService', reviewId, userId });
      
      if (error.message.includes('not found') || error.message.includes('cannot vote') || 
          error.message.includes('Failed to retrieve')) {
        throw error;
      }
      
      throw new Error('Failed to vote on review. Please try again.');
    }
  }

  /**
   * Get review statistics for a product
   */
  static async getProductReviewStats(productId: number): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
  }> {
    try {
      const stats = await mediaRepo.getProductReviewStats(productId);
      
      // Get rating distribution
      const reviews = await mediaRepo.getReviewsByProduct(productId, { 
        limit: 1000 // Get all reviews for distribution
      });
      
      const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach(review => {
        if (review.rating >= 1 && review.rating <= 5) {
          ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1;
        }
      });
      
      return {
        ...stats,
        ratingDistribution
      };
    } catch (error: any) {
      logError(error, 'Get product review stats error', { service: 'ReviewService', productId });
      throw new Error('Failed to retrieve product review statistics. Please try again.');
    }
  }

  /**
   * Get seller review statistics
   */
  static async getSellerReviewStats(sellerId: number): Promise<{
    averageRating: number;
    totalReviews: number;
  }> {
    try {
      return await mediaRepo.getSellerReviewStats(sellerId);
    } catch (error: any) {
      logError(error, 'Get seller review stats error', { service: 'ReviewService', sellerId });
      throw new Error('Failed to retrieve seller review statistics. Please try again.');
    }
  }

  /**
   * Admin function: Moderate review
   */
  static async moderateReview(
    reviewId: number,
    moderationData: {
      moderationStatus: 'approved' | 'pending' | 'rejected';
      moderationNotes?: string;
    },
    adminUserId: number,
    req?: Request
  ): Promise<Review> {
    try {
      // Get admin user
      const admin = await userRepo.getUser(adminUserId);
      if (!admin || (admin.role !== 'admin' && admin.role !== 'owner')) {
        await logSecurityEvent('review_moderation_denied', adminUserId, {
          reviewId,
          reason: 'User not authorized for review moderation'
        }, req);
        throw new Error('Only admins can moderate reviews');
      }
      
      // Update review moderation status
      const updatedReview = await mediaRepo.updateReview(reviewId, {
        moderationStatus: moderationData.moderationStatus,
        moderatedBy: adminUserId,
        moderatedAt: new Date(),
        moderationNotes: moderationData.moderationNotes
      });
      
      if (!updatedReview) {
        throw new Error('Failed to update review moderation status');
      }
      
      // Log moderation action
      await logSecurityEvent('review_moderated', adminUserId, {
        reviewId,
        moderationStatus: moderationData.moderationStatus,
        hasNotes: !!moderationData.moderationNotes
      }, req);
      
      return updatedReview;
    } catch (error: any) {
      logError(error, 'Moderate review error', { service: 'ReviewService', reviewId, adminUserId });
      
      if (error.message.includes('Only admins') || error.message.includes('Failed to update')) {
        throw error;
      }
      
      throw new Error('Failed to moderate review. Please try again.');
    }
  }
}
