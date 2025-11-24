import { Router } from 'express';
import { securityController } from '../../controllers/SecurityController';
import { smsAlertRouter } from '../../controllers/SMSAlertController';
import { connectionSecurityRouter } from '../../controllers/ConnectionSecurityController';

const router = Router();

// Security controller routes
router.use('/security', securityController);

// SMS alerts routes
router.use('/sms', smsAlertRouter);

// Connection security routes
router.use('/connection-security', connectionSecurityRouter);

export default router;
