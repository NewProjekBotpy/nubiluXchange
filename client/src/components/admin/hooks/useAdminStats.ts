import { useQuery } from "@tanstack/react-query";
import type { AdminStats } from "@/features/admin/types";
import { ADMIN_QUERY_CONFIG, createRealTimeQueryConfig } from "@/features/admin/config/adminPanelConfig";

interface UseAdminStatsOptions {
  isRealTimeEnabled?: boolean;
  hasAdminAccess?: boolean;
}

export function useAdminStats({ isRealTimeEnabled = false, hasAdminAccess = true }: UseAdminStatsOptions = {}) {
  const queryConfig = isRealTimeEnabled 
    ? createRealTimeQueryConfig(60000) 
    : ADMIN_QUERY_CONFIG;

  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    ...queryConfig,
    enabled: hasAdminAccess,
  });

  return {
    stats,
    statsLoading,
    statsError,
    refetchStats
  };
}
