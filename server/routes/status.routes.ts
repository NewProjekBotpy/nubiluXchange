import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { storage } from '../storage';
import { logError, logInfo } from '../utils/logger';

const router = Router();

// Get all active status updates (public - anyone can view)
router.get('/status', async (req: Request, res: Response) => {
  try {
    const statusUpdates = await storage.getActiveStatusUpdates();
    logInfo(`📊 Retrieved ${statusUpdates.length} active status updates`);
    res.json(statusUpdates);
  } catch (error: any) {
    logError(error as Error, 'Get active status updates error:');
    res.status(500).json({ error: 'Failed to retrieve status updates' });
  }
});

// Get status updates for current user
router.get('/status/mine', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const statusUpdates = await storage.getUserStatusUpdates(userId);
    logInfo(`📊 Retrieved ${statusUpdates.length} status updates for user ${userId}`);
    res.json(statusUpdates);
  } catch (error: any) {
    logError(error as Error, 'Get user status updates error:');
    res.status(500).json({ error: 'Failed to retrieve your status updates' });
  }
});

// Get status IDs that current user has viewed
router.get('/status/my-views', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const viewedStatusIds = await storage.getUserStatusViews(userId);
    res.json({ viewedStatusIds }); // Client expects 'viewedStatusIds' field
  } catch (error: any) {
    logError(error as Error, 'Get user status views error:');
    res.status(500).json({ error: 'Failed to retrieve viewed status' });
  }
});

// Record a view for a status
router.post('/status/:statusId/view', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const statusId = parseInt(req.params.statusId);
    
    if (isNaN(statusId)) {
      return res.status(400).json({ error: 'Invalid status ID' });
    }
    
    await storage.recordStatusView(statusId, userId);
    logInfo(`👁️  User ${userId} viewed status ${statusId}`);
    res.json({ success: true, message: 'View recorded' });
  } catch (error: any) {
    logError(error as Error, 'Record status view error:');
    res.status(500).json({ error: 'Failed to record view' });
  }
});

// Get viewers for a specific status
router.get('/status/:statusId/views', requireAuth, async (req: Request, res: Response) => {
  try {
    const statusId = parseInt(req.params.statusId);
    
    if (isNaN(statusId)) {
      return res.status(400).json({ error: 'Invalid status ID' });
    }
    
    const viewers = await storage.getStatusViews(statusId);
    res.json(viewers);
  } catch (error: any) {
    logError(error as Error, 'Get status viewers error:');
    res.status(500).json({ error: 'Failed to retrieve viewers' });
  }
});

// Delete a status update
router.delete('/status/:statusId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const statusId = parseInt(req.params.statusId);
    
    if (isNaN(statusId)) {
      return res.status(400).json({ error: 'Invalid status ID' });
    }
    
    const success = await storage.deleteStatusUpdate(statusId, userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Status not found or you do not have permission to delete it' });
    }
    
    logInfo(`🗑️  User ${userId} deleted status ${statusId}`);
    res.json({ success: true, message: 'Status deleted successfully' });
  } catch (error: any) {
    logError(error as Error, 'Delete status error:');
    res.status(500).json({ error: 'Failed to delete status' });
  }
});

// Create a new status update
router.post('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const statusData = req.body;
    
    // Set default expiry time (24 hours from now) if not provided
    if (!statusData.expiresAt) {
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24);
      statusData.expiresAt = expiryDate;
    }
    
    // Create status update
    const newStatus = await storage.createStatusUpdate({
      userId,
      ...statusData,
    });
    
    logInfo(`✨ User ${userId} created new status ${newStatus.id}`);
    res.status(201).json(newStatus);
  } catch (error: any) {
    logError(error as Error, 'Create status error:');
    res.status(500).json({ error: 'Failed to create status' });
  }
});

export default router;
