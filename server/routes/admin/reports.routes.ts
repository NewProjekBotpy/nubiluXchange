import { Router, Request, Response } from 'express';
import { storage } from '../../storage';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/authorization';
import { logError } from '../../utils/logger';

const router = Router();

// Get all user reports
router.get('/user-reports', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const reports = await storage.getUserReports();
    res.json(reports);
  } catch (error: any) {
    logError(error as Error, 'Get user reports error:');
    res.status(500).json({ error: 'Failed to fetch user reports' });
  }
});

// Review user report
router.post('/user-reports/:id/review', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);
    const { status, adminNotes, actionTaken } = req.body;
    
    if (isNaN(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }
    
    if (!status || !['pending', 'investigating', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const updated = await storage.updateUserReport(reportId, {
      status,
      adminNotes,
      actionTaken,
      reviewedBy: req.user!.id,
      reviewedAt: new Date(),
      isResolved: status === 'resolved' || status === 'dismissed'
    });
    
    if (!updated) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json({ message: 'User report reviewed successfully', report: updated });
  } catch (error: any) {
    logError(error as Error, 'Review user report error:');
    res.status(500).json({ error: 'Failed to review user report' });
  }
});

// Get export jobs
router.get('/export/jobs', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    res.json({
      jobs: []
    });
  } catch (error: any) {
    logError(error as Error, 'Export jobs error:');
    res.status(500).json({ error: 'Failed to fetch export jobs' });
  }
});

export default router;
