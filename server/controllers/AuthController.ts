import { Router, Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { requireAuth } from "../middleware/auth";
import { validate, sanitizeInput, rateLimit } from "../middleware/validation";
import { handleError, ErrorHandlers } from "../utils/error-handler";
import { z } from "zod";
import { 
  loginSchema, 
  userRegisterSchema,
  twoFactorSetupSchema,
  twoFactorVerifySchema,
  twoFactorDisableSchema,
  twoFactorLoginSchema,
  twoFactorRegenerateCodesSchema,
  smsSendSchema,
  smsVerifySchema
} from "@shared/schema";

export const authController = Router();

// User registration with proper validation
authController.post('/register',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5, message: 'Too many registration attempts. Please try again later.' }),
  sanitizeInput(),
  validate({ body: userRegisterSchema }),
  async (req: Request, res: Response) => {
    try {
      const result = await AuthService.register(req.validatedData!.body, req, res);
      res.status(201).json(result);
    } catch (error: any) {
      handleError(res, error, 'User registration');
    }
  }
);

// User login with proper validation
authController.post('/login', 
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10, message: 'Too many login attempts. Please try again later.' }),
  sanitizeInput(),
  validate({ body: loginSchema }),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.validatedData!.body;
      
      const result = await AuthService.login(email, password, req, res);
      res.json(result);
    } catch (error: any) {
      handleError(res, error, 'User login');
    }
  }
);

// User logout
authController.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await AuthService.logout(req.userId!, req, res);
    res.json(result);
  } catch (error: any) {
    handleError(res, error, 'User logout');
  }
});

// Get current user
authController.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await AuthService.getCurrentUser(req.userId!);
    res.json(user);
  } catch (error: any) {
    handleError(res, error, 'Get current user');
  }
});

// ===== 2FA ROUTES =====

// 2FA Setup - Generate temporary secret and QR code
authController.post('/2fa/setup', 
  requireAuth,
  sanitizeInput(),
  validate({ body: twoFactorSetupSchema }),
  async (req: Request, res: Response) => {
    try {
      const result = await AuthService.setupTwoFactor(req.userId!, req);
      res.json(result);
    } catch (error: any) {
      handleError(res, error, '2FA setup');
    }
  }
);

// 2FA Verify - Verify token and enable 2FA
authController.post('/2fa/verify',
  requireAuth,
  sanitizeInput(),
  validate({ body: twoFactorVerifySchema }),
  async (req: Request, res: Response) => {
    try {
      const { token } = req.validatedData!.body;
      const result = await AuthService.verifyTwoFactor(req.userId!, token, req);
      res.json(result);
    } catch (error: any) {
      handleError(res, error, '2FA verification');
    }
  }
);

// 2FA Disable - Disable 2FA with password verification
authController.post('/2fa/disable',
  requireAuth,
  sanitizeInput(),
  validate({ body: twoFactorDisableSchema }),
  async (req: Request, res: Response) => {
    try {
      const { password } = req.validatedData!.body;
      const result = await AuthService.disableTwoFactor(req.userId!, password, req);
      res.json(result);
    } catch (error: any) {
      handleError(res, error, '2FA disable');
    }
  }
);

// 2FA Regenerate Backup Codes
authController.post('/2fa/regenerate-backup-codes',
  requireAuth,
  sanitizeInput(),
  validate({ body: twoFactorRegenerateCodesSchema }),
  async (req: Request, res: Response) => {
    try {
      const result = await AuthService.regenerateBackupCodes(req.userId!, req);
      res.json(result);
    } catch (error: any) {
      handleError(res, error, '2FA regenerate backup codes');
    }
  }
);

// 2FA Login - Complete login with 2FA token (rate limited)
authController.post('/login/2fa',
  rateLimit({ windowMs: 60 * 1000, maxRequests: 5, message: 'Too many 2FA verification attempts. Please try again later.' }),
  sanitizeInput(),
  validate({ body: twoFactorLoginSchema }),
  async (req: Request, res: Response) => {
    try {
      const { userId, token, useBackupCode } = req.validatedData!.body;
      const result = await AuthService.loginWithTwoFactor(userId, token!, useBackupCode || false, req, res);
      res.json(result);
    } catch (error: any) {
      handleError(res, error, '2FA login');
    }
  }
);

// ===== SMS 2FA ROUTES =====

// SMS 2FA - Send code (no authentication required - for login flow)
authController.post('/2fa/sms/send',
  rateLimit({ windowMs: 60 * 1000, maxRequests: 3, message: 'Terlalu banyak permintaan kode SMS. Silakan coba lagi dalam 1 menit.' }),
  sanitizeInput(),
  validate({ body: smsSendSchema.extend({ 
    userId: z.number().int().positive('User ID harus berupa integer positif')
  }) }),
  async (req: Request, res: Response) => {
    try {
      const { userId, phoneNumber } = req.validatedData!.body;
      const result = await AuthService.sendSMSCode(userId, phoneNumber, req);
      res.json(result);
    } catch (error: any) {
      handleError(res, error, 'SMS 2FA send');
    }
  }
);

// SMS 2FA - Verify code and complete login (rate limited)
authController.post('/login/2fa/sms',
  rateLimit({ windowMs: 60 * 1000, maxRequests: 5, message: 'Terlalu banyak percobaan verifikasi SMS. Silakan coba lagi dalam 1 menit.' }),
  sanitizeInput(),
  validate({ body: smsVerifySchema.extend({
    userId: z.number().int().positive('User ID harus berupa integer positif')
  }) }),
  async (req: Request, res: Response) => {
    try {
      const { userId, code } = req.validatedData!.body;
      const result = await AuthService.verifySMSCode(userId, code, req, res);
      res.json(result);
    } catch (error: any) {
      handleError(res, error, 'SMS 2FA verify');
    }
  }
);