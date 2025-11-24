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
import type { ActionDialog } from "../types";

interface UserActionDialogProps {
  actionDialog: ActionDialog | null;
  onClose: () => void;
  onConfirm: (type: 'promote' | 'revoke', userId: number) => void;
  isPending?: boolean;
}

export function UserActionDialog({ 
  actionDialog, 
  onClose, 
  onConfirm,
  isPending = false 
}: UserActionDialogProps) {
  if (!actionDialog) return null;

  return (
    <AlertDialog open={!!actionDialog} onOpenChange={onClose}>
      <AlertDialogContent className="bg-nxe-surface border-nxe-surface">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            {actionDialog.type === 'promote' ? 'Promote User' : 'Revoke Admin Access'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            {actionDialog.type === 'promote' 
              ? `Are you sure you want to promote ${actionDialog.user.username} to admin?`
              : `Are you sure you want to revoke admin access for ${actionDialog.user.username}?`
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-nxe-card border-nxe-surface text-white hover:bg-nxe-surface">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(actionDialog.type, actionDialog.user.id)}
            disabled={isPending}
            className={actionDialog.type === 'promote' ? "bg-nxe-primary hover:bg-nxe-primary/90" : "bg-red-600 hover:bg-red-700"}
            data-testid={`button-confirm-${actionDialog.type}`}
          >
            {isPending ? 'Processing...' : (actionDialog.type === 'promote' ? 'Promote' : 'Revoke')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
