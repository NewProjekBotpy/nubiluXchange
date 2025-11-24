import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { ErrorHandlers, logError } from "../utils/error-handler";

// Admin middleware - checks for admin or owner role
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return ErrorHandlers.tokenRequired(res);
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return ErrorHandlers.userNotFound(res);
    }

    // Owner always has access
    if (user.role === 'owner') {
      return next();
    }

    // Admin must be approved by owner
    if (user.role === 'admin' && user.isAdminApproved) {
      return next();
    }

    return ErrorHandlers.adminRequired(res);
  } catch (error) {
    logError(error, 'Admin middleware', req.user?.id);
    return ErrorHandlers.authenticationFailed(res);
  }
};

// Owner middleware - checks for owner role only
export const requireOwner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return ErrorHandlers.tokenRequired(res);
    }

    const user = await storage.getUser(req.user.id);
    if (!user || user.role !== 'owner') {
      return ErrorHandlers.ownerRequired(res);
    }

    next();
  } catch (error) {
    logError(error, 'Owner middleware', req.user?.id);
    return ErrorHandlers.authenticationFailed(res);
  }
};