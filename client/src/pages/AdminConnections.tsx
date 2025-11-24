import { Wifi } from "lucide-react";
import { AdminPageHeader, MobileBottomNav } from "@/components/admin";
import ConnectionSecurityDashboard from "@/components/admin/ConnectionSecurityDashboard";
import PullToRefresh from "@/components/admin/PullToRefresh";
import { queryClient } from "@/lib/queryClient";
import { AdminPanelProvider } from "@/features/admin";

function AdminConnectionsContent() {
  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/admin/connections'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/admin/security'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  return (
    <div className="min-h-screen bg-nxe-dark pb-20">
      <AdminPageHeader 
        title="Connection Security"
        subtitle="Monitor and secure user connections"
        icon={Wifi}
        iconBgColor="bg-cyan-500/20"
        iconColor="text-cyan-400"
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="space-y-4" data-testid="connections-page-content">
            <ConnectionSecurityDashboard />
          </div>
        </PullToRefresh>
      </div>

      <MobileBottomNav activeTab="connections" onTabChange={() => {}} />
    </div>
  );
}

export default function AdminConnections() {
  return (
    <AdminPanelProvider>
      <AdminConnectionsContent />
    </AdminPanelProvider>
  );
}
