import DeviceTrackingDashboard from "@/components/admin/DeviceTrackingDashboard";

interface DeviceTrackingTabProps {
  hasAdminAccess?: boolean;
}

export default function DeviceTrackingTab({ hasAdminAccess = false }: DeviceTrackingTabProps) {
  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-400">You don't have permission to access device tracking.</p>
        </div>
      </div>
    );
  }

  return <DeviceTrackingDashboard hasAdminAccess={hasAdminAccess} />;
}
