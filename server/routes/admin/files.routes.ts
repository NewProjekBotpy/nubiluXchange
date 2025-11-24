import { Router, Request, Response } from 'express';
import { storage } from '../../storage';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/authorization';
import { logError } from '../../utils/logger';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Get all uploaded files
router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { uploadedBy, category, limit } = req.query;
    
    const filters: { uploadedBy?: number; category?: string; limit?: number } = {};
    
    if (uploadedBy) {
      filters.uploadedBy = parseInt(uploadedBy as string);
    }
    if (category) {
      filters.category = category as string;
    }
    if (limit) {
      filters.limit = parseInt(limit as string);
    }
    
    const files = await storage.getUploadedFiles(filters);
    res.json(files);
  } catch (error: any) {
    logError(error as Error, 'Get files error:');
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Get file statistics
router.get('/stats', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await storage.getUploadedFilesStats();
    res.json(stats);
  } catch (error: any) {
    logError(error as Error, 'Get file stats error:');
    res.status(500).json({ error: 'Failed to fetch file statistics' });
  }
});

// Delete file
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    
    if (isNaN(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }
    
    const file = await storage.getUploadedFile(fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Delete file from database
    const deleted = await storage.deleteUploadedFile(fileId);
    
    if (deleted) {
      // Try to delete physical file (best effort)
      try {
        const filePath = path.join(process.cwd(), 'public', file.url);
        await fs.unlink(filePath);
      } catch (fsError) {
        // Log but don't fail if file doesn't exist physically
        logError(fsError as Error, 'Failed to delete physical file:');
      }
      
      res.json({ success: true, message: 'File deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete file from database' });
    }
  } catch (error: any) {
    logError(error as Error, 'Delete file error:');
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
