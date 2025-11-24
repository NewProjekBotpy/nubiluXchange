import { Phone } from "lucide-react";
import { AdminPageHeader, MobileBottomNav } from "@/components/admin";
import PhoneAlertsManager from "@/components/admin/PhoneAlertsManager";
import PullToRefresh from "@/components/admin/PullToRefresh";
import { queryClient } from "@/lib/queryClient";
import { AdminPanelProvider } from "@/features/admin";

function AdminPhoneAlertsContent() {
  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/admin/phone-alerts'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  return (
    <div className="min-h-screen bg-nxe-dark pb-20">
      <AdminPageHeader 
        title="Phone Alerts Manager"
        subtitle="SMS alerts and notifications configuration"
        icon={Phone}
        iconBgColor="bg-green-500/20"
        iconColor="text-green-400"
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="space-y-4" data-testid="phone-alerts-page-content">
            <PhoneAlertsManager />
          </div>
        </PullToRefresh>
      </div>

      <MobileBottomNav activeTab="phone-alerts" onTabChange={() => {}} />
    </div>
  );
}

export default function AdminPhoneAlerts() {
  return (
    <AdminPanelProvider>
      <AdminPhoneAlertsContent />
    </AdminPanelProvider>
  );
}
