import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ErrorHandlers } from "../utils/error-handler";
import DOMPurify from 'isomorphic-dompurify';
import { logError } from "../utils/logger";

// Extended Request interface for validated data
declare global {
  namespace Express {
    interface Request {
      validatedData?: {
        params?: any;
        query?: any;
        body?: any;
      };
    }
  }
}

/**
 * Validation middleware factory for consistent input validation
 * Validates request parameters, query parameters, and request body using Zod schemas
 */
export function validate(schemas: {
  params?: ZodSchema<any>;
  query?: ZodSchema<any>;
  body?: ZodSchema<any>;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData: any = {};

      // Validate route parameters
      if (schemas.params) {
        try {
          validatedData.params = schemas.params.parse(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            return ErrorHandlers.badRequest(res, `Invalid route parameter: ${error.errors.map((e: any) => e.message).join(', ')}`);
          }
          throw error;
        }
      }

      // Validate query parameters
      if (schemas.query) {
        try {
          validatedData.query = schemas.query.parse(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            return ErrorHandlers.badRequest(res, `Invalid query parameters: ${error.errors.map((e: any) => e.message).join(', ')}`);
          }
          throw error;
        }
      }

      // Validate request body
      if (schemas.body) {
        try {
          validatedData.body = schemas.body.parse(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            return ErrorHandlers.badRequest(res, `Invalid request body: ${error.errors.map((e: any) => e.message).join(', ')}`);
          }
          throw error;
        }
      }

      // Attach validated data to request
      req.validatedData = validatedData;
      next();
    } catch (error: any) {
      logError(error, 'Validation middleware error', { context: 'validate' });
      return ErrorHandlers.serverError(res, 'Validation failed');
    }
  };
}

/**
 * Message deduplication middleware
 * Prevents duplicate messages based on temporary ID or content+sender combination
 */
export function preventDuplicateMessages() {
  const recentMessages = new Map<string, { timestamp: number; chatId: number }>();
  const DEDUP_WINDOW = 5000; // 5 seconds

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const chatId = req.validatedData?.params?.id || parseInt(req.params.id);
      const messageData = req.validatedData?.body || req.body;

      if (!chatId || !messageData) {
        return next();
      }

      // Create deduplication key
      let dedupKey = '';
      
      if (messageData.tempId) {
        // Use client-provided temporary ID
        dedupKey = `temp:${messageData.tempId}`;
      } else {
        // Use content + sender + chat combination
        dedupKey = `content:${req.userId}:${chatId}:${messageData.content?.substring(0, 50)}`;
      }

      const now = Date.now();
      const recent = recentMessages.get(dedupKey);

      // Check if this message was sent recently
      if (recent && (now - recent.timestamp) < DEDUP_WINDOW && recent.chatId === chatId) {
        return ErrorHandlers.badRequest(res, 'Duplicate message detected. Please wait before sending again.');
      }

      // Store this message in the deduplication cache
      recentMessages.set(dedupKey, { timestamp: now, chatId });

      // Clean up old entries periodically
      if (Math.random() < 0.1) { // 10% chance to trigger cleanup
        const cutoff = now - DEDUP_WINDOW;
        for (const key of Array.from(recentMessages.keys())) {
          const data = recentMessages.get(key)!;
          if (data.timestamp < cutoff) {
            recentMessages.delete(key);
          }
        }
      }

      next();
    } catch (error: any) {
      logError(error, 'Message deduplication error', { context: 'preventDuplicateMessages' });
      next(); // Don't block request on deduplication errors
    }
  };
}

/**
 * Enhanced file upload security validation middleware
 * Validates file type, size, performs security checks and magic byte validation
 */
