import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { storage } from '../storage';
import { logError } from '../utils/logger';

const router = Router();

// Get user activity logs
router.get('/user/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const requesterId = req.userId!;
    
    // Only allow users to view their own activity logs
    if (userId !== requesterId) {
      return res.status(403).json({ error: 'You can only view your own activity logs' });
    }
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const logs = await storage.getActivityLogsByUser(userId);
    res.json(logs);
  } catch (error: any) {
    logError(error as Error, 'Get activity logs error:');
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

export default router;
