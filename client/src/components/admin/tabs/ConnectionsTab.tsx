import ConnectionSecurityDashboard from "@/components/admin/ConnectionSecurityDashboard";

interface ConnectionsTabProps {
  hasAdminAccess?: boolean;
}

export default function ConnectionsTab({ hasAdminAccess = false }: ConnectionsTabProps) {
  return <ConnectionSecurityDashboard hasAdminAccess={hasAdminAccess} />;
}
