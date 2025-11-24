import { Router, Request, Response } from "express";
import { UserService } from "../services/UserService";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/authorization";
import { validate, sanitizeInput } from "../middleware/validation";
import { handleError, ErrorHandlers } from "../utils/error-handler";
import { idParamSchema, userUpdateSchema, roleUpdateSchema, adminRequestSchema, securitySettingsSchema } from "@shared/schema";

export const userController = Router();

// Get user profile
userController.get('/profile/:id', 
  optionalAuth,
  validate({ params: idParamSchema }),
  async (req: Request, res: Response) => {
    try {
      const { id: userId } = req.validatedData!.params;
      const currentUserId = req.userId;
      
      const userProfile = await UserService.getUserProfile(userId, currentUserId);
      res.json(userProfile);
    } catch (error: any) {
      handleError(res, error, 'Get user profile');
    }
  }
);

// Update user profile
userController.put('/profile', 
  requireAuth,
  sanitizeInput(),
  validate({ body: userUpdateSchema }),
  async (req: Request, res: Response) => {
    try {
      const updatedUser = await UserService.updateUserProfile(req.userId!, req.validatedData!.body, req);
      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error: any) {
      handleError(res, error, 'Update user profile');
    }
  }
);

// Update security settings (password, email, phone number)
userController.put('/security',
  requireAuth,
  sanitizeInput(),
  validate({ body: securitySettingsSchema }),
  async (req: Request, res: Response) => {
    try {
      const updatedUser = await UserService.updateSecuritySettings(req.userId!, req.validatedData!.body, req);
      res.json({
        message: 'Security settings updated successfully',
        user: updatedUser
      });
    } catch (error: any) {
      handleError(res, error, 'Update security settings');
    }
  }
);

// Switch user role
userController.post('/switch-role', 
  requireAuth,
  sanitizeInput(),
  validate({ body: roleUpdateSchema }),
  async (req: Request, res: Response) => {
    try {
      const { role } = req.validatedData!.body;
      
      const updatedUser = await UserService.switchUserRole(req.userId!, role, req);
      res.json({
        message: 'Role updated successfully',
        user: updatedUser
      });
    } catch (error: any) {
      handleError(res, error, 'Switch user role');
    }
  }
);

// Get wallet information
userController.get('/wallet', requireAuth, async (req: Request, res: Response) => {
  try {
    const walletInfo = await UserService.getUserWalletInfo(req.userId!);
    res.json(walletInfo);
  } catch (error: any) {
    handleError(res, error, 'Get wallet information');
  }
});

// Request admin role
userController.post('/request-admin', 
  requireAuth,
  sanitizeInput(),
  validate({ body: adminRequestSchema }),
  async (req: Request, res: Response) => {
    try {
      const { reason } = req.validatedData!.body;
      
      const result = await UserService.requestAdminRole(req.userId!, reason, req);
      res.json(result);
    } catch (error: any) {
      handleError(res, error, 'Request admin role');
    }
  }
);

// Get all users (admin only)
userController.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await UserService.getAllUsers();
    res.json(users);
  } catch (error: any) {
    handleError(res, error, 'Get all users');
  }
});

// Get pending admin requests (admin only)
userController.get('/admin-requests', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const pendingRequests = await UserService.getPendingAdminRequests();
    res.json(pendingRequests);
  } catch (error: any) {
    handleError(res, error, 'Get admin requests');
  }
});