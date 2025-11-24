import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/authorization';
import { storage } from '../../storage';
import { logError } from '../../utils/logger';

const router = Router();

// Season Management API Routes
router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const seasons = await storage.getAllSeasons();
    res.json(seasons);
  } catch (error: any) {
    logError(error as Error, 'Get seasons error:');
    res.status(500).json({ error: 'Failed to fetch seasons' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const seasonData = {
      ...req.body,
      currentParticipants: 0,
      createdBy: req.userId!
    };
    
    const newSeason = await storage.createSeason(seasonData);
    res.status(201).json(newSeason);
  } catch (error: any) {
    logError(error as Error, 'Create season error:');
    res.status(500).json({ error: 'Failed to create season' });
  }
});

router.patch('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.id);
    const updateData = req.body;
    
    const updated = await storage.updateSeason(seasonId, updateData);
    if (!updated) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    res.json(updated);
  } catch (error: any) {
    logError(error as Error, 'Update season error:');
    res.status(500).json({ error: 'Failed to update season' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.id);
    
    const deleted = await storage.deleteSeason(seasonId);
    if (!deleted) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    res.json({ message: 'Season deleted successfully' });
  } catch (error: any) {
    logError(error as Error, 'Delete season error:');
    res.status(500).json({ error: 'Failed to delete season' });
  }
});

router.patch('/:id/status', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.id);
    const { status } = req.body;
    
    const updated = await storage.updateSeason(seasonId, { status });
    if (!updated) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    res.json({ message: 'Season status updated successfully' });
  } catch (error: any) {
    logError(error as Error, 'Update season status error:');
    res.status(500).json({ error: 'Failed to update season status' });
  }
});

router.get('/:id/participants', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.id);
    
    const participants = await storage.getSeasonParticipants(seasonId);
    res.json(participants);
  } catch (error: any) {
    logError(error as Error, 'Get season participants error:');
    res.status(500).json({ error: 'Failed to fetch season participants' });
  }
});

router.get('/:id/rewards', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.id);
    
    const rewards = await storage.getSeasonRewards(seasonId);
    res.json(rewards);
  } catch (error: any) {
    logError(error as Error, 'Get season rewards error:');
    res.status(500).json({ error: 'Failed to fetch season rewards' });
  }
});

router.post('/rewards', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const rewardData = {
      ...req.body,
      currentClaims: 0,
      isActive: true
    };
    
    const newReward = await storage.createSeasonReward(rewardData);
    res.status(201).json(newReward);
  } catch (error: any) {
    logError(error as Error, 'Create season reward error:');
    res.status(500).json({ error: 'Failed to create season reward' });
  }
});

export default router;
