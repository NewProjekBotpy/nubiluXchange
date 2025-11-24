import { Router } from 'express';
import { MaintenanceController } from '../../controllers/MaintenanceController';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/authorization';

const router = Router();

// System maintenance routes (Admin only)
router.post('/cache/clear', requireAuth, requireAdmin, MaintenanceController.clearCache);
router.post('/cache/cleanup', requireAuth, requireAdmin, MaintenanceController.cleanupCache);
router.get('/cache/stats', requireAuth, requireAdmin, MaintenanceController.getCacheStats);
router.get('/database/stats', requireAuth, requireAdmin, MaintenanceController.getDatabaseStats);
router.post('/database/optimize', requireAuth, requireAdmin, MaintenanceController.optimizeDatabase);
router.get('/logs/stats', requireAuth, requireAdmin, MaintenanceController.getLogStats);
router.post('/logs/cleanup', requireAuth, requireAdmin, MaintenanceController.cleanupLogs);
router.get('/storage/stats', requireAuth, requireAdmin, MaintenanceController.getStorageStats);
router.get('/system/health', requireAuth, requireAdmin, MaintenanceController.getSystemHealth);

export default router;
