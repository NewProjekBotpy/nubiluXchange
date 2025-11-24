import { Router, Request, Response } from 'express';
import { newsController } from '../controllers/NewsController';
import { requireAdmin } from '../middleware/authorization';
import { storage } from '../storage';
import { logError } from '../utils/logger';

const router = Router();

// Public news routes
router.get('/news/daily', newsController.getDailyNews);
router.get('/news/:id', newsController.getNewsById);
router.post('/news', requireAdmin, newsController.createNews);
router.put('/news/:id', requireAdmin, newsController.updateNews);
router.delete('/news/:id', requireAdmin, newsController.deleteNews);

// Admin news management routes
router.get('/admin/content/news', requireAdmin, newsController.getAllNews);
router.post('/admin/content/news', requireAdmin, newsController.createNews);
router.patch('/admin/content/news/:id', requireAdmin, newsController.updateNews);
router.delete('/admin/content/news/:id', requireAdmin, newsController.deleteNews);

// Content moderation route (admin only)
router.patch('/admin/content/:type/:id/moderate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params;
    const moderationData = req.body;
    const itemId = parseInt(id);

    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    let result;
    switch (type) {
      case 'products':
        result = await storage.moderateProduct(itemId, moderationData);
        break;
      case 'status':
        result = await storage.moderateStatusUpdate(itemId, moderationData);
        break;
      case 'news':
        result = await storage.moderateNews(itemId, moderationData);
        break;
      default:
        return res.status(400).json({ error: 'Invalid content type' });
    }

    if (!result) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json(result);
  } catch (error) {
    logError(error as Error, 'Moderate content error:');
    res.status(500).json({ error: 'Failed to moderate content' });
  }
});

export default router;
