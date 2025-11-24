import { apiRequest } from "@/lib/queryClient";
import { useAdminPanel } from "@/features/admin/context/AdminPanelContext";
import { useAdminMutation, useAdminBulkMutation, createBulkOperation } from "./createAdminMutation";

/**
 * Consolidated admin mutations using shared mutation helpers
 * Drastically reduces code duplication and ensures consistency
 */
export function useAdminMutations() {
  const { setActionDialog, setBulkActionDialog, setSelectedUsers } = useAdminPanel();

  // Helper for cleanup after bulk operations
  const handleBulkSuccess = () => {
    setSelectedUsers(new Set());
    setBulkActionDialog(null);
  };

  // Single user operations
  const promoteUserMutation = useAdminMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason?: string }) => {
      return apiRequest('/api/admin/promote', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, reason })
      });
    },
    successTitle: "✅ User Promoted",
    successDescription: "User has been promoted to admin successfully",
    errorTitle: "❌ Promotion Failed",
    errorDescription: "Unable to promote user. User may already be an admin.",
    onSuccessCallback: () => setActionDialog(null)
  });

  const revokeAdminMutation = useAdminMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason?: string }) => {
      return apiRequest('/api/admin/revoke', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, reason })
      });
    },
    successTitle: "✅ Admin Revoked",
    successDescription: "Admin access has been revoked successfully",
    errorTitle: "❌ Revocation Failed",
    errorDescription: "Unable to revoke admin access. Please try again.",
    onSuccessCallback: () => setActionDialog(null)
  });

  const verifyUserMutation = useAdminMutation({
    mutationFn: async (userId: number) => {
      return apiRequest('/api/admin/verify-user', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId })
      });
    },
    successTitle: "✅ User Verified",
    successDescription: "User has been verified successfully",
    errorTitle: "❌ Verification Failed",
    errorDescription: "Unable to verify user. Please try again."
  });

  const deleteUserMutation = useAdminMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
    },
    successTitle: "✅ User Deleted",
    successDescription: "User has been deleted successfully",
    errorTitle: "❌ Deletion Failed",
    errorDescription: "Unable to delete user. Please try again."
  });

  const approveRequestMutation = useAdminMutation({
    mutationFn: async ({ userId, responseNote }: { userId: number; responseNote?: string }) => {
      return apiRequest('/api/admin/approve', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, response_note: responseNote })
      });
    },
    successTitle: "✅ Request Approved",
    successDescription: "Admin request has been approved successfully",
    errorTitle: "❌ Approval Failed",
    errorDescription: "Unable to approve admin request. Please try again.",
    onSuccessCallback: () => setActionDialog(null)
  });

  const rejectRequestMutation = useAdminMutation({
    mutationFn: async ({ userId, responseNote }: { userId: number; responseNote?: string }) => {
      return apiRequest('/api/admin/deny', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, response_note: responseNote })
      });
    },
    successTitle: "✅ Request Denied",
    successDescription: "Admin request has been denied successfully",
    errorTitle: "❌ Denial Failed",
    errorDescription: "Unable to deny admin request. Please try again.",
    onSuccessCallback: () => setActionDialog(null)
  });

  // Bulk operations
  const bulkPromoteMutation = useAdminBulkMutation(
    (userIds: number[]) => createBulkOperation(
      userIds,
      '/api/admin/promote',
      'POST',
      (userId) => ({ user_id: userId, reason: 'Bulk promotion' })
    ),
    "Promotion",
    handleBulkSuccess
  );

  const bulkRevokeMutation = useAdminBulkMutation(
    (userIds: number[]) => createBulkOperation(
      userIds,
      '/api/admin/revoke',
      'POST',
      (userId) => ({ user_id: userId, reason: 'Bulk revocation' })
    ),
    "Revocation",
    handleBulkSuccess
  );

  const bulkVerifyMutation = useAdminBulkMutation(
    (userIds: number[]) => createBulkOperation(
      userIds,
      '/api/admin/verify-user',
      'POST',
      (userId) => ({ user_id: userId })
    ),
    "Verification",
    handleBulkSuccess
  );

  const bulkDeleteMutation = useAdminBulkMutation(
    (userIds: number[]) => createBulkOperation(
      userIds,
      '/api/admin/users',
      'DELETE'
    ),
    "Deletion",
    handleBulkSuccess
  );

  return {
    promoteUserMutation,
    revokeAdminMutation,
    verifyUserMutation,
    deleteUserMutation,
    bulkPromoteMutation,
    bulkRevokeMutation,
    bulkVerifyMutation,
    bulkDeleteMutation,
    approveRequestMutation,
    rejectRequestMutation
  };
}
