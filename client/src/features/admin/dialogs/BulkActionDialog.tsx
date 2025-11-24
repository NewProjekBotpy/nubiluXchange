import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { BulkActionDialog } from "../types";

interface BulkActionDialogProps {
  bulkActionDialog: BulkActionDialog | null;
  selectedCount: number;
  selectedUserIds?: number[];
  onClose: () => void;
  onConfirm: (type: string, userIds: number[]) => void;
  isPending?: boolean;
}

export function BulkActionDialogComponent({ 
  bulkActionDialog, 
  selectedCount,
  selectedUserIds = [],
  onClose, 
  onConfirm,
  isPending = false 
}: BulkActionDialogProps) {
  if (!bulkActionDialog || selectedCount === 0) return null;

  return (
    <AlertDialog open={!!bulkActionDialog} onOpenChange={onClose}>
      <AlertDialogContent className="bg-nxe-surface border-nxe-surface">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Bulk {bulkActionDialog.type === 'promote' ? 'Promotion' : bulkActionDialog.type === 'revoke' ? 'Revocation' : 'Action'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Are you sure you want to {bulkActionDialog.type} {selectedCount} selected user{selectedCount !== 1 ? 's' : ''}?
            {bulkActionDialog.type === 'promote' && ' This action will grant admin privileges to all selected users.'}
            {bulkActionDialog.type === 'delete' && ' This action cannot be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            className="bg-nxe-card border-nxe-surface text-white hover:bg-nxe-surface"
            onClick={onClose}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(bulkActionDialog.type, selectedUserIds)}
            disabled={isPending}
            className={
              bulkActionDialog.type === 'delete' 
                ? "bg-red-600 hover:bg-red-700 text-white" 
                : "bg-green-600 hover:bg-green-700 text-white"
            }
            data-testid="button-confirm-bulk-action"
          >
            {isPending ? 'Processing...' : 
              (bulkActionDialog.type === 'promote' ? 'Promote All' : 
               bulkActionDialog.type === 'revoke' ? 'Revoke All' : 
               bulkActionDialog.type === 'delete' ? 'Delete All' : 'Confirm')
            }
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
