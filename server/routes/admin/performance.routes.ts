import { Router } from 'express';
import { PerformanceController } from '../../controllers/PerformanceController';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/authorization';

const router = Router();

// Performance monitoring routes (Admin only)
router.get('/summary', requireAuth, requireAdmin, PerformanceController.getPerformanceSummary);
router.get('/cache', requireAuth, requireAdmin, PerformanceController.getCacheMetrics);
router.get('/jobs', requireAuth, requireAdmin, PerformanceController.getJobQueueStats);
router.get('/jobs/failed', requireAuth, requireAdmin, PerformanceController.getFailedJobs);
router.post('/jobs/retry', requireAuth, requireAdmin, PerformanceController.retryFailedJob);
router.post('/jobs/clear', requireAuth, requireAdmin, PerformanceController.clearCompletedJobs);
router.post('/metrics/reset', requireAuth, requireAdmin, PerformanceController.resetMetrics);
router.post('/cache/invalidate', requireAuth, requireAdmin, PerformanceController.invalidateCache);
router.post('/cache/warm', requireAuth, requireAdmin, PerformanceController.warmCache);
router.get('/health', requireAuth, requireAdmin, PerformanceController.healthCheck);
router.get('/dashboard', requireAuth, requireAdmin, PerformanceController.getDashboard);

// Enhanced performance monitoring routes
router.get('/queries', requireAuth, requireAdmin, PerformanceController.getQueryPerformance);
router.get('/realtime', requireAuth, requireAdmin, PerformanceController.getRealTimeMetrics);
router.get('/trends', requireAuth, requireAdmin, PerformanceController.getPerformanceTrends);
router.get('/health/detailed', requireAuth, requireAdmin, PerformanceController.detailedHealthCheck);

// WebSocket performance routes
router.get('/websocket', requireAuth, requireAdmin, PerformanceController.getWebSocketMetrics);
router.get('/chat', requireAuth, requireAdmin, PerformanceController.getChatMetrics);
router.post('/websocket/reset', requireAuth, requireAdmin, PerformanceController.resetWebSocketMetrics);

// Data cleanup routes
router.get('/cleanup/stats', requireAuth, requireAdmin, PerformanceController.getCleanupStats);
router.post('/cleanup/run', requireAuth, requireAdmin, PerformanceController.runCleanup);

export default router;
