import { apiRequest } from "@/lib/queryClient";
import { useAdminUserQueries } from "./useAdminUserQueries";
import { useAdminMutation } from "./createAdminMutation";

interface UseAdminUsersOptions {
  hasAdminAccess?: boolean;
  onActionComplete?: () => void;
}

/**
 * Hook for admin user management with queries and mutations
 * Now uses shared mutation helpers to eliminate duplication
 */
export function useAdminUsers({ hasAdminAccess = true, onActionComplete }: UseAdminUsersOptions = {}) {
  const { users, usersLoading, usersError, requests, requestsLoading, requestsError } = useAdminUserQueries({ 
    hasAdminAccess 
  });

  // Single user mutations using shared helper
  const promoteMutation = useAdminMutation({
    mutationFn: async ({ userId, reason }: { userId: number, reason?: string }) => {
      return apiRequest('/api/admin/promote', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, reason })
      });
    },
    successTitle: "✅ User Promoted",
    successDescription: "User has been promoted to admin successfully",
    errorTitle: "❌ Promotion Failed",
    errorDescription: "Unable to promote user. User may already be an admin.",
    onSuccessCallback: onActionComplete
  });

  const demoteMutation = useAdminMutation({
    mutationFn: async ({ userId, reason }: { userId: number, reason?: string }) => {
      return apiRequest('/api/admin/revoke', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, reason })
      });
    },
    successTitle: "✅ Admin Revoked",
    successDescription: "Admin access has been revoked successfully",
    errorTitle: "❌ Revocation Failed",
    errorDescription: "Unable to revoke admin access. Please try again.",
    onSuccessCallback: onActionComplete
  });

  const deleteMutation = useAdminMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
    },
    successTitle: "✅ User Deleted",
    successDescription: "User has been deleted successfully",
    errorTitle: "❌ Deletion Failed",
    errorDescription: "Unable to delete user. Please try again.",
    onSuccessCallback: onActionComplete
  });

  const approveMutation = useAdminMutation({
    mutationFn: async ({ userId, responseNote }: { userId: number, responseNote?: string }) => {
      return apiRequest('/api/admin/approve', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, response_note: responseNote })
      });
    },
    successTitle: "✅ Request Approved",
    successDescription: "Admin request has been approved successfully",
    errorTitle: "❌ Approval Failed",
    errorDescription: "Unable to approve admin request. Please try again.",
    onSuccessCallback: onActionComplete
  });

  const rejectMutation = useAdminMutation({
    mutationFn: async ({ userId, responseNote }: { userId: number, responseNote?: string }) => {
      return apiRequest('/api/admin/deny', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, response_note: responseNote })
      });
    },
    successTitle: "✅ Request Denied",
    successDescription: "Admin request has been denied successfully",
    errorTitle: "❌ Denial Failed",
    errorDescription: "Unable to deny admin request. Please try again.",
    onSuccessCallback: onActionComplete
  });

  return {
    users,
    usersLoading,
    usersError,
    requests,
    requestsLoading,
    requestsError,
    promoteMutation,
    demoteMutation,
    deleteMutation,
    approveMutation,
    rejectMutation
  };
}
