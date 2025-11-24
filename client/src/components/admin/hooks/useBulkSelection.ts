import { useState, useCallback, useEffect } from "react";
import type { User } from "@/features/admin/types";

interface UseBulkSelectionOptions {
  users: User[];
  paginatedUsers?: User[];
}

export function useBulkSelection({ users, paginatedUsers = [] }: UseBulkSelectionOptions) {
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());

  useEffect(() => {
    const validUserIds = new Set(users.map(user => user.id));
    const currentSelections = new Set(Array.from(selectedUsers).filter(id => validUserIds.has(id)));
    
    if (currentSelections.size !== selectedUsers.size) {
      setSelectedUsers(currentSelections);
    }
  }, [users, selectedUsers]);

  const toggleSelection = useCallback((userId: number) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  }, [selectedUsers]);

  const toggleSelectAll = useCallback(() => {
    const currentPageUserIds = paginatedUsers.map(user => user.id);
    const isAllPageSelected = paginatedUsers.length > 0 && paginatedUsers.every(user => selectedUsers.has(user.id));
    
    if (isAllPageSelected) {
      const newSelection = new Set(selectedUsers);
      currentPageUserIds.forEach(id => newSelection.delete(id));
      setSelectedUsers(newSelection);
    } else {
      const newSelection = new Set(selectedUsers);
      currentPageUserIds.forEach(id => newSelection.add(id));
      setSelectedUsers(newSelection);
    }
  }, [selectedUsers, paginatedUsers]);

  const clearSelection = useCallback(() => {
    setSelectedUsers(new Set());
  }, []);

  const isSelected = useCallback((userId: number) => {
    return selectedUsers.has(userId);
  }, [selectedUsers]);

  const isAllSelected = paginatedUsers.length > 0 && paginatedUsers.every(user => selectedUsers.has(user.id));

  return {
    selectedUsers,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    isSelected,
    isAllSelected
  };
}
