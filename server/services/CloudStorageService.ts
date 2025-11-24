import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { Readable } from 'stream';
import { logError, logWarning, logInfo, logDebug } from '../utils/logger';

// Cloudinary configuration - no fallback values to ensure explicit configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Log configuration status at startup
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET
);

if (!isCloudinaryConfigured) {
  logWarning('⚠️  Cloud storage (Cloudinary) not configured - image upload features disabled', {
    service: 'CloudStorageService',
    message: 'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to enable image uploads'
  });
} else {
  logInfo('✅ Cloudinary configured successfully', { 
    service: 'CloudStorageService',
    cloudName: process.env.CLOUDINARY_CLOUD_NAME 
  });
}

export interface UploadOptions {
  folder?: string;
  width?: number;
  height?: number;
  quality?: 'auto' | number;
  format?: 'auto' | 'jpg' | 'png' | 'webp';
  crop?: 'fill' | 'fit' | 'scale' | 'crop';
  gravity?: 'center' | 'face' | 'faces';
}

export interface UploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export class CloudStorageService {
  /**
   * Upload gaming product images to cloud storage
   * Automatically creates multiple sizes for responsive design
   */
  static async uploadProductImage(
    buffer: Buffer,
    filename: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      // Optimize image with sharp before upload
      const optimizedBuffer = await sharp(buffer)
        .jpeg({ quality: 90, progressive: true })
        .png({ compressionLevel: 8 })
        .webp({ quality: 85 })
        .toBuffer();

      const uploadOptions = {
        folder: options.folder || 'gaming_marketplace/products',
        public_id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transformation: [
          {
            width: options.width || 800,
            height: options.height || 600,
            crop: options.crop || 'fill',
            gravity: options.gravity || 'center',
            quality: options.quality || 'auto',
            format: options.format || 'auto'
          }
        ],
        responsive_breakpoints: [
          {
            create_derived: true,
            bytes_step: 20000,
            min_width: 200,
            max_width: 1000,
            transformation: {
              quality: 'auto',
              format: 'auto'
            }
          }
        ],
        resource_type: 'image' as const,
        type: 'upload' as const
      };

      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        
        uploadStream.end(optimizedBuffer);
      });

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      };
    } catch (error) {
      logError(error, 'Cloud storage upload error - product image');
      throw new Error('Failed to upload image to cloud storage');
    }
  }

  /**
   * Upload user profile pictures with face detection and cropping
   */
  static async uploadProfilePicture(
    buffer: Buffer,
    userId: number,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      // Create circular profile picture optimization
      const optimizedBuffer = await sharp(buffer)
        .resize(400, 400, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      const uploadOptions = {
        folder: options.folder || 'gaming_marketplace/profiles',
        public_id: `profile_${userId}_${Date.now()}`,
        transformation: [
          {
            width: 400,
            height: 400,
            crop: 'fill',
            gravity: 'face',
            radius: 'max', // Make it circular
            quality: 'auto',
            format: 'auto'
          }
        ],
        responsive_breakpoints: [
          {
            create_derived: true,
            bytes_step: 10000,
            min_width: 50,
            max_width: 400,
            transformation: {
              radius: 'max',
              quality: 'auto',
              format: 'auto'
            }
          }
        ],
        resource_type: 'image' as const,
        type: 'upload' as const
      };

      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        
        uploadStream.end(optimizedBuffer);
      });

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      };
    } catch (error) {
      logError(error, 'Profile picture upload error');
      throw new Error('Failed to upload profile picture');
    }
  }

  /**
   * Upload banner images for user profiles
   */
  static async uploadBannerImage(
    buffer: Buffer,
    userId: number,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      // Optimize banner image for wide aspect ratio
      const optimizedBuffer = await sharp(buffer)
        .resize(1200, 400, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const uploadOptions = {
        folder: options.folder || 'gaming_marketplace/banners',
        public_id: `banner_${userId}_${Date.now()}`,
        transformation: [
          {
            width: 1200,
            height: 400,
            crop: 'fill',
            gravity: 'center',
            quality: 'auto',
            format: 'auto'
          }
        ],
        responsive_breakpoints: [
          {
            create_derived: true,
            bytes_step: 30000,
            min_width: 600,
            max_width: 1200,
            transformation: {
              quality: 'auto',
              format: 'auto'
            }
          }
        ],
        resource_type: 'image' as const,
        type: 'upload' as const
      };

      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        
        uploadStream.end(optimizedBuffer);
      });

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      };
    } catch (error) {
      logError(error, 'Banner image upload error');
      throw new Error('Failed to upload banner image');
    }
  }

  /**
   * Delete image from cloud storage
   */
  static async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      logError(error, `Cloud storage delete error - publicId: ${publicId}`);
      return false;
    }
  }

  /**
   * Generate optimized URL with transformations
   */
  static generateOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      quality?: 'auto' | number;
      format?: 'auto' | 'jpg' | 'png' | 'webp';
      crop?: 'fill' | 'fit' | 'scale';
    } = {}
  ): string {
    return cloudinary.url(publicId, {
      width: options.width,
      height: options.height,
      crop: options.crop || 'fill',
      quality: options.quality || 'auto',
      format: options.format || 'auto',
      secure: true
    });
  }

  /**
   * Upload media files (videos, audio) without image processing
   * Supports videos and audio files for status updates
   */
  static async uploadMediaFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      // Check if Cloudinary is configured
      if (!this.isConfigured()) {
        const error = new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
        logError(error, 'Cloudinary configuration check failed');
        throw error;
      }

      // Determine resource type based on mime type
      let resourceType: 'image' | 'video' | 'raw' = 'raw';
      if (mimeType.startsWith('image/')) {
        resourceType = 'image';
      } else if (mimeType.startsWith('video/')) {
        resourceType = 'video';
      } else if (mimeType.startsWith('audio/')) {
        resourceType = 'video'; // Cloudinary treats audio as video type
      }

      const uploadOptions = {
        folder: options.folder || 'gaming_marketplace/media',
        public_id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        resource_type: resourceType,
        type: 'upload' as const,
        // Only apply transformations for images
        ...(resourceType === 'image' && {
          transformation: [
            {
              quality: options.quality || 'auto',
              format: options.format || 'auto'
            }
          ]
        })
      };

      logInfo(`Uploading ${mimeType} file to Cloudinary`, { service: 'CloudStorageService', mimeType, filename });
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              logError(error, 'Cloudinary upload stream error', { service: 'CloudStorageService', mimeType, filename });
              reject(error);
            } else if (!result) {
              const uploadError = new Error('Upload failed: no result returned');
              logError(uploadError, 'Cloudinary upload returned undefined result', { service: 'CloudStorageService', mimeType, filename });
              reject(uploadError);
            } else {
              logInfo(`Cloudinary upload successful: ${result.secure_url}`, { service: 'CloudStorageService', mimeType, filename, url: result.secure_url });
              resolve(result);
            }
          }
        );
        
        // Upload raw buffer directly without processing
        uploadStream.end(buffer);
      });

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        width: result.width || 0,
        height: result.height || 0,
        format: result.format,
        bytes: result.bytes
      };
    } catch (error: any) {
      logError(error, 'Media file upload error', { service: 'CloudStorageService', mimeType, filename });
      throw new Error(`Failed to upload media file: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Check if Cloudinary is properly configured
   */
  static isConfigured(): boolean {
    const config = cloudinary.config();
    return !!(config.cloud_name && config.api_key && config.api_secret);
  }

  /**
   * Get upload widget signature for direct browser uploads
   */
  static generateUploadSignature(
    params: Record<string, any>
  ): { signature: string; timestamp: number; api_key: string } {
    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { ...params, timestamp },
      process.env.CLOUDINARY_API_SECRET!
    );

    return {
      signature,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY!
    };
  }
}

export default CloudStorageService;