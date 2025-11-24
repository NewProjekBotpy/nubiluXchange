import { Router, Request, Response } from 'express';
import { captureError, captureMessage } from './sentry';

const router = Router();

// Test endpoint to verify Sentry integration
router.post('/test-sentry-error', (req: Request, res: Response) => {
  try {
    // Intentionally throw an error to test Sentry
    const error = new Error('Test Sentry Error - Integration Working!');
    error.stack = `Test Error Stack Trace:
    at /server/test-sentry.ts:10:19
    at testSentryIntegration (test-sentry.ts:15:12)`;
    
    // Capture with context
    captureError(error, {
      test: true,
      endpoint: '/api/test/sentry/error',
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString(),
    });

    res.json({ 
      success: true, 
      message: 'Sentry error test sent successfully! Check your Sentry dashboard.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send test error to Sentry',
      error: error.message 
    });
  }
});

// Test endpoint for Sentry messages
router.post('/test-sentry-message', (req: Request, res: Response) => {
  try {
    const { level = 'info', message = 'Test Sentry Message from NubiluXchange' } = req.body;
    
    captureMessage(message, level as 'info' | 'warning' | 'error', {
      test: true,
      endpoint: '/api/test/sentry/message',
      userId: req.user?.id || 'anonymous',
      requestBody: req.body,
      timestamp: new Date().toISOString(),
    });

    res.json({ 
      success: true, 
      message: `Sentry ${level} message sent successfully! Check your Sentry dashboard.`,
      sentMessage: message,
      level,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send test message to Sentry',
      error: error.message 
    });
  }
});

export default router;