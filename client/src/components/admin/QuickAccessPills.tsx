import { Link } from "wouter";
import { 
  ShieldAlert, 
  Phone, 
  Wifi, 
  Download, 
  Activity,
  Zap,
  TrendingUp,
  Smartphone,
  FileText,
  Upload,
  Video,
  LucideIcon 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAccessPill {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  color: string;
}

const quickAccessItems: QuickAccessPill[] = [
  {
    id: "live-insights",
    label: "Live Insights",
    icon: Zap,
    href: "/admin/live-insights",
    color: "text-yellow-400 bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/30"
  },
  {
    id: "sales",
    label: "Sales",
    icon: TrendingUp,
    href: "/admin/sales-dashboard",
    color: "text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30"
  },
  {
    id: "video-content",
    label: "Videos",
    icon: Video,
    href: "/admin/video-content",
    color: "text-fuchsia-400 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border-fuchsia-500/30"
  },
  {
    id: "devices",
    label: "Devices",
    icon: Smartphone,
    href: "/admin/device-tracking",
    color: "text-cyan-400 bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/30"
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
    href: "/admin/user-reports-system",
    color: "text-indigo-400 bg-indigo-500/20 hover:bg-indigo-500/30 border-indigo-500/30"
  },
  {
    id: "upload",
    label: "Upload",
    icon: Upload,
    href: "/admin/file-upload",
    color: "text-pink-400 bg-pink-500/20 hover:bg-pink-500/30 border-pink-500/30"
  },
  {
    id: "fraud",
    label: "Fraud Monitor",
    icon: ShieldAlert,
    href: "/admin/fraud",
    color: "text-red-400 bg-red-500/20 hover:bg-red-500/30 border-red-500/30"
  },
  {
    id: "phone-alerts",
    label: "Phone Alerts",
    icon: Phone,
    href: "/admin/phone-alerts",
    color: "text-blue-400 bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30"
  },
  {
    id: "connections",
    label: "Connections",
    icon: Wifi,
    href: "/admin/connections",
    color: "text-green-400 bg-green-500/20 hover:bg-green-500/30 border-green-500/30"
  },
  {
    id: "export",
    label: "Data Export",
    icon: Download,
    href: "/admin/export",
    color: "text-purple-400 bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/30"
  },
  {
    id: "activity",
    label: "Activity Log",
    icon: Activity,
    href: "/admin/activity",
    color: "text-orange-400 bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/30"
  }
];

export default function QuickAccessPills() {
  return (
    <div 
      className="relative"
      data-testid="quick-access-pills"
    >
      <div 
        className="grid grid-cols-5 grid-rows-2 gap-2 sm:flex sm:gap-2 sm:overflow-x-auto sm:pb-2 sm:snap-x sm:snap-mandatory sm:touch-pan-x"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {quickAccessItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "flex items-center justify-center gap-0.5 sm:gap-2 px-1.5 py-1 sm:px-4 sm:py-3 rounded-full border",
              "whitespace-nowrap transition-all duration-200",
              "touch-manipulation active:scale-95",
              "sm:snap-start sm:flex-shrink-0",
              item.color
            )}
            data-testid={`pill-${item.id}`}
          >
            <item.icon className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
            <span className={cn(
              "font-medium",
              item.label.includes(' ') ? "text-[0.5rem] sm:text-sm" : "text-[0.6rem] sm:text-sm"
            )}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
          .overflow-x-auto::-webkit-scrollbar {
            display: none;
          }
        `
      }} />
    </div>
  );
}