export function validateFileUpload(options: {
  allowedTypes?: string[];
  maxSize?: number;
  required?: boolean;
} = {}) {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    maxSize = 5 * 1024 * 1024, // 5MB default
    required = false
  } = options;

  // Magic byte signatures for common file types
  const magicBytes = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    'image/gif': [0x47, 0x49, 0x46, 0x38],
    'image/webp': [0x52, 0x49, 0x46, 0x46], // First 4 bytes, followed by WEBP
    'application/pdf': [0x25, 0x50, 0x44, 0x46]
  };

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;

      if (!file && required) {
        return ErrorHandlers.badRequest(res, 'File is required');
      }

      if (!file) {
        return next();
      }

      // Check file size with specific error message
      if (file.size > maxSize) {
        const actualSizeMB = (file.size / 1024 / 1024).toFixed(2);
        const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2);
        return ErrorHandlers.badRequest(res, `File size ${actualSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`);
      }

      // Check file type against allowed MIME types with user-friendly error message
      if (!allowedTypes.includes(file.mimetype)) {
        // Convert MIME types to user-friendly format
        const friendlyTypes = allowedTypes.map(type => {
          const typeMap: Record<string, string> = {
            'image/jpeg': 'JPEG images (.jpg, .jpeg)',
            'image/png': 'PNG images (.png)',
            'image/gif': 'GIF images (.gif)',
            'image/webp': 'WebP images (.webp)',
            'application/pdf': 'PDF documents (.pdf)',
          };
          return typeMap[type] || type;
        });
        
        const fileExtension = file.originalname.split('.').pop()?.toUpperCase() || 'unknown';
        return ErrorHandlers.badRequest(
          res, 
          `File type not supported. You uploaded a ${fileExtension} file, but only these types are allowed: ${friendlyTypes.join(', ')}`
        );
      }

      // Enhanced security checks
      const originalName = file.originalname.toLowerCase();
      
      // Block dangerous file extensions
      const dangerousExtensions = [
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
        '.php', '.asp', '.jsp', '.sh', '.ps1', '.msi', '.app', '.deb', '.rpm'
      ];
      
      if (dangerousExtensions.some(ext => originalName.endsWith(ext))) {
        const uploadedExtension = originalName.split('.').pop()?.toUpperCase();
        return ErrorHandlers.badRequest(
          res, 
          `Cannot upload ${uploadedExtension} files for security reasons. Please upload image or PDF files only.`
        );
      }

      // Check for null bytes in filename (path traversal attempt)
      if (file.originalname.includes('\0') || file.originalname.includes('../')) {
        return ErrorHandlers.badRequest(
          res, 
          'Invalid filename detected. Please rename your file without special characters or path separators.'
        );
      }

      // Validate file content matches MIME type using magic bytes
      if (file.buffer) {
        const fileSignature = magicBytes[file.mimetype as keyof typeof magicBytes];
        if (fileSignature) {
          const fileHeader = Array.from(file.buffer.slice(0, fileSignature.length));
          const isValidFile = fileSignature.every((byte, index) => byte === fileHeader[index]);
          
          if (!isValidFile) {
            // Detect actual file type based on magic bytes
            let detectedType = 'unknown';
            const friendlyTypeMap: Record<string, string> = {
              'image/jpeg': 'JPEG image',
              'image/png': 'PNG image',
              'image/gif': 'GIF image',
              'image/webp': 'WebP image',
              'application/pdf': 'PDF document',
              'unknown': 'unknown file type'
            };
            
            for (const [mimeType, signature] of Object.entries(magicBytes)) {
              const header = Array.from(file.buffer.slice(0, signature.length));
              if (signature.every((byte, idx) => byte === header[idx])) {
                detectedType = mimeType;
                break;
              }
            }
            
            const declaredFriendly = friendlyTypeMap[file.mimetype] || file.mimetype;
            const detectedFriendly = friendlyTypeMap[detectedType] || detectedType;
            
            return ErrorHandlers.badRequest(
              res, 
              `File validation failed. This appears to be a ${detectedFriendly}, not a ${declaredFriendly}. ` +
              `The file may be corrupted, renamed incorrectly, or potentially malicious. Please upload a valid file.`
            );
          }
        }
      }

      // Additional filename sanitization
      const sanitizedFilename = file.originalname
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace unsafe characters
        .replace(/\.{2,}/g, '.') // Remove multiple dots
        .substring(0, 100); // Limit filename length

      // Update the file object with sanitized name
      file.originalname = sanitizedFilename;

      next();
    } catch (error: any) {
      logError(error, 'File upload validation error', { context: 'validateFileUpload' });
      return ErrorHandlers.serverError(res, 'File validation failed');
    }
  };
}

