import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { storage } from '../storage';
import { logError } from '../utils/logger';

const router = Router();

// Toggle repost for a status
router.post('/reposts', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { statusId } = req.body;
    
    if (!statusId || isNaN(statusId)) {
      return res.status(400).json({ error: 'Valid status ID is required' });
    }
    
    // Check if user already reposted this status
    const existingRepost = await storage.getRepost(userId, undefined, statusId);
    
    if (existingRepost) {
      // Delete repost (toggle off)
      await storage.deleteRepost(userId, undefined, statusId);
      return res.json({ isReposted: false, message: 'Repost removed' });
    } else {
      // Create repost (toggle on)
      await storage.createRepost({
        userId,
        statusId,
        productId: null,
      });
      return res.json({ isReposted: true, message: 'Status reposted' });
    }
  } catch (error: any) {
    logError(error as Error, 'Repost status error:');
    res.status(500).json({ error: 'Failed to repost status' });
  }
});

export default router;
