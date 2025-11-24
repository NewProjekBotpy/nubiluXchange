import { useQuery } from "@tanstack/react-query";
import { useAdminStats } from "./useAdminStats";
import { useAdminUserQueries } from "./useAdminUserQueries";
import type { ActivityLog } from "@/features/admin/types";
import { ADMIN_QUERY_CONFIG } from "@/features/admin/config/adminPanelConfig";

interface UseAdminDataOptions {
  hasAdminAccess?: boolean;
  isRealTimeEnabled?: boolean;
}

/**
 * Composite hook that fetches all admin data
 * Uses shared hooks to avoid duplication
 */
export function useAdminData({ 
  hasAdminAccess = true, 
  isRealTimeEnabled = false 
}: UseAdminDataOptions = {}) {
  const { stats, statsLoading, statsError, refetchStats } = useAdminStats({ 
    isRealTimeEnabled, 
    hasAdminAccess 
  });

  const { 
    users, 
    usersLoading, 
    usersError, 
    requests, 
    requestsLoading, 
    requestsError 
  } = useAdminUserQueries({ hasAdminAccess });

  const { data: activityLogs = [], isLoading: logsLoading, error: logsError } = useQuery<ActivityLog[]>({
    queryKey: ['/api/admin/activity-logs'],
    ...ADMIN_QUERY_CONFIG,
    enabled: hasAdminAccess,
  });

  const isLoading = statsLoading || usersLoading || requestsLoading || logsLoading;
  const hasError = statsError || usersError || requestsError || logsError;

  return {
    stats,
    statsLoading,
    statsError,
    refetchStats,
    users,
    usersLoading,
    usersError,
    requests,
    requestsLoading,
    requestsError,
    activityLogs,
    logsLoading,
    logsError,
    isLoading,
    hasError
  };
}
