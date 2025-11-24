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
import type { DeleteConfirmation } from "../types";

interface DeleteConfirmationDialogProps {
  deleteConfirmation: DeleteConfirmation | null;
  onClose: () => void;
  onConfirm: (type: string, id: number) => void;
  isPending?: boolean;
}

export function DeleteConfirmationDialog({ 
  deleteConfirmation, 
  onClose, 
  onConfirm,
  isPending = false 
}: DeleteConfirmationDialogProps) {
  if (!deleteConfirmation) return null;

  return (
    <AlertDialog open={!!deleteConfirmation} onOpenChange={onClose}>
      <AlertDialogContent className="bg-nxe-surface border-nxe-surface">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Delete {deleteConfirmation.type}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Are you sure you want to delete "{deleteConfirmation.name}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-nxe-card border-nxe-surface text-white hover:bg-nxe-surface">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(deleteConfirmation.type, deleteConfirmation.id)}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
            data-testid={`button-confirm-delete-${deleteConfirmation.type}`}
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
