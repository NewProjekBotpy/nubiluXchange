import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

/**
 * Query keys that should be invalidated after admin mutations
 */
const ADMIN_QUERY_KEYS = [
  '/api/admin/users',
  '/api/admin/stats',
  '/api/admin/requests'
] as const;

interface MutationConfig<TData = any, TVariables = any> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  successTitle: string;
  successDescription: string;
  errorTitle: string;
  errorDescription?: string;
  onSuccessCallback?: () => void;
}

/**
 * Standardized error message extraction
 */
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}

/**
 * Creates a standardized admin mutation with automatic cache invalidation and toast notifications
 * Eliminates duplication across all admin mutations
 */
export function useAdminMutation<TData = any, TVariables = any>(
  config: MutationConfig<TData, TVariables>
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: config.mutationFn,
    onSuccess: () => {
      // Invalidate all admin queries
      ADMIN_QUERY_KEYS.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });

      // Show success toast
      toast({ 
        title: config.successTitle, 
        description: config.successDescription 
      });

      // Execute success callback if provided
      config.onSuccessCallback?.();
    },
    onError: (error: unknown) => {
      // Show error toast with extracted message
      toast({ 
        title: config.errorTitle,
        description: getErrorMessage(error, config.errorDescription || "An error occurred. Please try again."),
        variant: "destructive" 
      });
    }
  });
}

/**
 * Specialized mutation for bulk operations with detailed result reporting
 */
interface BulkOperationResult {
  results: Array<{ userId: number; success: true; result: any }>;
  errors: Array<{ userId: number; success: false; error: string }>;
  totalRequested: number;
}

export function useAdminBulkMutation(
  mutationFn: (userIds: number[]) => Promise<BulkOperationResult>,
  operationName: string,
  onSuccessCallback?: () => void
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn,
    onSuccess: (data: BulkOperationResult) => {
      const { results, errors, totalRequested } = data;

      // Invalidate all admin queries
      ADMIN_QUERY_KEYS.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });

      // Show appropriate toast based on results
      if (errors.length === 0) {
        toast({ 
          title: `✅ Bulk ${operationName} Completed`, 
          description: `All ${results.length} users processed successfully` 
        });
      } else if (results.length === 0) {
        toast({ 
          title: `❌ Bulk ${operationName} Failed`, 
          description: `Unable to process ${totalRequested} user(s). Please check permissions.`,
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "⚠️ Partial Success", 
          description: `${results.length} succeeded, ${errors.length} failed`,
          variant: "destructive" 
        });
      }

      // Execute success callback
      onSuccessCallback?.();
    },
    onError: (error: unknown) => {
      toast({ 
        title: `❌ Bulk ${operationName} Failed`, 
        description: getErrorMessage(error, `An error occurred during bulk ${operationName.toLowerCase()}. Please try again.`),
        variant: "destructive" 
      });
    }
  });
}

/**
 * Helper to create bulk operation mutation function
 */
export async function createBulkOperation(
  userIds: number[],
  endpoint: string,
  method: 'POST' | 'DELETE' = 'POST',
  getBody?: (userId: number) => Record<string, any>
): Promise<BulkOperationResult> {
  const promises = userIds.map(userId =>
    apiRequest(
      method === 'DELETE' ? `${endpoint}/${userId}` : endpoint,
      {
        method,
        ...(method === 'POST' && getBody ? { body: JSON.stringify(getBody(userId)) } : {})
      }
    )
      .then(result => ({ userId, success: true as const, result }))
      .catch((error: any) => ({
        userId,
        success: false as const,
        error: getErrorMessage(error, 'Unknown error')
      }))
  );

  const settled = await Promise.all(promises);
  const results = settled.filter((r): r is { userId: number; success: true; result: any } => r.success);
  const errors = settled.filter((r): r is { userId: number; success: false; error: string } => !r.success);

  return { results, errors, totalRequested: userIds.length };
}
