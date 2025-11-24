import { Router, Request, Response } from "express";
import { ProductService } from "../services/ProductService";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { validate, sanitizeInput, rateLimit } from "../middleware/validation";
import { handleError, ErrorHandlers } from "../utils/error-handler";
import { idParamSchema, productFilterQuerySchema, insertProductSchema, sellerIdParamSchema } from "@shared/schema";
import { upload, uploadMemory } from "../utils/file-upload";
import { CloudStorageService } from "../services/CloudStorageService";
import { z } from "zod";
import multer from "multer";
import { logError, logWarning, logInfo, logDebug } from "../utils/logger";

export const productController = Router();

// Multer error handler
const handleMulterError = (err: any, req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ErrorHandlers.badRequest(res, 'File too large. Maximum size is 5MB per image.');
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return ErrorHandlers.badRequest(res, 'Too many files. Maximum 5 images allowed.');
    }
    return ErrorHandlers.badRequest(res, err.message);
  }
  if (err.message.includes('Invalid file type')) {
    return ErrorHandlers.badRequest(res, 'Only image files are allowed.');
  }
  next(err);
};

// Upload product images
productController.post('/upload-images',
  requireAuth,
  uploadMemory.array('images', 5), // Allow up to 5 images
  handleMulterError,
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10, message: 'Too many image upload attempts. Please try again later.' }),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return ErrorHandlers.badRequest(res, 'No images provided');
      }

      if (files.length > 5) {
        return ErrorHandlers.badRequest(res, 'Maximum 5 images allowed');
      }

      const uploadPromises = files.map(async (file) => {
        try {
          const result = await CloudStorageService.uploadProductImage(
            file.buffer,
            file.originalname
          );
          return result.secure_url;
        } catch (error) {
          logError(error, 'Image upload failed during product image upload', { userId: req.userId, operation: 'upload_product_image', filename: file.originalname });
          throw new Error(`Failed to upload ${file.originalname}`);
        }
      });

      const imageUrls = await Promise.all(uploadPromises);

      res.json({
        message: 'Images uploaded successfully',
        images: imageUrls
      });
    } catch (error: any) {
      handleError(res, error, 'Upload product images');
    }
  }
);

// Get all products with filtering
productController.get('/', 
  optionalAuth,
  validate({ query: productFilterQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const filters = req.validatedData!.query;
      const products = await ProductService.getProducts(filters);
      res.json(products);
    } catch (error: any) {
      handleError(res, error, 'Get products');
    }
  }
);

// Search products - MUST be before /:id route to avoid conflicts
productController.get('/search', 
  optionalAuth,
  validate({ query: productFilterQuerySchema.extend({ q: z.string().optional() }) }),
  async (req: Request, res: Response) => {
    try {
      const { q: query, ...filters } = req.validatedData!.query;
      
      // Clean up empty string values that should be treated as undefined
      const cleanFilters = Object.keys(filters).reduce((acc: any, key) => {
        const value = filters[key as keyof typeof filters];
        if (value !== '' && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      const products = await ProductService.searchProducts(query || '', cleanFilters);
      res.json(products);
    } catch (error: any) {
      handleError(res, error, 'Search products');
    }
  }
);

// Get product by ID
productController.get('/:id', 
  optionalAuth,
  validate({ params: idParamSchema }),
  async (req: Request, res: Response) => {
    try {
      const { id: productId } = req.validatedData!.params;
      const product = await ProductService.getProduct(productId);
      res.json(product);
    } catch (error: any) {
      handleError(res, error, 'Get product');
    }
  }
);

// Create new product
productController.post('/', 
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 20, message: 'Too many product creation attempts. Please try again later.' }),
  sanitizeInput(),
  validate({ body: insertProductSchema }),
  async (req: Request, res: Response) => {
    try {
      const productData = req.validatedData!.body;
      const newProduct = await ProductService.createProduct(productData, req.userId!, req);
      res.status(201).json({
        message: 'Product created successfully',
        product: newProduct
      });
    } catch (error: any) {
      handleError(res, error, 'Create product');
    }
  }
);

// Update product
productController.put('/:id', 
  requireAuth,
  sanitizeInput(),
  validate({ params: idParamSchema, body: insertProductSchema.partial() }),
  async (req: Request, res: Response) => {
    try {
      const { id: productId } = req.validatedData!.params;
      const updateData = req.validatedData!.body;
      const updatedProduct = await ProductService.updateProduct(productId, updateData, req.userId!, req);
      
      res.json({
        message: 'Product updated successfully',
        product: updatedProduct
      });
    } catch (error: any) {
      handleError(res, error, 'Update product');
    }
  }
);

// Delete product
productController.delete('/:id', 
  requireAuth,
  validate({ params: idParamSchema }),
  async (req: Request, res: Response) => {
    try {
      const { id: productId } = req.validatedData!.params;
      await ProductService.deleteProduct(productId, req.userId!, req);
      
      res.json({ message: 'Product deleted successfully' });
    } catch (error: any) {
      handleError(res, error, 'Delete product');
    }
  }
);

// Get seller stats
productController.get('/seller/:sellerId/stats', 
  requireAuth,
  validate({ params: sellerIdParamSchema }),
  async (req: Request, res: Response) => {
    try {
      const { sellerId } = req.validatedData!.params;
      
      // Only allow users to see their own stats or admin users
      if (req.userId !== sellerId && req.user?.role !== 'admin' && req.user?.role !== 'owner') {
        return ErrorHandlers.accessDenied(res);
      }
      
      const stats = await ProductService.getSellerStats(sellerId);
      res.json(stats);
    } catch (error: any) {
      handleError(res, error, 'Get seller stats');
    }
  }
);