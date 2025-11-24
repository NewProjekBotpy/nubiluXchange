// Shared authentication and authorization utility functions
// Use these helpers consistently across frontend and backend

export interface UserRole {
  role: string;
  isAdminApproved?: boolean | null;
}

/**
 * Check if user has admin access (owner or approved admin)
 * Use this instead of scattered role checks
 * 
 * @param user - User object with role and isAdminApproved
 * @returns true if user is owner OR (admin AND approved)
 */
export function hasAdminAccess(user: UserRole | null | undefined): boolean {
  if (!user) return false;
  
  // Owner always has admin access
  if (user.role === 'owner') return true;
  
  // Admin must be approved
  if (user.role === 'admin' && user.isAdminApproved === true) return true;
  
  return false;
}

/**
 * Check if user has owner access (only owner role)
 * Use this for owner-only features
 * 
 * @param user - User object with role
 * @returns true if user is owner
 */
export function hasOwnerAccess(user: UserRole | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'owner';
}

/**
 * Check if user is a regular user (not admin or owner)
 * 
 * @param user - User object with role
 * @returns true if user is a regular user
 */
export function isRegularUser(user: UserRole | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'user';
}

/**
 * Get user role display name in Bahasa Indonesia
 * 
 * @param user - User object with role
 * @returns Display name for the role
 */
export function getRoleDisplayName(user: UserRole | null | undefined): string {
  if (!user) return 'Tamu';
  
  switch (user.role) {
    case 'owner':
      return 'Pemilik';
    case 'admin':
      return user.isAdminApproved ? 'Administrator' : 'Admin (Menunggu Persetujuan)';
    case 'user':
      return 'Pengguna';
    default:
      return 'Tidak Dikenal';
  }
}

/**
 * Admin status values for consistent usage
 */
export const AdminStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  NONE: 'none'
} as const;

export type AdminStatusType = typeof AdminStatus[keyof typeof AdminStatus];

/**
 * Get admin status for filtering
 * 
 * @param user - User object
 * @returns Admin status string
 */
export function getAdminStatus(user: UserRole | null | undefined): AdminStatusType {
  if (!user) return AdminStatus.NONE;
  
  if (user.role === 'owner') return AdminStatus.APPROVED;
  
  // Check for pending admin request
  if ('adminRequestPending' in user && user.adminRequestPending) {
    return AdminStatus.PENDING;
  }
  
  // Check for approved admin
  if (user.role === 'admin' && user.isAdminApproved) {
    return AdminStatus.APPROVED;
  }
  
  return AdminStatus.NONE;
}
