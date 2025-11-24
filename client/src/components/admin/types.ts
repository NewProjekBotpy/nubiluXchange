import { LucideIcon } from "lucide-react";

export interface AdminStats {
  totalUsers: number;
  totalAdmins: number;
  totalOwners: number;
  pendingAdminRequests: number;
  totalProducts: number;
  activeProducts: number;
  totalTransactions?: number;
  totalRevenue?: number;
  totalEscrow?: number;
  pendingEscrow?: number;
  dailyStats?: {
    newUsers: number;
    newProducts: number;
    newTransactions: number;
  };
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'owner';
  walletBalance: string;
  createdAt: string;
  isVerified: boolean;
  isAdminApproved?: boolean;
  adminRequestPending?: boolean;
  lastLogin?: string;
  profilePicture?: string;
}

export interface AdminRequest {
  id: number;
  userId: number;
  requestType: string;
  status: string;
  createdAt: string;
  user?: AdminUser;
}

export interface ActivityLog {
  id: number;
  userId: number;
  action: string;
  category: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
  user?: AdminUser;
}

export interface UserFilters {
  role: 'all' | 'user' | 'admin' | 'owner';
  verificationStatus: 'all' | 'verified' | 'unverified';
  adminStatus: 'all' | 'pending' | 'approved' | 'none';
  walletRange: 'all' | 'empty' | 'low' | 'medium' | 'high';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export interface AISettings {
  isActive: boolean;
  posterGeneration: boolean;
  chatModeration: boolean;
  autoFraudDetection: boolean;
  responseTime: 'fast' | 'balanced' | 'quality';
}

export interface DeleteConfirmation {
  type: 'user' | 'product' | 'request';
  id: number;
  name: string;
}

export interface BulkActionResult {
  userId: number;
  error?: string;
}

export interface KPIItem {
  title: string;
  value: number | string;
  icon: LucideIcon;
  iconColor: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  action?: () => void;
}

export interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number | boolean;
  content: React.ReactNode;
}

export type SortField = 'username' | 'email' | 'role' | 'walletBalance' | 'createdAt';
export type SortOrder = 'asc' | 'desc';
