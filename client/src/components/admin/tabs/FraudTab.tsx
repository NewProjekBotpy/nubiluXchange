import FraudMonitoringDashboard from "@/components/admin/FraudMonitoringDashboard";

interface FraudTabProps {
  hasAdminAccess?: boolean;
}

export default function FraudTab({ hasAdminAccess = false }: FraudTabProps) {
  return <FraudMonitoringDashboard hasAdminAccess={hasAdminAccess} />;
}
