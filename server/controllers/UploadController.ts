import { Request, Response } from 'express';
import multer from 'multer';
import { CloudStorageService } from '../services/CloudStorageService';
import { SystemRepository } from '../repositories/SystemRepository';
import { ErrorHandlers } from '../utils/error-handler';
import { logUserActivity } from '../utils/activity-logger';
import {
  FILE_SIZE_LIMITS,
  ALLOWED_FILE_TYPES,
  validateFile,
  validateMagicNumber
} from '../utils/file-security';
import { logError, logWarning, logInfo, logDebug } from '../utils/logger';

const systemRepository = new SystemRepository();

// Multer configuration for product images (5MB limit)
const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_SIZE_LIMITS.PRODUCT_IMAGE,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_FILE_TYPES.IMAGE.mimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.') as any, false);
    }
  }
});

// Multer configuration for profile pictures (2MB limit)
const profilePictureUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_SIZE_LIMITS.PROFILE_PICTURE,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_FILE_TYPES.IMAGE.mimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.') as any, false);
    }
  }
});

// Multer configuration for banner images (3MB limit)
const bannerImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_SIZE_LIMITS.BANNER_IMAGE,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_FILE_TYPES.IMAGE.mimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.') as any, false);
    }
  }
});

// Multer configuration for media files (100MB limit for videos, images allowed too)
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_SIZE_LIMITS.STATUS_MEDIA_VIDEO,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      ...ALLOWED_FILE_TYPES.IMAGE.mimeTypes,
      ...ALLOWED_FILE_TYPES.VIDEO.mimeTypes,
      ...ALLOWED_FILE_TYPES.AUDIO.mimeTypes
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and audio files are allowed.') as any, false);
    }
  }
});

export class UploadController {
  /**
   * Upload gaming product images (Enhanced with magic number validation)
   */
  static uploadProductImages = [
    productImageUpload.array('images', 5), // Max 5 images per product
    async (req: Request, res: Response) => {
      try {
        const files = req.files as Express.Multer.File[];
        const userId = req.userId!;

        if (!files || files.length === 0) {
          return ErrorHandlers.badRequest(res, 'No images provided');
        }

        // Check if cloud storage is configured
        if (!CloudStorageService.isConfigured()) {
          return ErrorHandlers.serverError(res, 'Cloud storage not configured');
        }

        // Enhanced security: Validate magic numbers for all files
        for (const file of files) {
          const validation = validateFile(file, {
            maxSize: FILE_SIZE_LIMITS.PRODUCT_IMAGE,
            allowedMimeTypes: ALLOWED_FILE_TYPES.IMAGE.mimeTypes,
            allowedExtensions: ALLOWED_FILE_TYPES.IMAGE.extensions,
            requireMagicNumber: true
          });

          if (!validation.valid) {
            return ErrorHandlers.badRequest(res, validation.error || 'File validation failed');
          }
        }

        const uploadPromises = files.map(async (file, index) => {
          return await CloudStorageService.uploadProductImage(
            file.buffer,
            file.originalname,
            {
              folder: `gaming_marketplace/products/user_${userId}`,
              width: 800,
              height: 600,
              quality: 'auto',
              format: 'auto'
            }
          );
        });

        const uploadResults = await Promise.all(uploadPromises);

        // Log activity
        await logUserActivity(
          userId,
          'upload_product_images',
          'user_action',
          {
            imageCount: files.length,
            totalSize: files.reduce((sum, file) => sum + file.size, 0)
          },
          undefined,
          req
        );

        res.json({
          success: true,
          message: `Successfully uploaded ${files.length} images`,
          images: uploadResults.map(result => ({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            size: result.bytes
          }))
        });

      } catch (error: any) {
        const userId = req.userId!;
        const files = req.files as Express.Multer.File[];
        logError(error, 'Product image upload failed', { userId, operation: 'upload_product_images', fileCount: files?.length });
        return ErrorHandlers.serverError(res, error.message || 'Failed to upload images');
      }
    }
  ];

