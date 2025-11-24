import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { AdminPanelProvider } from "@/features/admin";
import { MobileBottomNav, DeviceTrackingDashboard } from "@/components/admin";
import { useAuth } from "@/contexts/AuthContext";

function DeviceTrackingContent() {
  const [, setLocation] = useLocation();
  const { user: authUser, isAuthenticated } = useAuth();
  const hasAdminAccess = Boolean(isAuthenticated && authUser && (authUser.role === 'admin' || authUser.role === 'owner'));

  return (
    <div className="min-h-screen bg-nxe-dark pb-20">
      <div className="sticky top-0 z-40 bg-nxe-dark/95 backdrop-blur-sm border-b border-nxe-border">
        <div className="container mx-auto px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2">
          <Button
            onClick={() => setLocation("/admin")}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 sm:h-8 sm:w-8"
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <div>
            <h1 className="text-sm sm:text-lg font-bold text-white">Device Tracking</h1>
            <p className="text-[10px] sm:text-xs text-gray-400">Monitor devices</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-3 py-2 sm:py-3">
        <DeviceTrackingDashboard hasAdminAccess={hasAdminAccess} />
      </div>

      <MobileBottomNav activeTab="devices" onTabChange={() => {}} />
    </div>
  );
}

export default function DeviceTracking() {
  return (
    <AdminPanelProvider>
      <DeviceTrackingContent />
    </AdminPanelProvider>
  );
}