/**
 * Rate limiting validation middleware
 * Advanced rate limiting with deterministic cleanup and retry headers
 */
export function rateLimit(options: {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
} = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    message = 'Too many requests. Please try again later.'
  } = options;

  const requests = new Map<string, { count: number; resetTime: number }>();
  let lastCleanup = Date.now();
  const cleanupInterval = 5 * 60 * 1000; // 5 minutes

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = Date.now();
      const key = `${req.ip}:${req.userId || 'anonymous'}`;
      
      let userData = requests.get(key);
      
      if (!userData || now > userData.resetTime) {
        userData = { count: 1, resetTime: now + windowMs };
        requests.set(key, userData);
      } else {
        userData.count++;
      }

      // Calculate rate limit headers
      const remaining = Math.max(0, maxRequests - userData.count);
      const resetTimeSeconds = Math.ceil(userData.resetTime / 1000);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetTimeSeconds.toString());

      if (userData.count > maxRequests) {
        // Calculate seconds until reset for Retry-After header
        const retryAfterSeconds = Math.ceil((userData.resetTime - now) / 1000);
        
        res.setHeader('Retry-After', retryAfterSeconds.toString());
        
        return res.status(429).json({
          error: 'Too Many Requests',
          message: message,
          retryAfter: retryAfterSeconds,
          resetAt: new Date(userData.resetTime).toISOString(),
          timestamp: new Date().toISOString()
        });
      }

      // Deterministic cleanup: every 5 minutes
      if (now - lastCleanup > cleanupInterval) {
        lastCleanup = now;
        for (const key of Array.from(requests.keys())) {
          const data = requests.get(key);
          if (data && now > data.resetTime) {
            requests.delete(key);
          }
        }
      }

      next();
    } catch (error: any) {
      logError(error, 'Rate limiting error', { context: 'rateLimit' });
      next(); // Don't block request on rate limiting errors
    }
  };
}

/**
 * Request sanitization middleware
 * Sanitizes input data to prevent common injection attacks
 * Excludes password fields from sanitization to preserve exact values
 */
export function sanitizeInput(options: { excludeFields?: string[] } = {}) {
  const { excludeFields = ['password', 'currentPassword', 'newPassword', 'confirmPassword'] } = options;
  
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body, excludeFields);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query, excludeFields);
      }

      next();
    } catch (error: any) {
      logError(error, 'Input sanitization error', { context: 'sanitizeInput' });
      next(); // Don't block request on sanitization errors
    }
  };
}

/**
 * Recursively sanitize object values using DOMPurify
 * Excludes specified fields (like passwords) from sanitization
 */
function sanitizeObject(obj: any, excludeFields: string[] = [], parentKey?: string): any {
  if (typeof obj === 'string') {
    // Skip sanitization for excluded fields (e.g., passwords)
    if (parentKey && excludeFields.includes(parentKey)) {
      return obj; // Return password as-is without any modification
    }
    
    try {
      // Use DOMPurify for robust HTML sanitization
      const sanitized = DOMPurify.sanitize(obj, {
        ALLOWED_TAGS: ['p', 'strong', 'b', 'i', 'em', 'u', 'br'],
        ALLOWED_ATTR: [],
        ALLOW_DATA_ATTR: false,
        KEEP_CONTENT: true,
        FORCE_BODY: true
      });
      
      return sanitized.trim();
    } catch (error) {
      // Fallback to regex-based sanitization if DOMPurify fails
      logError(error, 'DOMPurify sanitization error', { context: 'sanitizeObject' });
      // Remove all HTML tags as fallback
      return obj.replace(/<[^>]*>/g, '').trim();
    }
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, excludeFields));
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value, excludeFields, key);
    }
    return sanitized;
  }

  return obj;
}