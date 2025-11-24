import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import { storage } from "../storage";
import { ErrorHandlers, logError } from "../utils/error-handler";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      user?: {
        id: number;
        username: string;
        email: string;
        role: string;
      };
    }
  }
}

// ⚠️ SECURITY WARNING FOR DEVELOPERS ⚠️
// NEVER commit files containing authentication cookies, tokens, or credentials!
// Examples of files to NEVER commit:
// - *cookies*.txt, *_cookies.txt, admin_cookies.txt, fresh_cookies.txt
// - *auth*.txt, *token*.txt, *credential*.txt, *secret*.txt
// - .env files with real credentials, *.dump files
//
// If you accidentally commit credential files:
// 1. Delete them immediately: `git rm filename.txt`
// 2. Rotate all affected secrets (JWT_SECRET, SESSION_SECRET, API keys)
// 3. Invalidate all active sessions/tokens
// 4. Update .gitignore to prevent recurrence
// See SECURITY_DEVELOPER_GUIDE.md for complete security protocols
// ⚠️ END SECURITY WARNING ⚠️

// Auth middleware with cookie-based JWT validation
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  let decoded: any = null;
  
  try {
    // Read token from httpOnly cookie instead of Authorization header
    const token = req.cookies.auth_token;
    
    if (!token) {
      return ErrorHandlers.tokenRequired(res);
    }

    decoded = verifyToken(token);
    
    if (!decoded) {
      return ErrorHandlers.tokenInvalid(res);
    }

    // Enhanced session validation for security
    // If session exists but doesn't match JWT, clear the session but allow valid JWT to proceed
    const sessionUserId = (req.session as any)?.userId;
    if (sessionUserId && sessionUserId !== decoded.id) {
      // Log security event
      logError(
        new Error(`Session mismatch detected: JWT userId=${decoded.id}, Session userId=${sessionUserId}. Clearing session but allowing valid JWT.`),
        'Session security check',
        decoded.id
      );
      
      // Clear mismatched session but continue with valid JWT
      req.session.destroy((err) => {
        if (err) logError(err, 'Session destruction error in requireAuth');
      });
      
      // Continue processing with valid JWT instead of rejecting
    }

    // Get fresh user data from database
    const user = await storage.getUser(decoded.id);
    if (!user) {
      return ErrorHandlers.userNotFound(res);
    }

    req.userId = user.id;
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    next();
  } catch (error) {
    logError(error, 'Auth middleware', decoded?.id);
    return ErrorHandlers.authenticationFailed(res);
  }
};

// Optional auth middleware (doesn't fail if no token) - now uses cookies
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Read token from httpOnly cookie instead of Authorization header
    const token = req.cookies.auth_token;
    
    if (token) {
      const decoded = verifyToken(token);
      
      if (decoded) {
        // Additional session validation for extra security
        const sessionUserId = (req.session as any)?.userId;
        if (!sessionUserId || sessionUserId === decoded.id) {
          const user = await storage.getUser(decoded.id);
          if (user) {
            req.userId = user.id;
            req.user = {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role
            };
          }
        }
      }
    }
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};