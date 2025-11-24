export const ADMIN_CONSTANTS = {
  ITEMS_PER_PAGE: 20,
  REFETCH_INTERVALS: {
    STATS: 60000,
    USERS: 120000,
    REQUESTS: 90000,
    ACTIVITY: 120000
  },
  STALE_TIME: {
    STATS: 30000,
    USERS: 60000,
    REQUESTS: 45000
  }
} as const;

/**
 * Shared query configuration for admin panel queries
 * Eliminates duplication and ensures consistency across all hooks
 */
export const ADMIN_QUERY_CONFIG = {
  staleTime: 300000, // 5 minutes
  refetchInterval: false, // Disabled by default (manual refresh only)
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000)
} as const;

/**
 * Creates query options with real-time polling enabled
 * @param intervalMs - Polling interval in milliseconds (default: 60000 = 1 minute)
 */
export function createRealTimeQueryConfig(intervalMs: number = 60000) {
  return {
    ...ADMIN_QUERY_CONFIG,
    refetchInterval: intervalMs,
    placeholderData: (previousData: any) => previousData // Keeps UI stable during refetch
  };
}

export const USER_FILTERS_CONFIG = {
  roles: [
    { value: 'all', label: 'All Roles' },
    { value: 'user', label: 'Users' },
    { value: 'admin', label: 'Admins' },
    { value: 'owner', label: 'Owners' }
  ],
  verificationStatus: [
    { value: 'all', label: 'All' },
    { value: 'verified', label: 'Verified' },
    { value: 'unverified', label: 'Unverified' }
  ],
  walletRange: [
    { value: 'all', label: 'All Balances' },
    { value: 'empty', label: 'Empty (0)' },
    { value: 'low', label: 'Low (< 100k)' },
    { value: 'medium', label: 'Medium (100k-1M)' },
    { value: 'high', label: 'High (> 1M)' }
  ],
  dateRange: [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' }
  ],
  activityStatus: [
    { value: 'all', label: 'All Users' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ],
  adminStatus: [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending Requests' },
    { value: 'approved', label: 'Approved' },
    { value: 'none', label: 'No Request' }
  ]
} as const;

export const EXPORT_HEADERS = {
  users: [
    'ID',
    'Username',
    'Email',
    'Display Name',
    'Role',
    'Verified',
    'Admin Approved',
    'Admin Request Pending',
    'Admin Request Reason',
    'Wallet Balance',
    'Created At'
  ],
  stats: [
    'Total Users',
    'Total Admins',
    'Total Owners',
    'Pending Admin Requests',
    'Total Products',
    'Active Products',
    'Pending Escrows',
    'Active Escrows',
    'Completed Escrows'
  ]
} as const;

export const CHART_COLORS = {
  primary: '#10B981',
  secondary: '#6366F1',
  accent: '#F59E0B',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  users: '#6366F1',
  admins: '#10B981',
  owners: '#F59E0B',
  pending: '#F59E0B',
  active: '#10B981',
  completed: '#6366F1',
  disputed: '#EF4444'
} as const;

export const DEFAULT_AI_SETTINGS = {
  isActive: true,
  autoRespond: true,
  responseDelay: 2000,
  escrowAutoApproval: false,
  fraudDetection: true,
  smartPricing: true,
  posterGeneration: false,
  chatModeration: true,
  deepseekModel: 'deepseek-chat',
  maxTokens: 4000
} as const;
