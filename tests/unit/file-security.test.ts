/**
 * Unit tests for file security utilities
 */
import { describe, it, expect } from 'vitest';
import {
  validateMagicNumber,
  detectFileType,
  sanitizeFilename,
  validateFileExtension,
  FILE_SIZE_LIMITS,
  ALLOWED_FILE_TYPES
} from '../../server/utils/file-security';

describe('File Security - Magic Number Validation', () => {
  describe('JPEG validation', () => {
    it('should validate valid JPEG file', () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      expect(validateMagicNumber(jpegBuffer, 'image/jpeg')).toBe(true);
    });

    it('should detect JPEG file type', () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      const detected = detectFileType(jpegBuffer);
      expect(detected).toEqual({ extension: 'jpg', mimeType: 'image/jpeg' });
    });
  });

  describe('PNG validation', () => {
    it('should validate valid PNG file', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      expect(validateMagicNumber(pngBuffer, 'image/png')).toBe(true);
    });

    it('should detect PNG file type', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const detected = detectFileType(pngBuffer);
      expect(detected).toEqual({ extension: 'png', mimeType: 'image/png' });
    });
  });

  describe('WebP validation (RIFF container security)', () => {
    it('should validate valid WebP file with complete signature', () => {
      // WebP: RIFF header (0-3) + size (4-7) + WEBP signature (8-11)
      const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46,  // RIFF
        0x00, 0x00, 0x00, 0x00,  // Size (placeholder)
        0x57, 0x45, 0x42, 0x50,  // WEBP
        0x56, 0x50, 0x38          // VP8 chunk
      ]);
      expect(validateMagicNumber(webpBuffer, 'image/webp')).toBe(true);
    });

    it('should detect valid WebP file type', () => {
      const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46,  // RIFF
        0x00, 0x00, 0x00, 0x00,  // Size
        0x57, 0x45, 0x42, 0x50   // WEBP
      ]);
      const detected = detectFileType(webpBuffer);
      expect(detected).toEqual({ extension: 'webp', mimeType: 'image/webp' });
    });

    it('should REJECT spoofed AVI file with .webp extension', () => {
      // AVI file: RIFF header + AVI signature (not WEBP)
      const aviBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46,  // RIFF
        0x00, 0x00, 0x00, 0x00,  // Size
        0x41, 0x56, 0x49, 0x20   // AVI (not WEBP!)
      ]);
      expect(validateMagicNumber(aviBuffer, 'image/webp')).toBe(false);
    });

    it('should REJECT spoofed WAV file with .webp extension', () => {
      // WAV file: RIFF header + WAVE signature (not WEBP)
      const wavBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46,  // RIFF
        0x00, 0x00, 0x00, 0x00,  // Size
        0x57, 0x41, 0x56, 0x45   // WAVE (not WEBP!)
      ]);
      expect(validateMagicNumber(wavBuffer, 'image/webp')).toBe(false);
    });

    it('should reject RIFF file without proper WEBP signature', () => {
      const fakeBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46,  // RIFF
        0x00, 0x00, 0x00, 0x00,  // Size
        0x00, 0x00, 0x00, 0x00   // Invalid signature
      ]);
      const detected = detectFileType(fakeBuffer);
      expect(detected).toBeNull();
    });

    it('should reject buffer too small for WebP validation', () => {
      const tinyBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46]);
      expect(validateMagicNumber(tinyBuffer, 'image/webp')).toBe(false);
    });
  });

  describe('Invalid file detection', () => {
    it('should reject invalid magic number', () => {
      const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      expect(validateMagicNumber(invalidBuffer, 'image/jpeg')).toBe(false);
    });

    it('should return null for unknown file type', () => {
      const unknownBuffer = Buffer.from([0xAA, 0xBB, 0xCC, 0xDD]);
      expect(detectFileType(unknownBuffer)).toBeNull();
    });
  });
});

describe('File Security - Filename Sanitization', () => {
  it('should sanitize filename with special characters', () => {
    // Slashes are replaced with underscores, consecutive dots removed, leading dots removed
    expect(sanitizeFilename('../../../etc/passwd')).toBe('_._._etc_passwd');
  });

  it('should remove consecutive dots', () => {
    expect(sanitizeFilename('file...name.jpg')).toBe('file.name.jpg');
  });

  it('should remove leading dots', () => {
    expect(sanitizeFilename('...hidden.txt')).toBe('hidden.txt');
  });

  it('should replace invalid characters with underscores', () => {
    // Special chars are replaced, dots are kept (except consecutive)
    expect(sanitizeFilename('file<>:"|?*.jpg')).toBe('file_______.jpg');
  });

  it('should truncate long filenames', () => {
    const longName = 'a'.repeat(300) + '.jpg';
    const sanitized = sanitizeFilename(longName);
    expect(sanitized.length).toBeLessThanOrEqual(255);
  });
});

describe('File Security - Extension Validation', () => {
  it('should validate allowed image extension', () => {
    expect(validateFileExtension('photo.jpg', ['jpg', 'png', 'gif'])).toBe(true);
  });

  it('should reject disallowed extension', () => {
    expect(validateFileExtension('script.exe', ['jpg', 'png'])).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(validateFileExtension('photo.JPG', ['jpg', 'png'])).toBe(true);
  });

  it('should handle files without extension', () => {
    expect(validateFileExtension('noextension', ['jpg', 'png'])).toBe(false);
  });
});

describe('File Security - Constants', () => {
  it('should have consistent file size limits', () => {
    expect(FILE_SIZE_LIMITS.PRODUCT_IMAGE).toBe(5 * 1024 * 1024);
    expect(FILE_SIZE_LIMITS.PROFILE_PICTURE).toBe(2 * 1024 * 1024);
    expect(FILE_SIZE_LIMITS.BANNER_IMAGE).toBe(3 * 1024 * 1024);
    expect(FILE_SIZE_LIMITS.STATUS_MEDIA_VIDEO).toBe(100 * 1024 * 1024);
    expect(FILE_SIZE_LIMITS.CHAT_FILE).toBe(10 * 1024 * 1024);
  });

  it('should have valid image MIME types', () => {
    expect(ALLOWED_FILE_TYPES.IMAGE.mimeTypes).toContain('image/jpeg');
    expect(ALLOWED_FILE_TYPES.IMAGE.mimeTypes).toContain('image/png');
    expect(ALLOWED_FILE_TYPES.IMAGE.mimeTypes).toContain('image/webp');
  });

  it('should have matching extensions for image types', () => {
    expect(ALLOWED_FILE_TYPES.IMAGE.extensions).toContain('jpg');
    expect(ALLOWED_FILE_TYPES.IMAGE.extensions).toContain('png');
    expect(ALLOWED_FILE_TYPES.IMAGE.extensions).toContain('webp');
  });
});
