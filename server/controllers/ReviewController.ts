import { Router, Request, Response } from "express";
import { ReviewService } from "../services/ReviewService";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { validate, sanitizeInput, rateLimit } from "../middleware/validation";
import { handleError, ErrorHandlers } from "../utils/error-handler";
import { idParamSchema, insertReviewSchema, paginationQuerySchema } from "@shared/schema";
import { UserRepository } from "../repositories/UserRepository";
import { z } from "zod";

export const reviewController = Router();

// Schema definitions for validation
const reviewUpdateSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
  isPublic: z.boolean().optional()
});

const reviewModerationSchema = z.object({
  moderationStatus: z.enum(['approved', 'pending', 'rejected']),
  moderationNotes: z.string().max(500).optional()
});

const reviewQuerySchema = z.object({
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().min(0)).optional()
  // Removed moderationStatus from public query - security concern
});

// Create a new review for a product
reviewController.post('/products/:id/reviews',
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5, message: 'Too many review attempts. Please try again later.' }),
  sanitizeInput(),
  validate({ 
    params: idParamSchema.extend({ id: z.string().transform(Number) }), 
    body: insertReviewSchema.omit({ productId: true, buyerId: true, sellerId: true }) 
  }),
  async (req: Request, res: Response) => {
    try {
      const { id: productId } = req.validatedData!.params;
      const reviewData = req.validatedData!.body;
      
      const review = await ReviewService.createReview(
        { ...reviewData, productId },
        req.userId!,
        req
      );
      
      res.status(201).json({
        message: 'Review created successfully',
        data: review
      });
    } catch (error: any) {
      handleError(res, error, 'Create review');
    }
  }
);

// Get reviews for a specific product
reviewController.get('/products/:id/reviews',
  optionalAuth,
  validate({ 
    params: idParamSchema.extend({ id: z.string().transform(Number) }),
    query: reviewQuerySchema
  }),
  async (req: Request, res: Response) => {
    try {
      const { id: productId } = req.validatedData!.params;
      const { limit, offset } = req.validatedData!.query || {};
      
      const reviews = await ReviewService.getProductReviews(productId, {
        limit,
        offset
        // moderationStatus removed from public endpoint for security
      });
      
      res.json({
        message: 'Reviews retrieved successfully',
        data: reviews
      });
    } catch (error: any) {
      handleError(res, error, 'Get product reviews');
    }
  }
);

// Get review statistics for a product
reviewController.get('/products/:id/reviews/stats',
  optionalAuth,
  validate({ params: idParamSchema.extend({ id: z.string().transform(Number) }) }),
  async (req: Request, res: Response) => {
    try {
      const { id: productId } = req.validatedData!.params;
      
      const stats = await ReviewService.getProductReviewStats(productId);
      
      res.json({
        message: 'Review statistics retrieved successfully',
        data: stats
      });
    } catch (error: any) {
      handleError(res, error, 'Get product review stats');
    }
  }
);

// Get current user's reviews
reviewController.get('/my-reviews',
  requireAuth,
  validate({ query: paginationQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const { limit, offset } = req.validatedData!.query || {};
      
      const reviews = await ReviewService.getUserReviews(req.userId!, {
        limit,
        offset
      });
      
      res.json({
        message: 'User reviews retrieved successfully',
        data: reviews
      });
    } catch (error: any) {
      handleError(res, error, 'Get user reviews');
    }
  }
);

// Get reviews for a seller's products
reviewController.get('/sellers/:id/reviews',
  optionalAuth,
  validate({ 
    params: idParamSchema.extend({ id: z.string().transform(Number) }),
    query: paginationQuerySchema
  }),
  async (req: Request, res: Response) => {
    try {
      const { id: sellerId } = req.validatedData!.params;
      const { limit, offset } = req.validatedData!.query || {};
      
      const reviews = await ReviewService.getSellerReviews(sellerId, {
        limit,
        offset
      });
      
      res.json({
        message: 'Seller reviews retrieved successfully',
        data: reviews
      });
    } catch (error: any) {
      handleError(res, error, 'Get seller reviews');
    }
  }
);

// Get seller review statistics
reviewController.get('/sellers/:id/reviews/stats',
  optionalAuth,
  validate({ params: idParamSchema.extend({ id: z.string().transform(Number) }) }),
  async (req: Request, res: Response) => {
    try {
      const { id: sellerId } = req.validatedData!.params;
      
      const stats = await ReviewService.getSellerReviewStats(sellerId);
      
      res.json({
        message: 'Seller review statistics retrieved successfully',
        data: stats
      });
    } catch (error: any) {
      handleError(res, error, 'Get seller review stats');
    }
  }
);

// Update a review
reviewController.put('/:id',
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10, message: 'Too many update attempts. Please try again later.' }),
  sanitizeInput(),
  validate({ 
    params: idParamSchema.extend({ id: z.string().transform(Number) }),
    body: reviewUpdateSchema
  }),
  async (req: Request, res: Response) => {
    try {
      const { id: reviewId } = req.validatedData!.params;
      const updateData = req.validatedData!.body;
      
      const review = await ReviewService.updateReview(
        reviewId,
        updateData,
        req.userId!,
        req
      );
      
      res.json({
        message: 'Review updated successfully',
        data: review
      });
    } catch (error: any) {
      handleError(res, error, 'Update review');
    }
  }
);

// Delete a review
reviewController.delete('/:id',
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10, message: 'Too many delete attempts. Please try again later.' }),
  validate({ params: idParamSchema.extend({ id: z.string().transform(Number) }) }),
  async (req: Request, res: Response) => {
    try {
      const { id: reviewId } = req.validatedData!.params;
      
      await ReviewService.deleteReview(reviewId, req.userId!, req);
      
      res.json({
        message: 'Review deleted successfully'
      });
    } catch (error: any) {
      handleError(res, error, 'Delete review');
    }
  }
);

// Vote a review as helpful
reviewController.post('/:id/helpful',
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 20, message: 'Too many voting attempts. Please try again later.' }),
  validate({ params: idParamSchema.extend({ id: z.string().transform(Number) }) }),
  async (req: Request, res: Response) => {
    try {
      const { id: reviewId } = req.validatedData!.params;
      
      const review = await ReviewService.voteReviewHelpful(reviewId, req.userId!, req);
      
      res.json({
        message: 'Review marked as helpful',
        data: review
      });
    } catch (error: any) {
      handleError(res, error, 'Vote review helpful');
    }
  }
);

// Admin: Moderate a review
reviewController.patch('/:id/moderate',
  requireAuth,
  async (req: Request, res: Response, next: any) => {
    // Check if user is admin or owner
    const userRepository = new UserRepository();
    const user = await userRepository.getUser(req.userId!);
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return ErrorHandlers.forbidden(res, 'Only admins can moderate reviews');
    }
    next();
  },
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 50, message: 'Too many moderation attempts. Please try again later.' }),
  sanitizeInput(),
  validate({ 
    params: idParamSchema.extend({ id: z.string().transform(Number) }),
    body: reviewModerationSchema
  }),
  async (req: Request, res: Response) => {
    try {
      const { id: reviewId } = req.validatedData!.params;
      const moderationData = req.validatedData!.body;
      
      const review = await ReviewService.moderateReview(
        reviewId,
        moderationData,
        req.userId!,
        req
      );
      
      res.json({
        message: 'Review moderation updated successfully',
        data: review
      });
    } catch (error: any) {
      handleError(res, error, 'Moderate review');
    }
  }
);