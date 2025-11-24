import { Router, Request, Response } from "express";
import { PaymentService } from "../services/PaymentService";
import { requireAuth } from "../middleware/auth";
import { validate, sanitizeInput, rateLimit } from "../middleware/validation";
import { handleError, ErrorHandlers } from "../utils/error-handler";
import { validateMidtransConfig } from "../utils/midtrans-config";
import { midtransChargeSchema, midtransWebhookSchema, orderIdParamSchema, paginationQuerySchema } from "@shared/schema";
import { logError, logWarning, logInfo, logDebug } from "../utils/logger";

export const paymentController = Router();

// Payment service status endpoint
paymentController.get('/status', 
  async (req: Request, res: Response) => {
    try {
      const validation = validateMidtransConfig();
      const isAvailable = validation.isValid && validation.config !== undefined;
      
      res.json({
        available: isAvailable,
        services: {
          midtrans: isAvailable,
          payment_methods: isAvailable ? ['qris', 'gopay', 'shopeepay'] : []
        },
        environment: process.env.NODE_ENV || 'development',
        message: isAvailable 
          ? 'Payment service is ready' 
          : 'Payment service requires configuration',
        errors: validation.errors,
        warnings: validation.warnings
      });
    } catch (error: any) {
      handleError(res, error, 'get payment service status');
    }
  }
);

// Create Midtrans payment
paymentController.post('/midtrans/charge', 
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10, message: 'Too many payment attempts. Please try again later.' }),
  sanitizeInput(),
  validate({ body: midtransChargeSchema }),
  async (req: Request, res: Response) => {
    try {
      const paymentData = req.validatedData!.body;
      
      // Amount validation is handled in service layer (single source of truth)
      const result = await PaymentService.createMidtransPayment(paymentData, req.userId!, req);
      res.status(201).json({
        ...result,
        message: 'Payment created successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      handleError(res, error, 'create Midtrans payment');
    }
  }
);

// Midtrans webhook handler
paymentController.post('/midtrans/webhook', 
  validate({ body: midtransWebhookSchema }),
  async (req: Request, res: Response) => {
    try {
      const webhookData = req.validatedData!.body;
      const updatedTransaction = await PaymentService.handleMidtransWebhook(webhookData, req);
      res.json({
        message: 'Webhook processed successfully',
        transaction: updatedTransaction,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      // Special handling for webhook errors (they should return 200 to prevent retries for invalid requests)
      if (error.message.includes('Webhook signature verification failed') || 
          error.message.includes('Webhook authentication failed') ||
          error.message.includes('not found in database') ||
          error.message.includes('Invalid webhook data format')) {
        logWarning('Webhook rejected', { reason: error.message, operation: 'midtrans_webhook' });
        return res.status(200).json({
          error: 'Webhook rejected',
          reason: error.message,
          timestamp: new Date().toISOString()
        });
      }
      handleError(res, error, 'process Midtrans webhook');
    }
  }
);

// Get payment status
paymentController.get('/:orderId/status', 
  requireAuth,
  validate({ params: orderIdParamSchema }),
  async (req: Request, res: Response) => {
    try {
      const { orderId } = req.validatedData!.params;
      const transaction = await PaymentService.getPaymentStatus(orderId, req.userId!);
      res.json(transaction);
    } catch (error: any) {
      handleError(res, error, 'Get payment status');
    }
  }
);

// Get user transactions
paymentController.get('/transactions', 
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const transactions = await PaymentService.getUserTransactions(req.userId!);
      res.json(transactions);
    } catch (error: any) {
      handleError(res, error, 'Get user transactions');
    }
  }
);

// Get wallet balance
paymentController.get('/wallet/balance', requireAuth, async (req: Request, res: Response) => {
  try {
    const balance = await PaymentService.getUserWalletBalance(req.userId!);
    res.json({ balance });
  } catch (error: any) {
    handleError(res, error, 'Get wallet balance');
  }
});

// Get wallet transactions
paymentController.get('/wallet/transactions', 
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const transactions = await PaymentService.getUserWalletTransactions(req.userId!);
      res.json(transactions);
    } catch (error: any) {
      handleError(res, error, 'Get wallet transactions');
    }
  }
);

// Get wallet notification flag
paymentController.get('/wallet/notifications', 
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const hasNotifications = await PaymentService.getUserWalletNotificationFlag(req.userId!);
      res.json(hasNotifications);
    } catch (error: any) {
      handleError(res, error, 'Get wallet notifications');
    }
  }
);