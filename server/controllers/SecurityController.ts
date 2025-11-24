import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/authorization";
import { handleError } from "../utils/error-handler";
import { SecurityAlertService } from "../services/SecurityAlertService";
import { AdvancedVerificationService } from "../services/AdvancedVerificationService";
import { validate } from "../middleware/validation";
import { z } from "zod";
import { AdminRepository } from "../repositories/AdminRepository";

export const securityController = Router();

// Get security metrics for admin dashboard
securityController.get('/metrics',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const metrics = await SecurityAlertService.getSecurityMetrics();
      res.json(metrics);
    } catch (error: any) {
      handleError(res, error, 'Get security metrics');
    }
  }
);

// Get active security alerts
securityController.get('/alerts',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // Get real security alerts from repository
      const adminRepository = new AdminRepository();
      const allAlerts = await adminRepository.getActiveSecurityAlerts();
      
      // Transform to match frontend interface
      const alerts = allAlerts.map(alert => ({
        id: alert.id!,
        type: alert.type,
        severity: alert.severity,
        description: alert.description,
        status: alert.status,
        detectedAt: alert.detectedAt?.toISOString() || new Date().toISOString(),
        userId: alert.userId,
        ipAddress: alert.ipAddress
      }));
      
      res.json(alerts);
    } catch (error: any) {
      handleError(res, error, 'Get security alerts');
    }
  }
);

// Resolve security alert
securityController.patch('/alerts/:id/resolve',
  requireAuth,
  requireAdmin,
  validate({ 
    params: z.object({ id: z.string().transform(Number) }),
    body: z.object({
      status: z.enum(['resolved', 'false_positive']),
      notes: z.string().optional()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.validatedData!.params;
      const { status, notes } = req.validatedData!.body;
      
      await SecurityAlertService.resolveAlert(id, req.userId!, status, notes);
      
      res.json({
        success: true,
        message: `Alert ${status} successfully`
      });
    } catch (error: any) {
      handleError(res, error, 'Resolve security alert');
    }
  }
);

// Get verification statistics
securityController.get('/verification/stats',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const stats = await AdvancedVerificationService.getVerificationAnalytics();
      res.json(stats);
    } catch (error: any) {
      handleError(res, error, 'Get verification stats');
    }
  }
);

// Start verification session for user
securityController.post('/verification/start',
  requireAuth,
  validate({
    body: z.object({
      userId: z.number(),
      type: z.enum(['basic', 'enhanced', 'business'])
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { userId, type } = req.validatedData!.body;
      
      const session = await AdvancedVerificationService.startVerificationSession(
        userId,
        type,
        req
      );
      
      res.json(session);
    } catch (error: any) {
      handleError(res, error, 'Start verification session');
    }
  }
);

// Upload verification document
securityController.post('/verification/upload',
  requireAuth,
  validate({
    body: z.object({
      userId: z.number(),
      documentType: z.enum(['id_card', 'passport', 'driver_license', 'selfie', 'proof_of_address']),
      imageUrl: z.string().url(),
      metadata: z.record(z.any()).optional()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { userId, documentType, imageUrl, metadata } = req.validatedData!.body;
      
      const document = await AdvancedVerificationService.uploadVerificationDocument(
        userId,
        documentType,
        imageUrl,
        metadata || {},
        req
      );
      
      res.json(document);
    } catch (error: any) {
      handleError(res, error, 'Upload verification document');
    }
  }
);

// Review verification document (admin only)
securityController.patch('/verification/documents/:id/review',
  requireAuth,
  requireAdmin,
  validate({
    params: z.object({ id: z.string().transform(Number) }),
    body: z.object({
      status: z.enum(['approved', 'rejected']),
      rejectionReason: z.string().optional()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.validatedData!.params;
      const { status, rejectionReason } = req.validatedData!.body;
      
      await AdvancedVerificationService.reviewDocument(
        id,
        req.userId!,
        status,
        rejectionReason,
        req
      );
      
      res.json({
        success: true,
        message: `Document ${status} successfully`
      });
    } catch (error: any) {
      handleError(res, error, 'Review verification document');
    }
  }
);

// Get user verification status
securityController.get('/verification/status/:userId',
  requireAuth,
  requireAdmin,
  validate({
    params: z.object({ userId: z.string().transform(Number) })
  }),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.validatedData!.params;
      
      const status = await AdvancedVerificationService.getVerificationStatus(userId);
      
      res.json(status);
    } catch (error: any) {
      handleError(res, error, 'Get verification status');
    }
  }
);