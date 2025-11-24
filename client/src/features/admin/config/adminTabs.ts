import { 
  BarChart3, 
  Shield, 
  Bot, 
  Users, 
  AlertTriangle, 
  Phone, 
  Link2, 
  Download, 
  Activity,
  Zap,
  DollarSign,
  Smartphone,
  FileText,
  HardDrive
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AdminTab {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: boolean;
  description?: string;
}

export const ADMIN_TABS: AdminTab[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
    badge: false,
    description: "Overview of platform metrics and statistics"
  },
  {
    id: "live-insights",
    label: "Live Insights",
    icon: Zap,
    badge: false,
    description: "Real-time analytics and live data insights"
  },
  {
    id: "sales",
    label: "Sales",
    icon: DollarSign,
    badge: false,
    description: "Sales dashboard and revenue tracking"
  },
  {
    id: "users",
    label: "Users",
    icon: Users,
    badge: true,
    description: "User management and administration"
  },
  {
    id: "devices",
    label: "Devices",
    icon: Smartphone,
    badge: false,
    description: "Device tracking and management"
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
    badge: false,
    description: "User reports and feedback system"
  },
  {
    id: "files",
    label: "Files",
    icon: HardDrive,
    badge: false,
    description: "File upload and management center"
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    badge: false,
    description: "Security monitoring and alerts"
  },
  {
    id: "ai-admin",
    label: "AI Admin",
    icon: Bot,
    badge: false,
    description: "AI-powered features and settings"
  },
  {
    id: "fraud",
    label: "Fraud",
    icon: AlertTriangle,
    badge: false,
    description: "Fraud detection and monitoring"
  },
  {
    id: "phone-alerts",
    label: "Phone Alerts",
    icon: Phone,
    badge: false,
    description: "SMS alert configuration"
  },
  {
    id: "connections",
    label: "Connections",
    icon: Link2,
    badge: false,
    description: "Connection security monitoring"
  },
  {
    id: "export",
    label: "Export",
    icon: Download,
    badge: false,
    description: "Data export center"
  },
  {
    id: "activity",
    label: "Activity",
    icon: Activity,
    badge: false,
    description: "Activity logs and monitoring"
  }
];

export const getTabById = (id: string): AdminTab | undefined => {
  return ADMIN_TABS.find(tab => tab.id === id);
};

export const getTabBadges = (stats?: { totalUsers?: number }, activityLogsCount = 0) => {
  return {
    users: stats?.totalUsers || 0,
    fraud: 0,
    activity: activityLogsCount
  };
};
