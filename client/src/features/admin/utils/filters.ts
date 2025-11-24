import type { User, UserFilters } from "../types";

export function filterUsers(
  users: User[],
  searchTerm: string,
  filters: UserFilters
): User[] {
  return users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = filters.role === 'all' || user.role === filters.role;
    
    const matchesVerification = filters.verificationStatus === 'all' ||
      (filters.verificationStatus === 'verified' && Boolean(user.isVerified)) ||
      (filters.verificationStatus === 'unverified' && !Boolean(user.isVerified));
    
    const walletBalance = parseFloat(user.walletBalance || '0');
    const safeWalletBalance = isNaN(walletBalance) ? 0 : walletBalance;
    const matchesWallet = filters.walletRange === 'all' ||
      (filters.walletRange === 'empty' && safeWalletBalance === 0) ||
      (filters.walletRange === 'low' && safeWalletBalance > 0 && safeWalletBalance < 100000) ||
      (filters.walletRange === 'medium' && safeWalletBalance >= 100000 && safeWalletBalance < 1000000) ||
      (filters.walletRange === 'high' && safeWalletBalance >= 1000000);
    
    const userDate = new Date(user.createdAt);
    const now = new Date();
    const matchesDate = filters.dateRange === 'all' ||
      (filters.dateRange === 'today' && userDate.toDateString() === now.toDateString()) ||
      (filters.dateRange === 'week' && userDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) ||
      (filters.dateRange === 'month' && userDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) ||
      (filters.dateRange === 'year' && userDate >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000));
    
    const matchesAdminStatus = filters.adminStatus === 'all' ||
      (filters.adminStatus === 'pending' && Boolean(user.adminRequestPending ?? false)) ||
      (filters.adminStatus === 'approved' && Boolean(user.isAdminApproved ?? false) && !Boolean(user.adminRequestPending ?? false)) ||
      (filters.adminStatus === 'none' && !Boolean(user.adminRequestPending ?? false) && !Boolean(user.isAdminApproved ?? false));
    
    const matchesActivityStatus = filters.activityStatus === 'all' ||
      (filters.activityStatus === 'active' && (Boolean(user.isVerified ?? false) || Boolean(user.adminRequestPending ?? false))) ||
      (filters.activityStatus === 'inactive' && !Boolean(user.isVerified ?? false) && !Boolean(user.adminRequestPending ?? false));
    
    return matchesSearch && matchesRole && matchesVerification && matchesWallet && matchesDate && matchesAdminStatus && matchesActivityStatus;
  });
}

export function sortUsers(
  users: User[],
  sortField: string,
  sortDirection: 'asc' | 'desc'
): User[] {
  return [...users].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sortField) {
      case 'username':
        aValue = a.username.toLowerCase();
        bValue = b.username.toLowerCase();
        break;
      case 'email':
        aValue = a.email.toLowerCase();
        bValue = b.email.toLowerCase();
        break;
      case 'role':
        aValue = a.role;
        bValue = b.role;
        break;
      case 'walletBalance':
        aValue = parseFloat(a.walletBalance || '0');
        bValue = parseFloat(b.walletBalance || '0');
        aValue = isNaN(aValue) ? 0 : aValue;
        bValue = isNaN(bValue) ? 0 : bValue;
        break;
      case 'createdAt':
      default:
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}

export function paginateUsers(
  users: User[],
  currentPage: number,
  pageSize: number
): { paginatedUsers: User[]; totalPages: number } {
  const totalPages = Math.ceil(users.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedUsers = users.slice(startIndex, endIndex);
  
  return { paginatedUsers, totalPages };
}
