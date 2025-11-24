import { Router, Request, Response } from 'express';
import { storage } from '../../storage';
import { db } from '../../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/authorization';
import { logError } from '../../utils/logger';
import { hasOwnerAccess } from '@shared/auth-utils';

const router = Router();

// Get all users
router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const allUsers = await storage.getAllUsers();
    // Remove password field from response
    const safeUsers = allUsers.map(({ password, ...user }) => user);
    res.json(safeUsers);
  } catch (error: any) {
    logError(error as Error, 'Admin get users error:');
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get pending admin requests
router.get('/requests', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const allUsers = await storage.getAllUsers();
    const pendingRequests = allUsers.filter(u => u.adminRequestPending);
    // Remove password field from response
    const safePendingRequests = pendingRequests.map(({ password, ...user }) => user);
    res.json(safePendingRequests);
  } catch (error: any) {
    logError(error as Error, 'Admin get requests error:');
    res.status(500).json({ error: 'Failed to fetch admin requests' });
  }
});

// Approve admin request
router.post('/approve', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    const user = await storage.getUser(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user to approve admin request
    await storage.updateUser(user_id, {
      role: 'admin',
      isAdminApproved: true,
      adminRequestPending: false,
      adminApprovedAt: new Date(),
      approvedByOwnerId: req.user!.id
    });
    
    res.json({ message: 'Admin request approved successfully' });
  } catch (error: any) {
    logError(error as Error, 'Admin approve error:');
    res.status(500).json({ error: 'Failed to approve admin request' });
  }
});

// Deny admin request
router.post('/deny', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    const user = await storage.getUser(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user to deny admin request
    await storage.updateUser(user_id, {
      adminRequestPending: false,
      adminRequestReason: null
    });
    
    res.json({ message: 'Admin request denied successfully' });
  } catch (error: any) {
    logError(error as Error, 'Admin deny error:');
    res.status(500).json({ error: 'Failed to deny admin request' });
  }
});

// Promote user to admin
router.post('/promote', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    const user = await storage.getUser(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Promote user to admin
    await storage.updateUser(user_id, {
      role: 'admin',
      isAdminApproved: true,
      adminApprovedAt: new Date(),
      approvedByOwnerId: req.user!.id
    });
    
    res.json({ message: 'User promoted to admin successfully' });
  } catch (error: any) {
    logError(error as Error, 'Admin promote error:');
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

// Revoke admin access
router.post('/revoke', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    const user = await storage.getUser(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Revoke admin access
    await storage.updateUser(user_id, {
      role: 'user',
      isAdminApproved: false,
      adminApprovedAt: null,
      approvedByOwnerId: null
    });
    
    res.json({ message: 'Admin access revoked successfully' });
  } catch (error: any) {
    logError(error as Error, 'Admin revoke error:');
    res.status(500).json({ error: 'Failed to revoke admin access' });
  }
});

// Verify user
router.post('/verify-user', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    const user = await storage.getUser(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify the user
    await storage.updateUser(user_id, {
      isVerified: true
    });
    
    res.json({ message: 'User verified successfully' });
  } catch (error: any) {
    logError(error as Error, 'Admin verify user error:');
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

// Delete user
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent deleting owner accounts
    if (hasOwnerAccess(user)) {
      return res.status(403).json({ error: 'Cannot delete owner accounts' });
    }
    
    // Delete the user from database
    await db.delete(users).where(eq(users.id, userId));
    
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    logError(error as Error, 'Admin delete user error:');
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
