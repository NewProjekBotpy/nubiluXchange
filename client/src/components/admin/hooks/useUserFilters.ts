import { useState, useMemo, useEffect } from "react";
import type { User, UserFilters } from "@/features/admin/types";

interface UseUserFiltersOptions {
  users: User[];
  itemsPerPage?: number;
}

export function useUserFilters({ users, itemsPerPage = 20 }: UseUserFiltersOptions) {
  const [filters, setFilters] = useState<UserFilters>({
    role: 'all',
    verificationStatus: 'all',
    walletRange: 'all',
    dateRange: 'all',
    activityStatus: 'all',
    adminStatus: 'all'
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredUsers = useMemo(() => {
    let filtered = users.filter(user => {
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
        (filters.adminStatus === 'pending' && Boolean(user.adminRequestPending)) ||
        (filters.adminStatus === 'approved' && Boolean(user.isAdminApproved) && !Boolean(user.adminRequestPending)) ||
        (filters.adminStatus === 'none' && !Boolean(user.adminRequestPending) && !Boolean(user.isAdminApproved));
      
      const matchesActivityStatus = filters.activityStatus === 'all' ||
        (filters.activityStatus === 'active' && (Boolean(user.isVerified) || Boolean(user.adminRequestPending))) ||
        (filters.activityStatus === 'inactive' && !Boolean(user.isVerified) && !Boolean(user.adminRequestPending));
      
      return matchesSearch && matchesRole && matchesVerification && matchesWallet && matchesDate && matchesAdminStatus && matchesActivityStatus;
    });
    
    filtered.sort((a, b) => {
      let aValue, bValue;
      
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
          const aBalance = parseFloat(a.walletBalance || '0');
          const bBalance = parseFloat(b.walletBalance || '0');
          aValue = isNaN(aBalance) ? 0 : aBalance;
          bValue = isNaN(bBalance) ? 0 : bBalance;
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [users, searchTerm, filters, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  const resetFilters = () => {
    setFilters({
      role: 'all',
      verificationStatus: 'all',
      walletRange: 'all',
      dateRange: 'all',
      activityStatus: 'all',
      adminStatus: 'all'
    });
    setSearchTerm("");
    setSortField('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  return {
    filters,
    setFilters,
    searchTerm,
    setSearchTerm,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    filteredUsers,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    totalPages,
    paginatedUsers,
    resetFilters
  };
}
