import { Router } from 'express';
import { BackupController } from '../../controllers/BackupController';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin, requireOwner } from '../../middleware/authorization';

const router = Router();

// Backup management routes (Owner/Admin only)
router.post('/create', requireAuth, requireOwner, BackupController.createBackup);
router.get('/status', requireAuth, requireAdmin, BackupController.getBackupStatus);
router.get('/config', requireAuth, requireAdmin, BackupController.getBackupConfig);
router.get('/health', requireAuth, requireAdmin, BackupController.testBackupHealth);
router.get('/logs', requireAuth, requireOwner, BackupController.getBackupLogs);

export default router;
