import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/validation';
import { UploadController } from '../controllers/UploadController';
import { generatePoster } from '../deepseek';
import { storage } from '../storage';
import { logChatActivity } from '../utils/activity-logger';
import { logError, logInfo } from '../utils/logger';

const router = Router();

// Upload routes for cloud storage
router.post('/product-images', 
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10, message: 'Too many image upload attempts. Please try again later.' }),
  UploadController.uploadProductImages
);

router.post('/media-files', 
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 15, message: 'Too many media upload attempts. Please try again later.' }),
  UploadController.uploadMediaFiles
);

router.post('/profile-picture', 
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5, message: 'Too many profile picture upload attempts. Please try again later.' }),
  UploadController.uploadProfilePicture
);

router.post('/banner-image', 
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5, message: 'Too many banner upload attempts. Please try again later.' }),
  UploadController.uploadBannerImage
);

router.post('/signature', 
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 20, message: 'Too many signature requests. Please try again later.' }),
  UploadController.getUploadSignature
);

router.delete('/image/*', 
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 15, message: 'Too many delete attempts. Please try again later.' }),
  UploadController.deleteImage
);

router.get('/optimize/*', 
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 50, message: 'Too many optimization requests. Please try again later.' }),
  UploadController.getOptimizedImageUrl
);

// AI Poster Generation endpoint with rate limiting and validation
router.post('/poster/generate', 
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5, message: 'Too many poster generation attempts. Please try again later.' }),
  async (req: Request, res: Response) => {
    try {
      const { productId, profileImage, selectedSkins } = req.body;

      // Validate input data
      if (!productId || typeof productId !== 'number') {
        return res.status(400).json({ 
          error: 'Valid product ID is required',
          timestamp: new Date().toISOString()
        });
      }

      if (selectedSkins && !Array.isArray(selectedSkins)) {
        return res.status(400).json({ 
          error: 'Selected skins must be an array',
          timestamp: new Date().toISOString()
        });
      }

      // Validate that user owns the product or is admin
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ 
          error: 'Product not found',
          timestamp: new Date().toISOString()
        });
      }

      // Check if user owns product or is admin
      const user = await storage.getUser(req.userId!);
      const isAdmin = user?.role === 'admin';
      
      if (product.sellerId !== req.userId && !isAdmin) {
        return res.status(403).json({ 
          error: 'You can only generate posters for your own products',
          timestamp: new Date().toISOString()
        });
      }

      logInfo(`Generating AI poster for product ${productId} by user ${req.userId} ${isAdmin ? '(admin)' : ''}`);

      // Audit log poster generation
      await logChatActivity(req.userId!, 'generate_ai_poster', 0, productId, req);

      // Generate poster using AI
      const posterUrl = await generatePoster(
        productId, 
        profileImage || '', 
        selectedSkins || []
      );

      res.json({
        success: true,
        posterUrl,
        productId,
        message: 'AI poster generated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logError(error, 'AI poster generation failed', req.userId);

      // Determine appropriate status code
      let statusCode = 500;
      let userMessage = 'Failed to generate AI poster. Please try again.';

      if (error.message.includes('billing') || error.message.includes('quota')) {
        statusCode = 503;
        userMessage = 'AI poster service temporarily unavailable. Please try again later.';
      } else if (error.message.includes('API key')) {
        statusCode = 503;
        userMessage = 'AI poster service is not properly configured. Please contact support.';
      }

      res.status(statusCode).json({
        error: userMessage,
        code: statusCode,
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;
