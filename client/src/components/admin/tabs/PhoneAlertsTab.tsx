import PhoneAlertsManager from "@/components/admin/PhoneAlertsManager";

interface PhoneAlertsTabProps {
  hasAdminAccess?: boolean;
}

export default function PhoneAlertsTab({ hasAdminAccess = false }: PhoneAlertsTabProps) {
  return <PhoneAlertsManager hasAdminAccess={hasAdminAccess} />;
}