  /**
   * Upload user profile picture (Enhanced with magic number validation)
   */
  static uploadProfilePicture = [
    profilePictureUpload.single('profilePicture'),
    async (req: Request, res: Response) => {
      try {
        const file = req.file;
        const userId = req.userId!;

        if (!file) {
          return ErrorHandlers.badRequest(res, 'No profile picture provided');
        }

        // Check if cloud storage is configured
        if (!CloudStorageService.isConfigured()) {
          return ErrorHandlers.serverError(res, 'Cloud storage not configured');
        }

        // Enhanced security: Validate magic number
        const validation = validateFile(file, {
          maxSize: FILE_SIZE_LIMITS.PROFILE_PICTURE,
          allowedMimeTypes: ALLOWED_FILE_TYPES.IMAGE.mimeTypes,
          allowedExtensions: ALLOWED_FILE_TYPES.IMAGE.extensions,
          requireMagicNumber: true
        });

        if (!validation.valid) {
          return ErrorHandlers.badRequest(res, validation.error || 'File validation failed');
        }

        const uploadResult = await CloudStorageService.uploadProfilePicture(
          file.buffer,
          userId,
          {
            folder: `gaming_marketplace/profiles/user_${userId}`
          }
        );

        // Log activity (upload only, not profile update)
        await logUserActivity(
          userId,
          'upload_profile_picture',
          'user_action',
          {
            imageSize: file.size,
            publicId: uploadResult.public_id
          },
          undefined,
          req
        );

        // Return Cloudinary URL without updating database
        // Frontend will send this URL to profile update endpoint
        res.json({
          success: true,
          message: 'Profile picture uploaded successfully',
          profilePicture: {
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            width: uploadResult.width,
            height: uploadResult.height
          }
        });

      } catch (error: any) {
        const userId = req.userId!;
        logError(error, 'Profile picture upload failed', { userId, operation: 'upload_profile_picture' });
        return ErrorHandlers.serverError(res, error.message || 'Failed to upload profile picture');
      }
    }
  ];

  /**
   * Upload user banner image (Enhanced with magic number validation)
   */
  static uploadBannerImage = [
    bannerImageUpload.single('bannerImage'),
    async (req: Request, res: Response) => {
      try {
        const file = req.file;
        const userId = req.userId!;

        if (!file) {
          return ErrorHandlers.badRequest(res, 'No banner image provided');
        }

        // Check if cloud storage is configured
        if (!CloudStorageService.isConfigured()) {
          return ErrorHandlers.serverError(res, 'Cloud storage not configured');
        }

        // Enhanced security: Validate magic number
        const validation = validateFile(file, {
          maxSize: FILE_SIZE_LIMITS.BANNER_IMAGE,
          allowedMimeTypes: ALLOWED_FILE_TYPES.IMAGE.mimeTypes,
          allowedExtensions: ALLOWED_FILE_TYPES.IMAGE.extensions,
          requireMagicNumber: true
        });

        if (!validation.valid) {
          return ErrorHandlers.badRequest(res, validation.error || 'File validation failed');
        }

        const uploadResult = await CloudStorageService.uploadBannerImage(
          file.buffer,
          userId,
          {
            folder: `gaming_marketplace/banners/user_${userId}`
          }
        );

        // Log activity (upload only, not profile update)
        await logUserActivity(
          userId,
          'upload_banner_image',
          'user_action',
          {
            imageSize: file.size,
            publicId: uploadResult.public_id
          },
          undefined,
          req
        );

        // Return Cloudinary URL without updating database
        // Frontend will send this URL to profile update endpoint
        res.json({
          success: true,
          message: 'Banner image uploaded successfully',
          bannerImage: {
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            width: uploadResult.width,
            height: uploadResult.height
          }
        });

      } catch (error: any) {
        const userId = req.userId!;
        logError(error, 'Banner image upload failed', { userId, operation: 'upload_banner_image' });
        return ErrorHandlers.serverError(res, error.message || 'Failed to upload banner image');
      }
    }
  ];

