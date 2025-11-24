import { useCallback } from "react";
import { useLocation } from "wouter";
import { Users, Shield, DollarSign, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AdminPanelProvider, useAdminPanel } from "@/features/admin";
import { MobileBottomNav, QuickAccessPills } from "@/components/admin";
import { KPIGrid } from "@/components/admin";
import type { KPIItem } from "@/components/admin/KPIGrid";
import { DashboardSkeleton } from "@/components/ui/skeleton-loader";
import { useAdminData } from "@/components/admin/hooks/useAdminData";
import AdvancedFeaturesHub from "@/components/admin/AdvancedFeaturesHub";
import ComprehensiveAnalytics from "@/components/admin/ComprehensiveAnalytics";

function DashboardContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: authUser, isAuthenticated } = useAuth();
  const { isRealTimeEnabled } = useAdminPanel();

  const hasAdminAccess = Boolean(isAuthenticated && authUser && (authUser.role === 'admin' || authUser.role === 'owner'));

  const { stats, statsLoading, refetchStats } = useAdminData({ hasAdminAccess, isRealTimeEnabled });

  const handleRefresh = useCallback(async () => {
    if (!hasAdminAccess) return;
    
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] }),
      refetchStats()
    ]);
    
    toast({ title: "Refreshed", description: "Dashboard data updated" });
  }, [queryClient, toast, hasAdminAccess, refetchStats]);

  const kpiItems: KPIItem[] = [
    {
      title: "Users",
      value: stats?.totalUsers || 0,
      subtitle: "Total",
      icon: Users,
      iconColor: "text-nxe-primary",
      isLoading: statsLoading
    },
    {
      title: "Admins", 
      value: stats?.totalAdmins || 0,
      subtitle: "Active",
      icon: Shield,
      iconColor: "text-blue-400",
      isLoading: statsLoading
    },
    {
      title: "Products",
      value: stats?.totalProducts || 0,
      subtitle: "Listed",
      icon: CheckCircle,
      iconColor: "text-green-400",
      isLoading: statsLoading
    },
    {
      title: "Requests",
      value: stats?.pendingAdminRequests || 0,
      subtitle: "Pending",
      icon: AlertTriangle,
      iconColor: "text-yellow-400",
      isLoading: statsLoading
    }
  ];

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-nxe-dark pb-20">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nxe-dark pb-20">
      <div className="sticky top-0 z-40 bg-nxe-dark/95 backdrop-blur-sm border-b border-nxe-border">
        <div className="container mx-auto px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between">
          <div>
            <h1 className="text-sm sm:text-lg font-bold text-white">Dashboard</h1>
            <p className="text-[10px] sm:text-xs text-gray-400">Admin overview</p>
          </div>
          <Button
            onClick={handleRefresh}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 sm:h-8 sm:w-8"
            data-testid="button-refresh-dashboard"
          >
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-3 py-2 sm:py-3 space-y-4">
        <KPIGrid items={kpiItems} />
        
        <QuickAccessPills />
        
        <ComprehensiveAnalytics />
        
        <AdvancedFeaturesHub />
      </div>

      <MobileBottomNav activeTab="dashboard" onTabChange={() => {}} />
    </div>
  );
}

export default function Dashboard() {
  return (
    <AdminPanelProvider>
      <DashboardContent />
    </AdminPanelProvider>
  );
}
