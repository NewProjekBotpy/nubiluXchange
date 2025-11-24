import { useCallback, useState } from "react";
import { useLocation } from "wouter";
import { 
  BarChart3, 
  Users, 
  Shield, 
  Bot, 
  AlertTriangle, 
  Phone, 
  Wifi, 
  Download, 
  Activity,
  Zap,
  DollarSign,
  Smartphone,
  FileText,
  HardDrive,
  RefreshCw,
  Palette,
  Lock,
  Ban,
  Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  AdminPanelProvider, 
  useAdminPanel 
} from "@/features/admin";
import { 
  useResponsiveTabVariant,
  AdminNavbar,
  AdminFooter,
  MobileBottomNav,
  FloatingActionButton,
  MobileCommandPalette
} from "@/components/admin";
import { useAdminData } from "@/components/admin/hooks";
import { UserActionDialog, DeleteConfirmationDialog, BulkActionDialog } from "@/features/admin";
import ImprovedMobileTabs, { type TabItem } from "@/components/admin/ImprovedMobileTabs";
import { PerformanceDashboard } from "@/components/ui/performance-dashboard";
import { useAdvancedMobileGestures } from "@/hooks/useAdvancedMobileGestures";
import { usePerformanceMonitoring } from "@/hooks/usePerformanceMonitoring";
import { OfflineIndicator } from "@/components/admin/OfflineIndicator";

// Tab components
import DashboardTab from "@/components/admin/tabs/DashboardTab";
import UsersTab from "@/components/admin/tabs/UsersTab";
import SecurityTab from "@/components/admin/tabs/SecurityTab";
import AIAdminTab from "@/components/admin/tabs/AIAdminTab";
import FraudTab from "@/components/admin/tabs/FraudTab";
import PhoneAlertsTab from "@/components/admin/tabs/PhoneAlertsTab";
import ConnectionsTab from "@/components/admin/tabs/ConnectionsTab";
import ExportTab from "@/components/admin/tabs/ExportTab";
import ActivityTab from "@/components/admin/tabs/ActivityTab";
import LiveInsightsTab from "@/components/admin/tabs/LiveInsightsTab";
import SalesDashboardTab from "@/components/admin/tabs/SalesDashboardTab";
import DeviceTrackingTab from "@/components/admin/tabs/DeviceTrackingTab";
import UserReportTab from "@/components/admin/tabs/UserReportTab";
import FileManagementTab from "@/components/admin/tabs/FileManagementTab";
import TemplatesTab from "@/components/admin/tabs/TemplatesTab";
import RulesTab from "@/components/admin/tabs/RulesTab";
import BlacklistTab from "@/components/admin/tabs/BlacklistTab";
import MaintenanceTab from "@/components/admin/tabs/MaintenanceTab";

function AdminPanelContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();

  const {
    selectedTab,
    setSelectedTab,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    actionDialog,
    setActionDialog,
    deleteConfirmation,
    setDeleteConfirmation,
    bulkActionDialog,
    setBulkActionDialog,
    isRealTimeEnabled,
    enablePerformanceMonitoring
  } = useAdminPanel();

  const hasAdminAccess = Boolean(isAuthenticated && authUser && (authUser.role === 'admin' || authUser.role === 'owner'));

  const {
    stats,
    refetchStats,
    isLoading: dataLoading,
    hasError,
    statsError,
    usersError,
    requestsError,
    logsError
  } = useAdminData({ hasAdminAccess, isRealTimeEnabled });

  const { metrics: performanceMetrics, getOverallScore } = usePerformanceMonitoring(enablePerformanceMonitoring);

  const handleRefresh = useCallback(async () => {
    if (!hasAdminAccess) return;
    
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/admin/requests'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activity-logs'] })
    ]);
    
    toast({ 
      title: "Data refreshed", 
      description: "All admin data has been updated" 
    });
  }, [queryClient, toast, hasAdminAccess]);

  const handleRefreshDashboard = useCallback(async () => {
    await refetchStats();
    await queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    await new Promise(resolve => setTimeout(resolve, 500));
  }, [refetchStats, queryClient]);

  const adminTabs: TabItem[] = [
    {
      id: "dashboard",
      label: "Dashboard", 
      icon: BarChart3,
      badge: false,
      content: (
        <DashboardTab 
          onRefresh={handleRefreshDashboard}
          hasAdminAccess={hasAdminAccess}
          isRealTimeEnabled={isRealTimeEnabled}
        />
      )
    },
    {
      id: "live-insights",
      label: "Live Insights",
      icon: Zap,
      badge: false,
      content: <LiveInsightsTab hasAdminAccess={hasAdminAccess} />
    },
    {
      id: "sales",
      label: "Sales",
      icon: DollarSign,
      badge: false,
      content: <SalesDashboardTab hasAdminAccess={hasAdminAccess} />
    },
    {
      id: "users",
      label: "Users",
      icon: Users,
      badge: false,
      content: <UsersTab hasAdminAccess={hasAdminAccess} />
    },
    {
      id: "devices",
      label: "Devices",
      icon: Smartphone,
      badge: false,
      content: <DeviceTrackingTab hasAdminAccess={hasAdminAccess} />
    },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      badge: false,
      content: <UserReportTab hasAdminAccess={hasAdminAccess} />
    },
    {
      id: "files",
      label: "Files",
      icon: HardDrive,
      badge: false,
      content: <FileManagementTab hasAdminAccess={hasAdminAccess} />
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
      badge: false,
      content: <SecurityTab hasAdminAccess={hasAdminAccess} />
    },
    {
      id: "ai-admin",
      label: "AI Admin",
      icon: Bot,
      badge: false,
      content: <AIAdminTab hasAdminAccess={hasAdminAccess} />
    },
    {
      id: "fraud",
      label: "Fraud",
      icon: AlertTriangle,
      badge: false,
      content: <FraudTab hasAdminAccess={hasAdminAccess} />
    },
    {
      id: "phone-alerts",
      label: "Phone Alerts",
      icon: Phone,
      badge: false,
      content: <PhoneAlertsTab hasAdminAccess={hasAdminAccess} />
    },
    {
      id: "connections",
      label: "Connections",
      icon: Wifi,
      badge: false,
      content: <ConnectionsTab hasAdminAccess={hasAdminAccess} />
    },
    {
      id: "export",
      label: "Export",
      icon: Download,
      badge: false,
      content: <ExportTab hasAdminAccess={hasAdminAccess} />
    },
    {
      id: "activity",
      label: "Activity",
      icon: Activity,
      badge: false,
      content: <ActivityTab hasAdminAccess={hasAdminAccess} />
    },
    {
      id: "templates",
      label: "Templates",
      icon: Palette,
      badge: false,
      content: <TemplatesTab hasAdminAccess={hasAdminAccess} />
    },
    {
      id: "rules",
      label: "Rules",
      icon: Lock,
      badge: false,
      content: <RulesTab hasAdminAccess={hasAdminAccess} />
    },
    {
      id: "blacklist",
      label: "Blacklist",
      icon: Ban,
      badge: false,
      content: <BlacklistTab hasAdminAccess={hasAdminAccess} />
    },
    {
      id: "maintenance",
      label: "Maintenance",
      icon: Wrench,
      badge: false,
      content: <MaintenanceTab hasAdminAccess={hasAdminAccess} />
    }
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-nxe-dark flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-nxe-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-white text-lg">Loading Admin Panel...</div>
          <div className="text-gray-400 text-sm">Checking authentication</div>
        </div>
      </div>
    );
  }
  
  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-nxe-dark flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="p-3 bg-red-500/20 rounded-full">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <div className="text-white text-lg">Access Denied</div>
          <div className="text-gray-400 text-sm text-center">
            You need admin privileges to access this panel.
          </div>
          <button 
            onClick={() => setLocation('/')}
            className="mt-4 px-4 py-2 bg-nxe-primary hover:bg-nxe-primary/90 text-white rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const tabCount = 18;
  const tabVariant = useResponsiveTabVariant(tabCount);

  return (
    <div className="min-h-screen bg-nxe-dark flex flex-col" data-testid="admin-panel">
      <OfflineIndicator />
      
      <AdminNavbar
        currentTab={selectedTab}
        onTabChange={setSelectedTab}
      />

      {/* Error Display Banner */}
      {hasError && (
        <div className="container mx-auto px-4 pt-4">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <h3 className="text-red-400 font-semibold">Data Loading Failed</h3>
            </div>
            <div className="text-sm text-red-300 space-y-1">
              {statsError && <p>• Statistics: {(statsError as any)?.message || 'Failed to load stats'}</p>}
              {usersError && <p>• Users: {(usersError as any)?.message || 'Failed to load users'}</p>}
              {requestsError && <p>• Requests: {(requestsError as any)?.message || 'Failed to load requests'}</p>}
              {logsError && <p>• Activity Logs: {(logsError as any)?.message || 'Failed to load logs'}</p>}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-2 bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30"
              data-testid="button-retry-admin-data"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 container mx-auto px-4 py-4 pb-24 md:pb-6">
        <ImprovedMobileTabs
          tabs={adminTabs}
          defaultTab={selectedTab}
          onTabChange={setSelectedTab}
          variant={tabVariant}
        />
      </div>

      {enablePerformanceMonitoring && performanceMetrics && (
        <PerformanceDashboard />
      )}

      <MobileBottomNav
        activeTab={selectedTab}
        onTabChange={setSelectedTab}
      />

      <FloatingActionButton />

      <MobileCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      <UserActionDialog
        actionDialog={actionDialog}
        onClose={() => setActionDialog(null)}
        onConfirm={(type, userId) => {
          toast({
            title: `${type === 'promote' ? 'Promoted' : 'Revoked'} successfully`,
            description: `User has been ${type === 'promote' ? 'promoted' : 'revoked'} successfully`
          });
          setActionDialog(null);
        }}
      />

      <DeleteConfirmationDialog
        deleteConfirmation={deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={(type, id) => {
          toast({
            title: "Deleted successfully",
            description: `Item has been deleted`
          });
          setDeleteConfirmation(null);
        }}
      />

      <BulkActionDialog
        bulkActionDialog={bulkActionDialog}
        selectedCount={0}
        onClose={() => setBulkActionDialog(null)}
        onConfirm={(type, userIds) => {
          toast({
            title: "Bulk action completed",
            description: `${userIds.length} users processed`
          });
          setBulkActionDialog(null);
        }}
      />

      <AdminFooter />
    </div>
  );
}

export default function AdminPanel() {
  return (
    <AdminPanelProvider>
      <AdminPanelContent />
    </AdminPanelProvider>
  );
}
