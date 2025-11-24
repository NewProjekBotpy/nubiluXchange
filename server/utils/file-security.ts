/**
 * Advanced file security utilities
 * Implements magic number (file signature) validation to prevent MIME type spoofing
 */

export interface FileMagicNumber {
  signature: number[];
  extension: string;
  mimeType: string;
  offset?: number;
}

/**
 * File signatures (magic numbers) for supported file types
 * These are the actual byte patterns at the start of valid files
 */
export const FILE_SIGNATURES: FileMagicNumber[] = [
  // Images
  { signature: [0xFF, 0xD8, 0xFF], extension: 'jpg', mimeType: 'image/jpeg' },
  { signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], extension: 'png', mimeType: 'image/png' },
  { signature: [0x47, 0x49, 0x46, 0x38], extension: 'gif', mimeType: 'image/gif' },
  
  // Videos
  { signature: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], extension: 'mp4', mimeType: 'video/mp4', offset: 4 },
  { signature: [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70], extension: 'mp4', mimeType: 'video/mp4', offset: 4 },
  { signature: [0x1A, 0x45, 0xDF, 0xA3], extension: 'webm', mimeType: 'video/webm' },
  
  // Audio
  { signature: [0xFF, 0xFB], extension: 'mp3', mimeType: 'audio/mpeg' },
  { signature: [0xFF, 0xF3], extension: 'mp3', mimeType: 'audio/mpeg' },
  { signature: [0xFF, 0xF2], extension: 'mp3', mimeType: 'audio/mpeg' },
  { signature: [0x49, 0x44, 0x33], extension: 'mp3', mimeType: 'audio/mpeg' }, // ID3
];

/**
 * Special validation for WebP files (RIFF container with WEBP signature)
 */
function isValidWebP(buffer: Buffer): boolean {
  // Check RIFF header (bytes 0-3)
  if (buffer.length < 12) return false;
  if (buffer[0] !== 0x52 || buffer[1] !== 0x49 || buffer[2] !== 0x46 || buffer[3] !== 0x46) {
    return false; // Not a RIFF file
  }
  
  // Check WEBP signature (bytes 8-11)
  if (buffer[8] !== 0x57 || buffer[9] !== 0x45 || buffer[10] !== 0x42 || buffer[11] !== 0x50) {
    return false; // RIFF file but not WebP (could be AVI, WAV, etc.)
  }
  
  return true;
}

/**
 * Validate file magic number against known signatures
 */
export function validateMagicNumber(buffer: Buffer, expectedMimeType?: string): boolean {
  // Special handling for WebP
  if (!expectedMimeType || expectedMimeType === 'image/webp') {
    if (isValidWebP(buffer)) {
      return true;
    }
  }

  for (const sig of FILE_SIGNATURES) {
    // Skip if expected MIME type doesn't match
    if (expectedMimeType && !sig.mimeType.includes(expectedMimeType.split('/')[0])) {
      continue;
    }

    const offset = sig.offset || 0;
    let match = true;

    for (let i = 0; i < sig.signature.length; i++) {
      if (buffer[offset + i] !== sig.signature[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      return true;
    }
  }

  return false;
}

/**
 * Get file type from magic number
 */
export function detectFileType(buffer: Buffer): { extension: string; mimeType: string } | null {
  // Special handling for WebP (must check before generic RIFF)
  if (isValidWebP(buffer)) {
    return { extension: 'webp', mimeType: 'image/webp' };
  }

  for (const sig of FILE_SIGNATURES) {
    const offset = sig.offset || 0;
    let match = true;

    for (let i = 0; i < sig.signature.length; i++) {
      if (buffer[offset + i] !== sig.signature[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      return { extension: sig.extension, mimeType: sig.mimeType };
    }
  }

  return null;
}

/**
 * Sanitize filename to prevent directory traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .substring(0, 255);
}

/**
 * Validate file extension against whitelist
 */
export function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedExtensions.includes(extension) : false;
}

/**
 * Comprehensive file validation
 */
export interface FileValidationOptions {
  maxSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  requireMagicNumber?: boolean;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: { extension: string; mimeType: string };
}

export function validateFile(
  file: Express.Multer.File,
  options: FileValidationOptions
): FileValidationResult {
  // Check file size
  if (file.size > options.maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${(options.maxSize / (1024 * 1024)).toFixed(0)}MB`
    };
  }

  // Check MIME type
  if (!options.allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.mimetype}. Allowed: ${options.allowedMimeTypes.join(', ')}`
    };
  }

  // Check file extension
  if (!validateFileExtension(file.originalname, options.allowedExtensions)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${options.allowedExtensions.join(', ')}`
    };
  }

  // Check magic number (if required and buffer available)
  if (options.requireMagicNumber && file.buffer) {
    const detectedType = detectFileType(file.buffer);
    
    if (!detectedType) {
      return {
        valid: false,
        error: 'File signature validation failed. File may be corrupted or invalid.'
      };
    }

    // Verify detected type matches claimed MIME type
    const expectedCategory = file.mimetype.split('/')[0];
    const detectedCategory = detectedType.mimeType.split('/')[0];
    
    if (expectedCategory !== detectedCategory) {
      return {
        valid: false,
        error: `File type mismatch. Claimed: ${file.mimetype}, Detected: ${detectedType.mimeType}`
      };
    }

    return {
      valid: true,
      detectedType
    };
  }

  return { valid: true };
}

/**
 * Standard file size limits (in bytes)
 */
export const FILE_SIZE_LIMITS = {
  PRODUCT_IMAGE: 5 * 1024 * 1024,      // 5MB
  PROFILE_PICTURE: 2 * 1024 * 1024,     // 2MB
  BANNER_IMAGE: 3 * 1024 * 1024,        // 3MB
  STATUS_MEDIA_IMAGE: 5 * 1024 * 1024,  // 5MB
  STATUS_MEDIA_VIDEO: 100 * 1024 * 1024, // 100MB
  CHAT_FILE: 10 * 1024 * 1024,          // 10MB
} as const;

/**
 * Allowed file types by category
 */
export const ALLOWED_FILE_TYPES = {
  IMAGE: {
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'] as string[],
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] as string[]
  },
  VIDEO: {
    mimeTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'] as string[],
    extensions: ['mp4', 'webm', 'ogg', 'mov'] as string[]
  },
  AUDIO: {
    mimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4'] as string[],
    extensions: ['mp3', 'wav', 'ogg', 'webm', 'm4a'] as string[]
  },
  DOCUMENT: {
    mimeTypes: ['application/pdf'] as string[],
    extensions: ['pdf'] as string[]
  }
};
