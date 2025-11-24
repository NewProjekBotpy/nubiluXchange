import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { storage } from '../storage';
import { logError } from '../utils/logger';

const router = Router();

// Get videos by music/sound name
router.get('/by-music/:musicName', optionalAuth, async (req: Request, res: Response) => {
  try {
    const musicName = req.params.musicName;
    const { limit, offset } = req.query;
    
    const filters: any = {
      musicName,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    };
    
    const result = await storage.getVideoContent(filters);
    res.json(result);
  } catch (error: any) {
    logError(error as Error, 'Get videos by music error:');
    res.status(500).json({ error: 'Failed to fetch videos by music' });
  }
});

// Video Content Comments API routes
router.get('/:videoId/comments', 
  validate({ params: z.object({ videoId: z.coerce.number().int().positive() }) }),
  async (req: Request, res: Response) => {
    try {
      const { videoId } = req.validatedData!.params;
      const filters = {
        limit: Number(req.query.limit) || 20,
        offset: Number(req.query.offset) || 0
      };
      
      const comments = await storage.getVideoContentComments(videoId, filters);
      const count = await storage.getVideoContentCommentCount(videoId);
      
      res.json({
        comments,
        count,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          hasMore: filters.offset + filters.limit < count
        }
      });
    } catch (error: any) {
      logError(error as Error, 'Get video content comments error:');
      res.status(500).json({ 
        error: 'Failed to fetch comments',
        timestamp: new Date().toISOString()
      });
    }
  }
);

router.post('/:videoId/comments',
  requireAuth,
  validate({ 
    params: z.object({ videoId: z.coerce.number().int().positive() }),
    body: z.object({ comment: z.string().min(1).max(500).trim() })
  }),
  async (req: Request, res: Response) => {
    try {
      const { videoId } = req.validatedData!.params;
      const { comment } = req.validatedData!.body;
      
      const newComment = await storage.createVideoContentComment({
        videoId,
        userId: req.userId!,
        comment
      });
      
      res.status(201).json({
        message: 'Comment added successfully',
        comment: newComment
      });
    } catch (error: any) {
      logError(error as Error, 'Create video content comment error:');
      res.status(500).json({ 
        error: 'Failed to add comment',
        timestamp: new Date().toISOString()
      });
    }
  }
);

router.delete('/comments/:commentId',
  requireAuth,
  validate({ params: z.object({ commentId: z.coerce.number().int().positive() }) }),
  async (req: Request, res: Response) => {
    try {
      const { commentId } = req.validatedData!.params;
      
      const deleted = await storage.deleteVideoContentComment(commentId, req.userId!);
      if (!deleted) {
        return res.status(404).json({ 
          error: 'Comment not found or you cannot delete this comment',
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({
        message: 'Comment deleted successfully'
      });
    } catch (error: any) {
      logError(error as Error, 'Delete video content comment error:');
      res.status(500).json({ 
        error: 'Failed to delete comment',
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;
