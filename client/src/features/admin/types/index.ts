export interface User {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  role: 'owner' | 'admin' | 'user';
  isVerified: boolean;
  isAdminApproved: boolean;
  adminRequestPending: boolean;
  adminRequestReason?: string;
  adminRequestAt?: string;
  profilePicture?: string;
  walletBalance: string;
  createdAt: string;
  twoFactorEnabled?: boolean;
}

export interface AdminStats {
  totalUsers: number;
  totalAdmins: number;
  totalOwners: number;
  pendingAdminRequests: number;
  recentAdminApprovals: number;
  totalProducts: number;
  activeProducts: number;
  pendingEscrows: number;
  activeEscrows: number;
  completedEscrows: number;
  disputedEscrows: number;
  dailyStats?: {
    newUsers: number;
    newProducts: number;
    completedTransactions: number;
    revenue: number;
  };
  weeklyStats?: {
    userGrowth: number;
    transactionGrowth: number;
    revenueGrowth: number;
  };
  monthlyStats?: {
    totalRevenue: number;
    averageTransactionValue: number;
    topCategories: Array<{ name: string; count: number; value: number }>;
  };
}

export interface ActivityLog {
  id: number;
  userId?: number;
  adminId?: number;
  action: string;
  category: 'user_action' | 'system_action' | 'ai_action';
  details: Record<string, any>;
  status: 'success' | 'error' | 'warning';
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AIAdminSettings {
  isActive: boolean;
  autoRespond: boolean;
  responseDelay: number;
  escrowAutoApproval: boolean;
  fraudDetection: boolean;
  smartPricing: boolean;
  posterGeneration: boolean;
  chatModeration: boolean;
  deepseekModel: string;
  maxTokens: number;
}

export interface UserFilters {
  role: string;
  verificationStatus: string;
  walletRange: string;
  dateRange: string;
  activityStatus: string;
  adminStatus: string;
}

export interface DeleteConfirmation {
  type: string;
  id: number;
  name: string;
}

export interface ActionDialog {
  type: 'promote' | 'revoke';
  user: User;
}

export interface BulkActionDialog {
  type: string;
}

export interface AdminSectionProps {
  hasAdminAccess: boolean;
}
