import { useMemo, useEffect, useState } from "react";
import { 
  Users, 
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Eye,
  Shield,
  AlertTriangle,
  ArrowUpDown,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ResponsiveDataList, 
  type DataListItem 
} from "@/components/admin";
import { UserListSkeleton } from "@/components/ui/skeleton-loader";
import { useAdminPanel } from "@/features/admin/context/AdminPanelContext";
import { useAdminData } from "@/components/admin/hooks/useAdminData";
import { useAdminMutations } from "@/components/admin/hooks/useAdminMutations";
import { 
  UserActionDialog, 
  BulkActionDialog, 
  UserDetailDialog,
  DeleteConfirmationDialog
} from "@/features/admin/dialogs";
import type { User } from "@/features/admin/types";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface UsersTabProps {
  hasAdminAccess?: boolean;
}

export default function UsersTab({ hasAdminAccess = false }: UsersTabProps) {
  const { toast } = useToast();
  const {
    searchTerm,
    setSearchTerm,
    selectedUsers,
    setSelectedUsers,
    userFilters,
    setUserFilters,
    currentPage,
    setCurrentPage,
    pageSize,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    showAdvancedFilters,
    setShowAdvancedFilters,
    bulkActionDialog,
    setBulkActionDialog,
    selectedUser,
    setSelectedUser,
    actionDialog,
    setActionDialog,
    deleteConfirmation,
    setDeleteConfirmation,
    toggleUserSelection,
    clearSelectedUsers
  } = useAdminPanel();

  const { 
    stats, 
    statsLoading, 
    users = [], 
    usersLoading, 
    usersError,
    requests = [],
    requestsLoading
  } = useAdminData({ hasAdminAccess });

  const {
    approveRequestMutation,
    rejectRequestMutation,
    promoteUserMutation,
    revokeAdminMutation,
    verifyUserMutation,
    deleteUserMutation,
    bulkPromoteMutation,
    bulkRevokeMutation,
    bulkVerifyMutation,
    bulkDeleteMutation
  } = useAdminMutations();

  // State for admin requests collapsible (collapsed by default on mobile)
  const [adminRequestsOpen, setAdminRequestsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 640; // Open by default on sm and above
    }
    return false;
  });

  // Clear selected users when filters change to prevent stale selections
  // Note: setSelectedUsers is intentionally excluded from deps as it's a stable state setter
  useEffect(() => {
    setSelectedUsers(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFilters]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'admin': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(parseInt(amount || '0') || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.displayName && user.displayName.toLowerCase().includes(searchLower))
      );
    }

    if (userFilters.role && userFilters.role !== 'all') {
      filtered = filtered.filter(user => user.role === userFilters.role);
    }

    if (userFilters.verificationStatus && userFilters.verificationStatus !== 'all') {
      const isVerified = userFilters.verificationStatus === 'verified';
      filtered = filtered.filter(user => user.isVerified === isVerified);
    }

    if (userFilters.adminStatus && userFilters.adminStatus !== 'all') {
      if (userFilters.adminStatus === 'pending') {
        filtered = filtered.filter(user => Boolean(user.adminRequestPending));
      } else if (userFilters.adminStatus === 'approved') {
        filtered = filtered.filter(user => Boolean(user.isAdminApproved));
      }
    }

    if (userFilters.walletRange && userFilters.walletRange !== 'all') {
      const ranges = {
        'empty': [0, 1],
        'low': [1, 100000],
        'medium': [100000, 1000000],
        'high': [1000000, Infinity]
      };
      const [min, max] = ranges[userFilters.walletRange as keyof typeof ranges] || [0, Infinity];
      filtered = filtered.filter(user => {
        const balance = parseInt(user.walletBalance || '0') || 0;
        return balance >= min && balance < max;
      });
    }

    if (userFilters.dateRange && userFilters.dateRange !== 'all') {
      const now = new Date();
      const ranges = {
        'today': 1,
        'week': 7,
        'month': 30,
        'year': 365
      };
      const days = ranges[userFilters.dateRange as keyof typeof ranges];
      if (days) {
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(user => new Date(user.createdAt) >= cutoff);
      }
    }

    return filtered;
  }, [users, searchTerm, userFilters]);

  const filteredAndSortedUsers = useMemo(() => {
    const sorted = [...filteredUsers];
    
    sorted.sort((a, b) => {
      let aValue: any = a[sortField as keyof User];
      let bValue: any = b[sortField as keyof User];

      if (sortField === 'walletBalance') {
        aValue = parseInt(a.walletBalance || '0') || 0;
        bValue = parseInt(b.walletBalance || '0') || 0;
      } else if (sortField === 'createdAt') {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredUsers, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / pageSize);
  const paginatedUsers = filteredAndSortedUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const roleFilterCounts = useMemo(() => {
    if (!users || users.length === 0) return { all: 0, user: 0, admin: 0, owner: 0 };
    
    return {
      all: users.length,
      user: users.filter(u => u.role === 'user').length,
      admin: users.filter(u => u.role === 'admin').length,
      owner: users.filter(u => u.role === 'owner').length
    };
  }, [users]);

  const userDataItems: DataListItem[] = paginatedUsers.map(user => ({
    id: user.id,
    title: user.username,
    subtitle: user.email,
    isSelected: selectedUsers.has(user.id),
    onSelect: () => toggleUserSelection(user.id),
    badge: {
      text: user.role,
      className: getRoleColor(user.role)
    },
    metadata: [
      { label: "Display Name", value: user.displayName || "-" },
      { label: "Verified", value: user.isVerified ? "✅ Yes" : "❌ No", highlight: !user.isVerified },
      { label: "Wallet", value: formatCurrency(user.walletBalance) },
      { label: "Joined", value: formatDate(user.createdAt) },
      { label: "Admin Request", value: user.adminRequestPending ? "🔄 Pending" : "-" },
      { label: "2FA", value: user.twoFactorEnabled ? "✅ Enabled" : "❌ Disabled" }
    ],
    actions: [
      {
        label: "View Details",
        onClick: () => setSelectedUser(user),
        icon: Eye
      },
      {
        label: user.role === 'admin' ? "Revoke Admin" : "Promote to Admin",
        onClick: () => setActionDialog({ 
          type: user.role === 'admin' ? 'revoke' : 'promote', 
          user 
        }),
        variant: user.role === 'admin' ? "destructive" : "default"
      }
    ]
  }));

  const requestDataItems: DataListItem[] = requests.map(user => ({
    id: user.id,
    title: user.username,
    subtitle: user.adminRequestReason || "No reason provided",
    badge: {
      text: "Pending",
      variant: "outline",
      className: "text-orange-400 border-orange-400"
    },
    metadata: [
      { label: "Email", value: user.email },
      { label: "Requested", value: user.adminRequestAt ? formatDate(user.adminRequestAt) : "-" },
      { label: "Verified", value: user.isVerified ? "Yes" : "No", highlight: !user.isVerified }
    ],
    actions: [
      {
        label: "Approve",
        onClick: () => {
          approveRequestMutation.mutate({ userId: user.id }, {
            onSuccess: () => {
              toast({
                title: "Request Approved",
                description: `${user.username} has been promoted to admin.`
              });
            }
          });
        },
        icon: CheckCircle,
        variant: "default"
      },
      {
        label: "Deny",
        onClick: () => {
          rejectRequestMutation.mutate({ userId: user.id }, {
            onSuccess: () => {
              toast({
                title: "Request Denied",
                description: `Admin request for ${user.username} has been denied.`
              });
            }
          });
        },
        icon: XCircle,
        variant: "destructive"
      }
    ]
  }));

  const handleUserAction = (type: 'promote' | 'revoke' | 'verify' | 'delete', user: User) => {
    if (type === 'promote') {
      setActionDialog({ type: 'promote', user });
    } else if (type === 'revoke') {
      setActionDialog({ type: 'revoke', user });
    } else if (type === 'verify') {
      verifyUserMutation.mutate(user.id, {
        onSuccess: () => {
          toast({
            title: "User Verified",
            description: `${user.username} has been verified successfully.`
          });
          setSelectedUser(null);
        }
      });
    } else if (type === 'delete') {
      setDeleteConfirmation({
        type: 'user',
        id: user.id,
        name: user.username
      });
    }
  };

  const handleActionConfirm = (type: 'promote' | 'revoke', userId: number) => {
    if (type === 'promote') {
      promoteUserMutation.mutate({ userId }, {
        onSuccess: () => {
          toast({
            title: "User Promoted",
            description: "User has been promoted to admin successfully."
          });
          setActionDialog(null);
        }
      });
    } else if (type === 'revoke') {
      revokeAdminMutation.mutate({ userId }, {
        onSuccess: () => {
          toast({
            title: "Admin Revoked",
            description: "Admin access has been revoked successfully."
          });
          setActionDialog(null);
        }
      });
    }
  };

  const handleDeleteConfirm = (type: string, id: number) => {
    if (type === 'user') {
      deleteUserMutation.mutate(id, {
        onSuccess: () => {
          toast({
            title: "User Deleted",
            description: "User has been deleted successfully.",
            variant: "destructive"
          });
          setDeleteConfirmation(null);
          setSelectedUser(null);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to delete user. Please try again.",
            variant: "destructive"
          });
        }
      });
    }
  };

  const handleBulkAction = (type: string, userIds: number[]) => {
    if (type === 'promote') {
      bulkPromoteMutation.mutate(userIds);
    } else if (type === 'revoke') {
      bulkRevokeMutation.mutate(userIds);
    } else if (type === 'verify') {
      bulkVerifyMutation.mutate(userIds);
    } else if (type === 'delete') {
      bulkDeleteMutation.mutate(userIds);
    }
  };

  const exportUsers = (format: 'csv' | 'json' | 'excel') => {
    const exportData = filteredAndSortedUsers.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName || '',
      role: user.role,
      isVerified: user.isVerified,
      isAdminApproved: user.isAdminApproved,
      adminRequestPending: user.adminRequestPending,
      adminRequestReason: user.adminRequestReason || '',
      walletBalance: formatCurrency(user.walletBalance),
      walletBalanceRaw: user.walletBalance,
      createdAt: formatDate(user.createdAt),
      createdAtRaw: user.createdAt
    }));

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `users_export_${timestamp}`;

    if (format === 'csv') {
      const csvContent = [
        'ID,Username,Email,Display Name,Role,Verified,Admin Approved,Admin Request Pending,Admin Request Reason,Wallet Balance,Created At',
        ...exportData.map(user => 
          `${user.id},"${user.username}","${user.email}","${user.displayName}",${user.role},${user.isVerified},${user.isAdminApproved},${user.adminRequestPending},"${user.adminRequestReason}",${user.walletBalanceRaw},${user.createdAtRaw}`
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    toast({
      title: "Export Complete",
      description: `Users exported successfully as ${format.toUpperCase()}.`
    });
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-2 sm:space-y-4" data-testid="users-tab-content">
      {/* User Stats Cards - Compact on Mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <Card className="bg-blue-600/20 sm:bg-gradient-to-br sm:from-blue-600/20 sm:to-blue-800/20 border-blue-500/30">
          <CardHeader className="pb-1 sm:pb-3 pt-2 sm:pt-4 px-2 sm:px-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-blue-300 flex items-center gap-1 sm:gap-2">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Total Users</span>
              <span className="sm:hidden">Users</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2 sm:pb-4 px-2 sm:px-6">
            <div className="text-lg sm:text-3xl font-bold text-white">
              {statsLoading ? '...' : stats?.totalUsers || 0}
            </div>
            <p className="text-xs text-blue-200 mt-0.5 sm:mt-1 hidden sm:block">Registered users</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-600/20 sm:bg-gradient-to-br sm:from-purple-600/20 sm:to-purple-800/20 border-purple-500/30">
          <CardHeader className="pb-1 sm:pb-3 pt-2 sm:pt-4 px-2 sm:px-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-purple-300 flex items-center gap-1 sm:gap-2">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
              Admins
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2 sm:pb-4 px-2 sm:px-6">
            <div className="text-lg sm:text-3xl font-bold text-white">
              {statsLoading ? '...' : stats?.totalAdmins || 0}
            </div>
            <p className="text-xs text-purple-200 mt-0.5 sm:mt-1 hidden sm:block">Active administrators</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-600/20 sm:bg-gradient-to-br sm:from-orange-600/20 sm:to-orange-800/20 border-orange-500/30 col-span-2 sm:col-span-1">
          <CardHeader className="pb-1 sm:pb-3 pt-2 sm:pt-4 px-2 sm:px-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-orange-300 flex items-center gap-1 sm:gap-2">
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Pending Requests</span>
              <span className="sm:hidden">Pending</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2 sm:pb-4 px-2 sm:px-6">
            <div className="text-lg sm:text-3xl font-bold text-white">
              {statsLoading ? '...' : stats?.pendingAdminRequests || 0}
            </div>
            <p className="text-xs text-orange-200 mt-0.5 sm:mt-1 hidden sm:block">Admin applications</p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Requests Section - Collapsible on Mobile */}
      {requests.length > 0 && (
        <Collapsible
          open={adminRequestsOpen}
          onOpenChange={setAdminRequestsOpen}
          className="space-y-1 sm:space-y-2"
        >
          <Card className="bg-nxe-surface border-orange-500/30 shadow-lg shadow-orange-500/10">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-orange-500/5 transition-colors pb-2 sm:pb-4 pt-2 sm:pt-6 px-2 sm:px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-1 sm:gap-2 text-sm sm:text-lg">
                    <AlertTriangle className="h-3 w-3 sm:h-5 sm:w-5 text-orange-400" />
                    <span className="hidden sm:inline">Admin Requests ({requests.length})</span>
                    <span className="sm:hidden text-xs">Requests ({requests.length})</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 sm:h-8 sm:w-8 sm:hidden"
                    data-testid="toggle-admin-requests"
                  >
                    {adminRequestsOpen ? (
                      <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </div>
                {!adminRequestsOpen && (
                  <p className="text-[10px] sm:text-xs text-orange-300 mt-0.5 sm:mt-1 sm:hidden">
                    Tap to view {requests.length} pending {requests.length === 1 ? 'request' : 'requests'}
                  </p>
                )}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 px-2 sm:px-6 pb-2 sm:pb-6">
                {requestsLoading ? (
                  <UserListSkeleton />
                ) : (
                  <ResponsiveDataList
                    items={requestDataItems}
                    emptyMessage="No pending admin requests"
                    isLoading={requestsLoading}
                    data-testid="admin-requests-list"
                  />
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      <Separator className="bg-nxe-border" />

      {/* Users Header - Compact on Mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3">
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="p-1 sm:p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Users className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm sm:text-lg">
              All Users
            </h2>
            <p className="text-[10px] sm:text-sm text-gray-400">
              {filteredUsers.length} {filteredUsers.length !== users.length && `of ${users.length}`} users
            </p>
          </div>
        </div>
        
        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
              queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
              queryClient.invalidateQueries({ queryKey: ['/api/admin/requests'] });
              toast({
                title: "Refreshing...",
                description: "User data is being refreshed."
              });
            }}
            variant="outline"
            size="sm"
            className="text-gray-300 border-nxe-border hover:bg-nxe-card"
            data-testid="button-refresh-users"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => exportUsers('csv')}
            variant="outline"
            size="sm"
            className="text-gray-300 border-nxe-border hover:bg-nxe-card"
            data-testid="button-export-users"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Search and Filters - Mobile First Layout */}
      <TooltipProvider>
        <div className="space-y-1.5 sm:space-y-3">
          <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
            {/* Search - Full Width on Mobile */}
            <div className="relative flex-1">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 sm:pl-10 bg-nxe-surface border-nxe-border text-white text-xs sm:text-sm h-8 sm:h-10"
                data-testid="input-search-users"
              />
            </div>
            
            {/* Filter Controls Row */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                variant={showAdvancedFilters ? "default" : "outline"}
                size="sm"
                className={`h-8 sm:h-10 w-8 sm:w-auto px-0 sm:px-3 ${showAdvancedFilters ? "bg-nxe-primary" : "text-gray-300 border-nxe-border"}`}
                data-testid="button-toggle-filters"
              >
                <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Filters</span>
              </Button>
              
              {/* Sort Dropdown - Full on Desktop, Icon on Mobile */}
              <div className="hidden sm:block">
                <Select value={sortField} onValueChange={(value) => setSortField(value)}>
                  <SelectTrigger className="w-[180px] bg-nxe-surface border-nxe-border text-white" data-testid="select-sort-field">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-nxe-surface border-nxe-border">
                    <SelectItem value="createdAt" className="text-white">Date Joined</SelectItem>
                    <SelectItem value="username" className="text-white">Username</SelectItem>
                    <SelectItem value="email" className="text-white">Email</SelectItem>
                    <SelectItem value="walletBalance" className="text-white">Wallet Balance</SelectItem>
                    <SelectItem value="role" className="text-white">Role</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Mobile Sort - Icon Only with Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="sm:hidden">
                    <Select value={sortField} onValueChange={(value) => setSortField(value)}>
                      <SelectTrigger className="w-8 h-8 p-0 bg-nxe-surface border-nxe-border text-white" data-testid="select-sort-field-mobile">
                        <ArrowUpDown className="h-3.5 w-3.5 mx-auto" />
                      </SelectTrigger>
                      <SelectContent className="bg-nxe-surface border-nxe-border">
                        <SelectItem value="createdAt" className="text-white text-xs">Date</SelectItem>
                        <SelectItem value="username" className="text-white text-xs">Name</SelectItem>
                        <SelectItem value="email" className="text-white text-xs">Email</SelectItem>
                        <SelectItem value="walletBalance" className="text-white text-xs">Wallet</SelectItem>
                        <SelectItem value="role" className="text-white text-xs">Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sort by</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Sort Direction */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    variant="outline"
                    size="sm"
                    className="text-gray-300 border-nxe-border h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-3"
                    data-testid="button-toggle-sort-direction"
                  >
                    <span className="sm:hidden text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    <span className="hidden sm:inline">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{sortDirection === 'asc' ? 'Ascending' : 'Descending'}</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Mobile Overflow Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="sm:hidden h-8 w-8 p-0 text-gray-300 border-nxe-border"
                    data-testid="button-mobile-menu"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-nxe-surface border-nxe-border">
                  <DropdownMenuItem
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/admin/requests'] });
                      toast({
                        title: "Refreshing...",
                        description: "User data is being refreshed."
                      });
                    }}
                    className="text-white text-xs"
                    data-testid="menu-item-refresh"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Refresh
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => exportUsers('csv')}
                    className="text-white text-xs"
                    data-testid="menu-item-export"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Export CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Quick Role Filters - Horizontal Scroll on Mobile */}
          <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-2 scrollbar-hide">
            <Badge
              variant={userFilters.role === 'all' ? 'default' : 'outline'}
              className={`cursor-pointer whitespace-nowrap px-1.5 py-0.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-sm max-w-[70px] sm:max-w-none ${userFilters.role === 'all' ? 'bg-nxe-primary' : 'border-nxe-border text-gray-300'}`}
              onClick={() => setUserFilters({ ...userFilters, role: 'all' })}
              data-testid="filter-role-all"
            >
              All ({roleFilterCounts.all})
            </Badge>
            <Badge
              variant={userFilters.role === 'user' ? 'default' : 'outline'}
              className={`cursor-pointer whitespace-nowrap px-1.5 py-0.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-sm max-w-[70px] sm:max-w-none ${userFilters.role === 'user' ? 'bg-nxe-primary' : 'border-nxe-border text-gray-300'}`}
              onClick={() => setUserFilters({ ...userFilters, role: 'user' })}
              data-testid="filter-role-user"
            >
              Users ({roleFilterCounts.user})
            </Badge>
            <Badge
              variant={userFilters.role === 'admin' ? 'default' : 'outline'}
              className={`cursor-pointer whitespace-nowrap px-1.5 py-0.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-sm max-w-[70px] sm:max-w-none ${userFilters.role === 'admin' ? 'bg-nxe-primary' : 'border-nxe-border text-gray-300'}`}
              onClick={() => setUserFilters({ ...userFilters, role: 'admin' })}
              data-testid="filter-role-admin"
            >
              Admins ({roleFilterCounts.admin})
            </Badge>
            <Badge
              variant={userFilters.role === 'owner' ? 'default' : 'outline'}
              className={`cursor-pointer whitespace-nowrap px-1.5 py-0.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-sm max-w-[70px] sm:max-w-none ${userFilters.role === 'owner' ? 'bg-nxe-primary' : 'border-nxe-border text-gray-300'}`}
              onClick={() => setUserFilters({ ...userFilters, role: 'owner' })}
              data-testid="filter-role-owner"
            >
              Owners ({roleFilterCounts.owner})
            </Badge>
          </div>
        </div>
      </TooltipProvider>

      {/* Advanced Filters Panel - Compact Mobile Layout */}
      {showAdvancedFilters && (
        <Card className="bg-nxe-surface border-nxe-border">
          <CardHeader className="pb-1.5 sm:pb-3 pt-2 sm:pt-6 px-2 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-xs sm:text-sm">Advanced Filters</CardTitle>
              <Button
                onClick={() => setShowAdvancedFilters(false)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                data-testid="button-close-advanced-filters"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-4 px-2 sm:px-6 pb-2 sm:pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <div className="space-y-1 sm:space-y-2">
                <label className="text-[10px] sm:text-xs text-gray-400">Verification</label>
                <Select 
                  value={userFilters.verificationStatus} 
                  onValueChange={(value) => setUserFilters({ ...userFilters, verificationStatus: value })}
                >
                  <SelectTrigger className="bg-nxe-card border-nxe-border text-white h-8 sm:h-10 text-xs sm:text-sm" data-testid="select-verification-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-nxe-surface border-nxe-border">
                    <SelectItem value="all" className="text-white text-xs sm:text-sm">All</SelectItem>
                    <SelectItem value="verified" className="text-white text-xs sm:text-sm">Verified</SelectItem>
                    <SelectItem value="unverified" className="text-white text-xs sm:text-sm">Not Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <label className="text-[10px] sm:text-xs text-gray-400">Admin Status</label>
                <Select 
                  value={userFilters.adminStatus} 
                  onValueChange={(value) => setUserFilters({ ...userFilters, adminStatus: value })}
                >
                  <SelectTrigger className="bg-nxe-card border-nxe-border text-white h-8 sm:h-10 text-xs sm:text-sm" data-testid="select-admin-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-nxe-surface border-nxe-border">
                    <SelectItem value="all" className="text-white text-xs sm:text-sm">All</SelectItem>
                    <SelectItem value="pending" className="text-white text-xs sm:text-sm">Pending Request</SelectItem>
                    <SelectItem value="approved" className="text-white text-xs sm:text-sm">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <label className="text-[10px] sm:text-xs text-gray-400">Wallet Range</label>
                <Select 
                  value={userFilters.walletRange} 
                  onValueChange={(value) => setUserFilters({ ...userFilters, walletRange: value })}
                >
                  <SelectTrigger className="bg-nxe-card border-nxe-border text-white h-8 sm:h-10 text-xs sm:text-sm" data-testid="select-wallet-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-nxe-surface border-nxe-border">
                    <SelectItem value="all" className="text-white text-xs sm:text-sm">All</SelectItem>
                    <SelectItem value="empty" className="text-white text-xs sm:text-sm">Empty (Rp 0)</SelectItem>
                    <SelectItem value="low" className="text-white text-xs sm:text-sm">Low (&lt; Rp 100k)</SelectItem>
                    <SelectItem value="medium" className="text-white text-xs sm:text-sm">Medium (Rp 100k - 1M)</SelectItem>
                    <SelectItem value="high" className="text-white text-xs sm:text-sm">High (&gt; Rp 1M)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <label className="text-[10px] sm:text-xs text-gray-400">Date Joined</label>
                <Select 
                  value={userFilters.dateRange} 
                  onValueChange={(value) => setUserFilters({ ...userFilters, dateRange: value })}
                >
                  <SelectTrigger className="bg-nxe-card border-nxe-border text-white h-8 sm:h-10 text-xs sm:text-sm" data-testid="select-date-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-nxe-surface border-nxe-border">
                    <SelectItem value="all" className="text-white text-xs sm:text-sm">All Time</SelectItem>
                    <SelectItem value="today" className="text-white text-xs sm:text-sm">Today</SelectItem>
                    <SelectItem value="week" className="text-white text-xs sm:text-sm">Last 7 Days</SelectItem>
                    <SelectItem value="month" className="text-white text-xs sm:text-sm">Last 30 Days</SelectItem>
                    <SelectItem value="year" className="text-white text-xs sm:text-sm">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-1.5 sm:gap-2 pt-1 border-t border-nxe-border sm:border-0 sm:pt-0 sticky bottom-0 bg-nxe-surface sm:static -mx-2 px-2 py-2 sm:mx-0 sm:px-0 sm:py-0">
              <Button
                onClick={() => setUserFilters({
                  role: 'all',
                  verificationStatus: 'all',
                  adminStatus: 'all',
                  walletRange: 'all',
                  dateRange: 'all',
                  activityStatus: 'all'
                })}
                variant="outline"
                size="sm"
                className="text-gray-300 border-nxe-border text-[10px] sm:text-sm h-7 sm:h-9"
                data-testid="button-clear-filters"
              >
                Clear All
              </Button>
              <Button
                onClick={() => setShowAdvancedFilters(false)}
                variant="default"
                size="sm"
                className="bg-nxe-primary text-[10px] sm:text-sm h-7 sm:h-9 sm:hidden"
                data-testid="button-apply-filters"
              >
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions - Compact on Mobile */}
      {selectedUsers.size > 0 && (
        <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/50 shadow-lg">
          <CardContent className="pt-2 sm:pt-4 pb-2 sm:pb-3 px-2 sm:px-6">
            <div className="flex items-center justify-between flex-wrap gap-1.5 sm:gap-3">
              <span className="text-white font-medium text-xs sm:text-base">{selectedUsers.size} selected</span>
              <div className="flex gap-1 sm:gap-2 flex-wrap">
                <Button
                  onClick={() => setBulkActionDialog({ type: 'promote' })}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 h-7 sm:h-9 text-[10px] sm:text-sm px-1.5 sm:px-3"
                  data-testid="button-bulk-promote"
                >
                  <Shield className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Promote</span>
                </Button>
                <Button
                  onClick={() => setBulkActionDialog({ type: 'revoke' })}
                  size="sm"
                  variant="outline"
                  className="border-orange-500 text-orange-400 hover:bg-orange-500/20 h-7 sm:h-9 text-[10px] sm:text-sm px-1.5 sm:px-3"
                  data-testid="button-bulk-revoke"
                >
                  <XCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Revoke</span>
                </Button>
                <Button
                  onClick={() => setBulkActionDialog({ type: 'verify' })}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 h-7 sm:h-9 text-[10px] sm:text-sm px-1.5 sm:px-3"
                  data-testid="button-bulk-verify"
                >
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Verify</span>
                </Button>
                <Button
                  onClick={() => setBulkActionDialog({ type: 'delete' })}
                  size="sm"
                  variant="destructive"
                  className="h-7 sm:h-9 text-[10px] sm:text-sm px-1.5 sm:px-4"
                  data-testid="button-bulk-delete"
                >
                  Del
                </Button>
                <Button
                  onClick={() => clearSelectedUsers()}
                  size="sm"
                  variant="ghost"
                  className="text-gray-300 h-7 sm:h-9 text-[10px] sm:text-sm px-1.5 sm:px-4"
                  data-testid="button-clear-selection"
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      {usersLoading ? (
        <UserListSkeleton />
      ) : usersError ? (
        <Card className="bg-red-900/20 border-red-500/50">
          <CardContent className="pt-6">
            <p className="text-red-400">Failed to load users. Please refresh the page.</p>
          </CardContent>
        </Card>
      ) : (
        <ResponsiveDataList
          items={userDataItems}
          emptyMessage="No users found"
          isLoading={usersLoading}
          data-testid="users-list"
        />
      )}

      {/* Pagination - Condensed Mobile Controls */}
      {filteredUsers.length > pageSize && (
        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="py-1.5 sm:py-3 px-2 sm:px-6">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-sm text-gray-400 truncate">
                <span className="hidden sm:inline">Page {currentPage} of {totalPages} ({filteredUsers.length} total)</span>
                <span className="sm:hidden">{currentPage}/{totalPages} ({filteredUsers.length})</span>
              </span>
              
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Page Selector for many pages on mobile */}
                {totalPages > 5 && (
                  <Select 
                    value={currentPage.toString()} 
                    onValueChange={(value) => setCurrentPage(parseInt(value))}
                  >
                    <SelectTrigger className="w-12 sm:w-20 h-7 sm:h-9 bg-nxe-card border-nxe-border text-white text-[10px] sm:text-sm sm:hidden" data-testid="select-page-number">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-nxe-surface border-nxe-border">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <SelectItem key={page} value={page.toString()} className="text-white text-xs">
                          Page {page}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {/* Previous Button - Icon only on mobile */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        size="sm"
                        variant="outline"
                        className="border-nxe-border text-white h-7 w-7 p-0 sm:h-9 sm:w-auto sm:px-3"
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline sm:ml-1">Previous</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="sm:hidden">
                      <p>Previous page</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Next Button - Icon only on mobile */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        size="sm"
                        variant="outline"
                        className="border-nxe-border text-white h-7 w-7 p-0 sm:h-9 sm:w-auto sm:px-3"
                        data-testid="button-next-page"
                      >
                        <span className="hidden sm:inline sm:mr-1">Next</span>
                        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="sm:hidden">
                      <p>Next page</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <UserActionDialog
        actionDialog={actionDialog}
        onClose={() => setActionDialog(null)}
        onConfirm={handleActionConfirm}
        isPending={promoteUserMutation.isPending || revokeAdminMutation.isPending}
      />

      <BulkActionDialog
        bulkActionDialog={bulkActionDialog}
        selectedCount={selectedUsers.size}
        selectedUserIds={Array.from(selectedUsers)}
        onClose={() => setBulkActionDialog(null)}
        onConfirm={handleBulkAction}
        isPending={
          bulkPromoteMutation.isPending || 
          bulkRevokeMutation.isPending || 
          bulkVerifyMutation.isPending || 
          bulkDeleteMutation.isPending
        }
      />

      <UserDetailDialog
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onAction={handleUserAction}
      />

      <DeleteConfirmationDialog
        deleteConfirmation={deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={handleDeleteConfirm}
        isPending={deleteUserMutation.isPending}
      />
    </div>
  );
}
