import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import type { 
  User, 
  AdminStats, 
  AIAdminSettings, 
  UserFilters, 
  DeleteConfirmation, 
  ActionDialog, 
  BulkActionDialog,
  ActivityLog
} from "../types";
import { DEFAULT_AI_SETTINGS } from "../config/adminPanelConfig";

interface AdminPanelContextType {
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  
  userFilters: UserFilters;
  setUserFilters: (filters: UserFilters) => void;
  
  selectedUsers: Set<number>;
  setSelectedUsers: (users: Set<number>) => void;
  toggleUserSelection: (userId: number) => void;
  clearSelectedUsers: () => void;
  
  selectedUser: User | null;
  setSelectedUser: (user: User | null) => void;
  
  aiSettings: AIAdminSettings;
  setAiSettings: (settings: AIAdminSettings) => void;
  
  deleteConfirmation: DeleteConfirmation | null;
  setDeleteConfirmation: (confirmation: DeleteConfirmation | null) => void;
  
  actionDialog: ActionDialog | null;
  setActionDialog: (dialog: ActionDialog | null) => void;
  
  bulkActionDialog: BulkActionDialog | null;
  setBulkActionDialog: (dialog: BulkActionDialog | null) => void;
  
  templateDialog: boolean;
  setTemplateDialog: (open: boolean) => void;
  
  ruleDialog: boolean;
  setRuleDialog: (open: boolean) => void;
  
  blacklistDialog: boolean;
  setBlacklistDialog: (open: boolean) => void;
  
  currentPage: number;
  setCurrentPage: (page: number) => void;
  
  pageSize: number;
  setPageSize: (size: number) => void;
  
  sortField: string;
  setSortField: (field: string) => void;
  
  sortDirection: 'asc' | 'desc';
  setSortDirection: (direction: 'asc' | 'desc') => void;
  
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (show: boolean) => void;
  
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  
  isRealTimeEnabled: boolean;
  setIsRealTimeEnabled: (enabled: boolean) => void;
  
  enablePerformanceMonitoring: boolean;
  setEnablePerformanceMonitoring: (enabled: boolean) => void;
  
  showPerformanceDetails: boolean;
  setShowPerformanceDetails: (show: boolean) => void;
  
  isChartsOpen: boolean;
  setIsChartsOpen: (open: boolean) => void;
  
  lastUpdated: Date;
  updateLastUpdated: () => void;
}

const AdminPanelContext = createContext<AdminPanelContextType | undefined>(undefined);

export function AdminPanelProvider({ children }: { children: ReactNode }) {
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilters, setUserFilters] = useState<UserFilters>({
    role: 'all',
    verificationStatus: 'all',
    walletRange: 'all',
    dateRange: 'all',
    activityStatus: 'all',
    adminStatus: 'all'
  });
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [aiSettings, setAiSettings] = useState<AIAdminSettings>(DEFAULT_AI_SETTINGS);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [actionDialog, setActionDialog] = useState<ActionDialog | null>(null);
  const [bulkActionDialog, setBulkActionDialog] = useState<BulkActionDialog | null>(null);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [ruleDialog, setRuleDialog] = useState(false);
  const [blacklistDialog, setBlacklistDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [enablePerformanceMonitoring, setEnablePerformanceMonitoring] = useState(false);
  const [showPerformanceDetails, setShowPerformanceDetails] = useState(false);
  const [isChartsOpen, setIsChartsOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const toggleUserSelection = useCallback((userId: number) => {
    setSelectedUsers(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(userId)) {
        newSelection.delete(userId);
      } else {
        newSelection.add(userId);
      }
      return newSelection;
    });
  }, []);

  const clearSelectedUsers = useCallback(() => {
    setSelectedUsers(new Set());
  }, []);

  const updateLastUpdated = useCallback(() => {
    setLastUpdated(new Date());
  }, []);

  const value: AdminPanelContextType = {
    selectedTab,
    setSelectedTab,
    searchTerm,
    setSearchTerm,
    userFilters,
    setUserFilters,
    selectedUsers,
    setSelectedUsers,
    toggleUserSelection,
    clearSelectedUsers,
    selectedUser,
    setSelectedUser,
    aiSettings,
    setAiSettings,
    deleteConfirmation,
    setDeleteConfirmation,
    actionDialog,
    setActionDialog,
    bulkActionDialog,
    setBulkActionDialog,
    templateDialog,
    setTemplateDialog,
    ruleDialog,
    setRuleDialog,
    blacklistDialog,
    setBlacklistDialog,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    showAdvancedFilters,
    setShowAdvancedFilters,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isRealTimeEnabled,
    setIsRealTimeEnabled,
    enablePerformanceMonitoring,
    setEnablePerformanceMonitoring,
    showPerformanceDetails,
    setShowPerformanceDetails,
    isChartsOpen,
    setIsChartsOpen,
    lastUpdated,
    updateLastUpdated
  };

  return (
    <AdminPanelContext.Provider value={value}>
      {children}
    </AdminPanelContext.Provider>
  );
}

export function useAdminPanel() {
  const context = useContext(AdminPanelContext);
  if (context === undefined) {
    throw new Error('useAdminPanel must be used within AdminPanelProvider');
  }
  return context;
}
