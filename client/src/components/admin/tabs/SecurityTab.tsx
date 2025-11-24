import SecurityDashboard from "@/components/admin/SecurityDashboard";
import { useAdminData } from "@/components/admin/hooks/useAdminData";

interface SecurityTabProps {
  hasAdminAccess?: boolean;
}

export default function SecurityTab({ hasAdminAccess = false }: SecurityTabProps) {
  return <SecurityDashboard hasAdminAccess={hasAdminAccess} />;
}
