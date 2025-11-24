import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Users, 
  Shield,
  Activity,
  AlertTriangle,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange?: (tabId: string) => void;
  badges?: Record<string, number>;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: number;
  route?: string;
}

export default function MobileBottomNav({ 
  activeTab, 
  onTabChange, 
  badges = {} 
}: MobileBottomNavProps) {
  const [rippleEffect, setRippleEffect] = useState<string | null>(null);
  const [location, setLocation] = useLocation();

  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3, route: "/admin" },
    { id: "users", label: "Users", icon: Users, badge: badges.users, route: "/admin" },
    { id: "security", label: "Security", icon: Shield, route: "/admin" },
    { id: "fraud", label: "Fraud", icon: AlertTriangle, badge: badges.fraud, route: "/admin" },
    { id: "activity", label: "Activity", icon: Activity, badge: badges.activity, route: "/admin" },
    { id: "live-insights", label: "Insights", icon: Zap, route: "/admin" }
  ];

  const handleNavClick = (item: NavItem) => {
    setRippleEffect(item.id);
    
    // Check if we're already on the exact target page/tab
    const isOnStandalonePage = location === `/admin/${item.id}`;
    const isOnAdminPanelWithSameTab = location === "/admin" && activeTab === item.id;
    const isOnDashboardAlready = item.id === "dashboard" && location === "/admin" && activeTab === "dashboard";
    
    // If already on the target page/tab, do nothing
    if (isOnStandalonePage || isOnAdminPanelWithSameTab || isOnDashboardAlready) {
      setTimeout(() => setRippleEffect(null), 600);
      return;
    }
    
    // If we're not on the admin panel, navigate there first
    if (location !== "/admin" && item.route) {
      setLocation(item.route);
      // Wait a bit for navigation then trigger tab change
      setTimeout(() => {
        if (onTabChange) {
          onTabChange(item.id);
        }
      }, 100);
    } else {
      // Already on admin panel, just change tab
      if (onTabChange) {
        onTabChange(item.id);
      }
    }
    
    setTimeout(() => setRippleEffect(null), 600);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[999] bg-nxe-card border-t border-nxe-border md:hidden safe-bottom">
      {/* Simplified gradient top border */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-nxe-primary/60 to-transparent" />
      
      <div className="grid grid-cols-6 h-16 px-0.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          const hasRipple = rippleEffect === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 transition-all duration-300 group",
                "active:scale-95",
                isActive ? "text-nxe-primary" : "text-gray-400"
              )}
              data-testid={`bottomnav-${item.id}`}
            >
              {/* Tap ripple effect */}
              {hasRipple && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-nxe-primary/30 animate-ping" />
                </div>
              )}
              
              {/* Icon container */}
              <div className="relative">
                <div className={cn(
                  "relative p-2 rounded-xl transition-all duration-300",
                  isActive 
                    ? "bg-nxe-primary/15 scale-105" 
                    : "bg-transparent group-hover:bg-nxe-surface/50"
                )}>
                  <Icon className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isActive && "scale-110"
                  )} />
                </div>
                
                {/* Badge */}
                {item.badge && item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className={cn(
                      "absolute -top-1 -right-1 h-4 min-w-[16px] text-[10px] px-1 flex items-center justify-center",
                      "shadow-md shadow-red-500/30 ring-1 ring-nxe-card"
                    )}
                    data-testid={`badge-${item.id}`}
                  >
                    {item.badge > 99 ? "99" : item.badge}
                  </Badge>
                )}
              </div>
              
              {/* Label */}
              <span className={cn(
                "text-[10px] font-medium transition-all duration-300",
                isActive 
                  ? "text-nxe-primary font-semibold" 
                  : "text-gray-400 group-hover:text-gray-300"
              )}>
                {item.label}
              </span>
              
              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-nxe-primary animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
