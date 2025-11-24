import { useState, useCallback } from "react";

interface DeleteConfirmation {
  type: string;
  id: number;
  name: string;
}

interface BulkActionDialog {
  type: string;
}

export function useAdminDialogs() {
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [bulkActionDialog, setBulkActionDialog] = useState<BulkActionDialog | null>(null);
  const [templateDialog, setTemplateDialog] = useState<boolean>(false);
  const [ruleDialog, setRuleDialog] = useState<boolean>(false);
  const [blacklistDialog, setBlacklistDialog] = useState<boolean>(false);

  const openDeleteDialog = useCallback((type: string, id: number, name: string) => {
    setDeleteConfirmation({ type, id, name });
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteConfirmation(null);
  }, []);

  const openBulkActionDialog = useCallback((type: string) => {
    setBulkActionDialog({ type });
  }, []);

  const closeBulkActionDialog = useCallback(() => {
    setBulkActionDialog(null);
  }, []);

  const openTemplateDialog = useCallback(() => {
    setTemplateDialog(true);
  }, []);

  const closeTemplateDialog = useCallback(() => {
    setTemplateDialog(false);
  }, []);

  const openRuleDialog = useCallback(() => {
    setRuleDialog(true);
  }, []);

  const closeRuleDialog = useCallback(() => {
    setRuleDialog(false);
  }, []);

  const openBlacklistDialog = useCallback(() => {
    setBlacklistDialog(true);
  }, []);

  const closeBlacklistDialog = useCallback(() => {
    setBlacklistDialog(false);
  }, []);

  return {
    deleteConfirmation,
    openDeleteDialog,
    closeDeleteDialog,
    bulkActionDialog,
    openBulkActionDialog,
    closeBulkActionDialog,
    templateDialog,
    openTemplateDialog,
    closeTemplateDialog,
    ruleDialog,
    openRuleDialog,
    closeRuleDialog,
    blacklistDialog,
    openBlacklistDialog,
    closeBlacklistDialog
  };
}
