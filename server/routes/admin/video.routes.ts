import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/authorization';
import { storage } from '../../storage';
import { db } from '../../db';
import { videoContent } from '@shared/schema';
import { logError } from '../../utils/logger';

const router = Router();

// Get all video content (admin)
router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { category, sortBy, search } = req.query;
    
    const filters: any = {};
    if (category && category !== 'all') filters.category = category as string;
    if (sortBy) filters.sortBy = sortBy as 'createdAt' | 'views' | 'likes';
    
    const videoContentList = await storage.getVideoContent(filters);
    
    // Filter by search if provided
    let videos = videoContentList;
    if (search) {
      const searchLower = (search as string).toLowerCase();
      videos = videos.filter((v: any) => 
        v.title.toLowerCase().includes(searchLower) ||
        v.username.toLowerCase().includes(searchLower) ||
        v.displayName.toLowerCase().includes(searchLower)
      );
    }
    
    // Transform data to match frontend expectations - nest user data
    const transformedVideos = videos.map((v: any) => ({
      id: v.id,
      userId: v.userId,
      title: v.title,
      videoUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailUrl,
      images: v.images,
      contentType: v.contentType,
      musicName: v.musicName,
      musicUrl: v.musicUrl,
      tags: v.tags,
      category: v.category,
      isPublic: v.isPublic,
      isPinned: v.isPinned,
      likes: v.likes,
      comments: v.comments,
      shares: v.shares,
      saves: v.saves,
      views: v.views,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      user: {
        id: v.userId,
        username: v.username,
        displayName: v.displayName,
        profilePicture: v.profilePicture
      }
    }));
    
    res.json({
      videos: transformedVideos,
      total: transformedVideos.length
    });
  } catch (error: any) {
    logError(error as Error, 'Get admin video content error:');
    res.status(500).json({ error: 'Failed to fetch video content' });
  }
});

// Admin update video content (bypasses ownership check)
router.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const videoId = parseInt(req.params.id);
    
    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }
    
    // Admin can update any video, no ownership check
    const video = await storage.getVideoContentById(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video content not found' });
    }
    
    const updated = await storage.updateVideoContent(videoId, req.body);
    res.json(updated);
  } catch (error: any) {
    logError(error as Error, 'Admin update video content error:');
    res.status(500).json({ error: 'Failed to update video content' });
  }
});

// Admin delete video content (bypasses ownership check)
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const videoId = parseInt(req.params.id);
    
    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }
    
    // Admin can delete any video, bypass ownership check
    // Delete directly without ownership check
    await db.delete(videoContent).where(eq(videoContent.id, videoId));
    
    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error: any) {
    logError(error as Error, 'Admin delete video content error:');
    res.status(500).json({ error: 'Failed to delete video content' });
  }
});

export default router;