  /**
   * Generate signed upload parameters for direct browser uploads (with server-controlled folders)
   */
  static getUploadSignature = async (req: Request, res: Response) => {
    try {
      const { uploadType } = req.body;
      const userId = req.userId!;

      if (!CloudStorageService.isConfigured()) {
        return ErrorHandlers.serverError(res, 'Cloud storage not configured');
      }

      const allowedTypes = ['product_images', 'profile_picture', 'banner_image'];
      if (!allowedTypes.includes(uploadType)) {
        return ErrorHandlers.badRequest(res, 'Invalid upload type');
      }

      // Server-controlled folder based on user and upload type
      let folder: string;
      switch (uploadType) {
        case 'product_images':
          folder = `gaming_marketplace/products/user_${userId}`;
          break;
        case 'profile_picture':
          folder = `gaming_marketplace/profiles/user_${userId}`;
          break;
        case 'banner_image':
          folder = `gaming_marketplace/banners/user_${userId}`;
          break;
        default:
          return ErrorHandlers.badRequest(res, 'Invalid upload type');
      }

      const uploadParams = {
        folder,
        resource_type: 'image' as const,
        type: 'upload' as const,
        quality: 'auto',
        format: 'auto',
        // Add transformation constraints
        allowed_formats: ['jpg', 'png', 'webp'],
        max_bytes: 10 * 1024 * 1024 // 10MB limit
      };

      const signatureData = CloudStorageService.generateUploadSignature(uploadParams);

      res.json({
        success: true,
        uploadParams: {
          ...uploadParams,
          ...signatureData,
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME
        }
      });

    } catch (error: any) {
      const userId = req.userId!;
      logError(error, 'Upload signature generation failed', { userId, operation: 'generate_upload_signature' });
      return ErrorHandlers.serverError(res, 'Failed to generate upload signature');
    }
  };

  /**
   * Delete uploaded image (with ownership verification)
   */
  static deleteImage = async (req: Request, res: Response) => {
    try {
      const publicId = req.params[0]; // Get from wildcard route
      const userId = req.userId!;

      if (!publicId) {
        return ErrorHandlers.badRequest(res, 'Public ID is required');
      }

      if (!CloudStorageService.isConfigured()) {
        return ErrorHandlers.serverError(res, 'Cloud storage not configured');
      }

      // Verify ownership: publicId must belong to this user's folders (with exact boundaries)
      const allowedPrefixes = [
        `gaming_marketplace/products/user_${userId}/`,
        `gaming_marketplace/profiles/user_${userId}/`,
        `gaming_marketplace/banners/user_${userId}/`
      ];
      
      const isOwner = allowedPrefixes.some(prefix => publicId.startsWith(prefix));
      if (!isOwner) {
        return ErrorHandlers.forbidden(res, 'You can only delete your own images');
      }

      const deleteResult = await CloudStorageService.deleteImage(publicId);

      // Treat not_found as success for idempotency
      if (!deleteResult) {
        logWarning('Image not found, treating as already deleted', { publicId, userId, operation: 'delete_image' });
      }

      // Log activity
      await logUserActivity(
        userId,
        'delete_image',
        'user_action',
        { publicId },
        undefined,
        req
      );

      res.json({
        success: true,
        message: 'Image deleted successfully'
      });

    } catch (error: any) {
      const userId = req.userId!;
      logError(error, 'Image deletion failed', { userId, operation: 'delete_image' });
      return ErrorHandlers.serverError(res, error.message || 'Failed to delete image');
    }
  };

