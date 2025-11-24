/**
 * Unit Tests: File Upload
 * Tests for file upload configurations and filters
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upload, uploadMemory, uploadDir, generateFilename, fileDestination } from '../../server/utils/file-upload';
import path from 'path';

describe('File Upload', () => {
  describe('uploadDir', () => {
    it('should be defined', () => {
      expect(uploadDir).toBeDefined();
      expect(typeof uploadDir).toBe('string');
    });

    it('should point to chat-files directory', () => {
      expect(uploadDir).toContain('chat-files');
      expect(uploadDir).toContain('uploads');
    });

    it('should be an absolute path', () => {
      expect(path.isAbsolute(uploadDir)).toBe(true);
    });
  });

  describe('upload (disk storage)', () => {
    it('should be a multer instance', () => {
      expect(upload).toBeDefined();
      expect(upload.single).toBeDefined();
      expect(upload.array).toBeDefined();
      expect(upload.fields).toBeDefined();
    });

    it('should have file size limit of 10MB', () => {
      const limits = (upload as any).limits;
      expect(limits).toBeDefined();
      expect(limits.fileSize).toBe(10 * 1024 * 1024);
    });
  });

  describe('uploadMemory (memory storage)', () => {
    it('should be a multer instance', () => {
      expect(uploadMemory).toBeDefined();
      expect(uploadMemory.single).toBeDefined();
      expect(uploadMemory.array).toBeDefined();
      expect(uploadMemory.fields).toBeDefined();
    });

    it('should have file size limit of 5MB', () => {
      const limits = (uploadMemory as any).limits;
      expect(limits).toBeDefined();
      expect(limits.fileSize).toBe(5 * 1024 * 1024);
    });

    it('should have files limit of 5', () => {
      const limits = (uploadMemory as any).limits;
      expect(limits.files).toBe(5);
    });
  });

  describe('file filter for disk storage', () => {
    let fileFilter: any;

    beforeEach(() => {
      fileFilter = (upload as any).fileFilter;
    });

    it('should accept image files', () => {
      const imageTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp'
      ];

      imageTypes.forEach(mimetype => {
        const cb = vi.fn();
        const file = { mimetype, originalname: 'test.jpg' };
        
        fileFilter({}, file, cb);
        
        expect(cb).toHaveBeenCalledWith(null, true);
      });
    });

    it('should accept document files', () => {
      const docTypes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      docTypes.forEach(mimetype => {
        const cb = vi.fn();
        const file = { mimetype, originalname: 'test.pdf' };
        
        fileFilter({}, file, cb);
        
        expect(cb).toHaveBeenCalledWith(null, true);
      });
    });

    it('should accept archive files', () => {
      const archiveTypes = [
        'application/zip',
        'application/x-zip-compressed'
      ];

      archiveTypes.forEach(mimetype => {
        const cb = vi.fn();
        const file = { mimetype, originalname: 'test.zip' };
        
        fileFilter({}, file, cb);
        
        expect(cb).toHaveBeenCalledWith(null, true);
      });
    });

    it('should reject unsupported file types', () => {
      const unsupportedTypes = [
        'application/javascript',
        'text/html',
        'application/octet-stream',
        'video/mp4'
      ];

      unsupportedTypes.forEach(mimetype => {
        const cb = vi.fn();
        const file = { mimetype, originalname: 'test.exe' };
        
        fileFilter({}, file, cb);
        
        expect(cb).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Invalid file type')
          }),
          false
        );
      });
    });
  });

  describe('file filter for memory storage (images only)', () => {
    let imageFileFilter: any;

    beforeEach(() => {
      imageFileFilter = (uploadMemory as any).fileFilter;
    });

    it('should accept image files only', () => {
      const imageTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp'
      ];

      imageTypes.forEach(mimetype => {
        const cb = vi.fn();
        const file = { mimetype, originalname: 'test.jpg' };
        
        imageFileFilter({}, file, cb);
        
        expect(cb).toHaveBeenCalledWith(null, true);
      });
    });

    it('should reject non-image files', () => {
      const nonImageTypes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/zip',
        'video/mp4'
      ];

      nonImageTypes.forEach(mimetype => {
        const cb = vi.fn();
        const file = { mimetype, originalname: 'test.pdf' };
        
        imageFileFilter({}, file, cb);
        
        expect(cb).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Invalid file type')
          }),
          false
        );
      });
    });
  });

  describe('filename generation', () => {
    it('should generate unique filenames', () => {
      const filenames = new Set();

      for (let i = 0; i < 10; i++) {
        const cb = vi.fn();
        const file = { originalname: 'test.jpg' };
        
        generateFilename({}, file, cb);
        
        const generatedFilename = cb.mock.calls[0][1];
        filenames.add(generatedFilename);
      }

      expect(filenames.size).toBe(10);
    });

    it('should preserve file extension', () => {
      const extensions = ['.jpg', '.png', '.pdf', '.txt', '.zip'];

      extensions.forEach(ext => {
        const cb = vi.fn();
        const file = { originalname: `test${ext}` };
        
        generateFilename({}, file, cb);
        
        const generatedFilename = cb.mock.calls[0][1];
        expect(generatedFilename).toMatch(new RegExp(`\\${ext}$`));
      });
    });

    it('should handle uppercase extensions', () => {
      const cb = vi.fn();
      const file = { originalname: 'TEST.JPG' };
      
      generateFilename({}, file, cb);
      
      const generatedFilename = cb.mock.calls[0][1];
      expect(generatedFilename).toMatch(/\.jpg$/);
    });

    it('should reject invalid file extensions', () => {
      const invalidExtensions = ['.exe', '.bat', '.sh', '.js', '.html'];

      invalidExtensions.forEach(ext => {
        const cb = vi.fn();
        const file = { originalname: `test${ext}` };
        
        generateFilename({}, file, cb);
        
        expect(cb).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Invalid file extension'
          }),
          ''
        );
      });
    });

    it('should include timestamp in filename', () => {
      const cb = vi.fn();
      const file = { originalname: 'test.jpg' };
      
      const beforeTime = Date.now();
      generateFilename({}, file, cb);
      const afterTime = Date.now();
      
      const generatedFilename = cb.mock.calls[0][1];
      const timestamp = parseInt(generatedFilename.split('_')[0]);
      
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should include random suffix in filename', () => {
      const cb = vi.fn();
      const file = { originalname: 'test.jpg' };
      
      generateFilename({}, file, cb);
      
      const generatedFilename = cb.mock.calls[0][1];
      const parts = generatedFilename.split('_');
      
      expect(parts).toHaveLength(2);
      expect(parts[1]).toMatch(/^\d+\.jpg$/);
    });
  });

  describe('destination', () => {
    it('should use uploadDir as destination', () => {
      const cb = vi.fn();
      
      fileDestination({}, {}, cb);
      
      expect(cb).toHaveBeenCalledWith(null, uploadDir);
    });
  });
});
