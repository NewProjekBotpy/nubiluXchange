import { useQuery } from "@tanstack/react-query";
import { ADMIN_QUERY_CONFIG } from "@/features/admin/config/adminPanelConfig";
import type { User } from "@/features/admin/types";

interface UseAdminUserQueriesOptions {
  hasAdminAccess?: boolean;
}

/**
 * Shared hook for fetching admin user and request data
 * Eliminates duplication between useAdminData and useAdminUsers
 * Uses shared User type from admin/types to avoid duplication
 */
export function useAdminUserQueries({ hasAdminAccess = true }: UseAdminUserQueriesOptions = {}) {
  const { data: users = [], isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    ...ADMIN_QUERY_CONFIG,
    enabled: hasAdminAccess,
  });

  const { data: requests = [], isLoading: requestsLoading, error: requestsError, refetch: refetchRequests } = useQuery<User[]>({
    queryKey: ['/api/admin/requests'],
    ...ADMIN_QUERY_CONFIG,
    enabled: hasAdminAccess,
  });

  return {
    users,
    usersLoading,
    usersError,
    refetchUsers,
    requests,
    requestsLoading,
    requestsError,
    refetchRequests
  };
}