  /**
   * Get optimized image URL with transformations (with authorization)
   */
  static getOptimizedImageUrl = async (req: Request, res: Response) => {
    try {
      const publicId = req.params[0]; // Get from wildcard route
      const { width, height, quality, format, crop } = req.query;
      const userId = req.userId!;

      if (!publicId) {
        return ErrorHandlers.badRequest(res, 'Public ID is required');
      }

      // Verify user has access to this image (ownership or public gaming marketplace images)
      const allowedPrefixes = [
        `gaming_marketplace/products/user_${userId}/`,
        `gaming_marketplace/profiles/user_${userId}/`,
        `gaming_marketplace/banners/user_${userId}/`,
        `gaming_marketplace/products/`, // Allow viewing other users' product images
      ];
      
      const hasAccess = allowedPrefixes.some(prefix => publicId.startsWith(prefix));
      if (!hasAccess) {
        return ErrorHandlers.forbidden(res, 'Access denied to this image');
      }

      // Validate transformation parameters against allowlist
      const validatedParams = {
        width: width && !isNaN(parseInt(width as string)) ? Math.min(parseInt(width as string), 2000) : undefined,
        height: height && !isNaN(parseInt(height as string)) ? Math.min(parseInt(height as string), 2000) : undefined,
        quality: ['auto', '90', '80', '70', '60'].includes(quality as string) ? quality as any : 'auto',
        format: ['auto', 'jpg', 'png', 'webp'].includes(format as string) ? format as any : 'auto',
        crop: ['fill', 'fit', 'scale'].includes(crop as string) ? crop as any : 'fill'
      };

      const optimizedUrl = CloudStorageService.generateOptimizedUrl(publicId, validatedParams);

      res.json({
        success: true,
        optimizedUrl
      });

    } catch (error: any) {
      const userId = req.userId!;
      logError(error, 'Optimized URL generation failed', { userId, operation: 'get_optimized_url' });
      return ErrorHandlers.serverError(res, 'Failed to generate optimized URL');
    }
  };

  /**
   * Upload media files (images, videos, audio) for status updates
   */
  static uploadMediaFiles = [
    mediaUpload.array('files', 5), // Max 5 files
    async (req: Request, res: Response) => {
      try {
        const files = req.files as Express.Multer.File[];
        const userId = req.userId!;

        if (!files || files.length === 0) {
          return ErrorHandlers.badRequest(res, 'No files provided');
        }

        // Check if cloud storage is configured
        if (!CloudStorageService.isConfigured()) {
          return ErrorHandlers.serverError(res, 'Cloud storage not configured');
        }

        const uploadPromises = files.map(async (file) => {
          // Route based on mime type: images use optimized upload, media files use raw upload
          const isImage = file.mimetype.startsWith('image/');
          
          if (isImage) {
            // Use optimized image upload with sharp processing
            return await CloudStorageService.uploadProductImage(
              file.buffer,
              file.originalname,
              {
                folder: `gaming_marketplace/status/user_${userId}`,
                quality: 'auto',
                format: 'auto'
              }
            );
          } else {
            // Use raw media upload for videos and audio (no sharp processing)
            return await CloudStorageService.uploadMediaFile(
              file.buffer,
              file.originalname,
              file.mimetype,
              {
                folder: `gaming_marketplace/status/user_${userId}`
              }
            );
          }
        });

        const uploadResults = await Promise.all(uploadPromises);

        // Log activity
        await logUserActivity(
          userId,
          'upload_media_files',
          'user_action',
          {
            fileCount: files.length,
            totalSize: files.reduce((sum, file) => sum + file.size, 0),
            fileTypes: files.map(f => f.mimetype)
          },
          undefined,
          req
        );

        res.json({
          success: true,
          message: `Successfully uploaded ${files.length} file(s)`,
          files: uploadResults.map((result, index) => {
            const file = files[index];
            const isImage = file.mimetype.startsWith('image/');
            
            return {
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              size: result.bytes,
              mimeType: file.mimetype,
              resourceType: file.mimetype.startsWith('image/') ? 'image' : 
                           file.mimetype.startsWith('video/') ? 'video' : 'audio',
              // Include dimensions only for images
              ...(isImage && {
                width: result.width,
                height: result.height
              })
            };
          })
        });

      } catch (error: any) {
        const userId = req.userId!;
        const files = req.files as Express.Multer.File[];
        logError(error, 'Media file upload failed', { userId, operation: 'upload_media_files', fileCount: files?.length });
        return ErrorHandlers.serverError(res, error.message || 'Failed to upload files');
      }
    }
  ];
}

export default UploadController;