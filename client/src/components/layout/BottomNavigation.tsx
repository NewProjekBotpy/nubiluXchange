import { RefreshCcw, MessageSquare, Plus, Wallet, Settings, LogIn, LogOut, User, Shield, Crown } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useScrollHide } from "@/hooks/useScrollHide";
import { hasOwnerAccess } from '@shared/auth-utils';

interface NavItem {
  path: string;
  icon: React.ComponentType<any>;
  label: string;
  isSpecial?: boolean;
  disabled?: boolean;
  badge?: number | boolean | null;
}

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  // Use scroll detection hook for chat pages
  const { isVisible: isScrollVisible } = useScrollHide(location);

  // Query for notification badges - MUST be called before any early returns
  const { data: unreadChats = 0 } = useQuery<number>({
    queryKey: ["/api/chats/unread"],
    enabled: isAuthenticated
  });

  const { data: walletNotifications = false } = useQuery<boolean>({
    queryKey: ["/api/wallet/notifications"], 
    enabled: isAuthenticated
  });

  // Hide bottom navigation on pages that should only use back button navigation
  // This matches the TopNavbar hiding logic for consistency
  // Note: Removed admin/owner pages from hiding logic to show admin shortcuts
  const hideBottomNavigation = location === '/auth' || 
                                location === '/upload' || 
                                location.startsWith('/upload/') ||
                                location === '/settings' || 
                                location.startsWith('/settings/') ||
                                location === '/qrcode' ||
                                (location.startsWith('/chat/') && location !== '/chat');
  
  if (hideBottomNavigation) {
    return null;
  }

  // Guest navigation items - only Market and Login
  const guestNavItems: NavItem[] = [
    { path: "/", icon: RefreshCcw, label: "Pembaruan" },
    { path: "/guest-status", icon: User, label: "Tamu" }, // Gray guest icon
    { path: "/auth", icon: LogIn, label: "Masuk" },
  ];

  // Regular authenticated user navigation items
  const authNavItems: NavItem[] = [
    { path: "/", icon: RefreshCcw, label: "Pembaruan" },
    { path: "/chat", icon: MessageSquare, label: "Chat", badge: unreadChats > 0 ? unreadChats : null },
    { path: "/upload", icon: Plus, label: "Posting", isSpecial: true },
    { path: "/wallet", icon: Wallet, label: "ewallet", badge: walletNotifications },
    { path: "/settings", icon: Settings, label: "pengaturan" },
  ];

  // Admin navigation items - only for admin and owner roles
  const adminNavItems: NavItem[] = [
    { path: "/", icon: RefreshCcw, label: "Pembaruan" },
    { path: "/admin", icon: Shield, label: "Admin Panel" },
    { path: "/upload", icon: Plus, label: "Posting", isSpecial: true },
    { path: "/wallet", icon: Wallet, label: "ewallet", badge: walletNotifications },
    { path: "/settings", icon: Settings, label: "pengaturan" },
  ];

  // Owner navigation items - only for owner role
  const ownerNavItems: NavItem[] = [
    { path: "/", icon: RefreshCcw, label: "Pembaruan" },
    { path: "/admin", icon: Shield, label: "Admin Panel" },
    { path: "/owner", icon: Crown, label: "Owner Dashboard" },
    { path: "/wallet", icon: Wallet, label: "ewallet", badge: walletNotifications },
    { path: "/settings", icon: Settings, label: "pengaturan" },
  ];

  // Determine navigation items based on user role
  let navItems: NavItem[];
  if (!isAuthenticated) {
    navItems = guestNavItems;
  } else if (hasOwnerAccess(user)) {
    navItems = ownerNavItems;
  } else if (user?.role === 'admin') {
    navItems = adminNavItems;
  } else {
    navItems = authNavItems;
  }

  const handleNavClick = (path: string, disabled?: boolean) => {
    if (disabled) {
      // Show toast for disabled items
      return;
    }
    // Handle guest status - don't navigate, it's just a status indicator
    if (path === "/guest-status") {
      return;
    }
    setLocation(path);
  };

  return (
    <nav 
      className={`fixed z-40 keyboard-smooth gpu-accelerated transition-transform duration-300 ease-in-out
        bottom-0 left-0 right-0 bottom-nav-safe md:bottom-auto md:left-auto md:top-0 md:right-0 md:h-screen md:w-20
        ${isScrollVisible ? 'translate-y-0 md:translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'}
      `}
      role="navigation"
      aria-label="Navigasi utama"
    >
      {/* Glassmorphism background dengan mobile optimization */}
      <div className="nxe-glass backdrop-blur-xl bg-nxe-surface/95 border-t md:border-t-0 md:border-l border-nxe-primary/30 shadow-2xl md:h-full">
        <div className="flex items-center justify-around md:flex-col md:justify-center md:h-full px-3 py-2 md:px-3 md:py-4 md:gap-4 max-w-md md:max-w-none mx-auto">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            const hasNotificationBadge = item.badge && (typeof item.badge === 'number' ? item.badge > 0 : item.badge);
            
            // Center FAB for special items (Posting)
            if (item.isSpecial) {
              return (
                <div key={item.path} className="relative flex flex-col items-center">
                  <Button
                    onClick={() => handleNavClick(item.path)}
                    className="relative group p-0 hover:bg-transparent"
                    variant="ghost"
                    aria-label={`${item.label} - buka halaman`}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    {/* Center FAB optimized for mobile - removed blur circle */}
                    <div className="flex items-center justify-center group-hover:scale-110 group-active:scale-95 transition-all duration-200">
                      <Icon className="h-6 w-6 md:h-5 md:w-5 text-white" />
                    </div>
                  </Button>
                  <span className="text-xs font-medium text-white mt-1 md:text-[9px] md:mt-0.5">
                    {item.label}
                  </span>
                </div>
              );
            }

            // Regular nav items
            const isGuestStatus = item.path === "/guest-status";
            return (
              <div key={item.path} className="relative flex flex-col items-center">
                <Button
                  onClick={() => handleNavClick(item.path, item.disabled)}
                  className={`p-0 transition-all duration-300 hover:bg-transparent group ${
                    item.disabled ? 'opacity-40 cursor-not-allowed' : ''
                  } ${isGuestStatus ? 'cursor-default' : ''}`}
                  variant="ghost"
                  disabled={item.disabled || isGuestStatus}
                  aria-label={isGuestStatus ? `${item.label} - status tamu` : hasNotificationBadge ? `${item.label} - ${typeof item.badge === 'number' ? item.badge : ''} notifikasi baru` : `${item.label} - buka halaman`}
                  aria-current={isActive ? 'page' : undefined}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <div className="relative flex items-center justify-center">
                    {/* Icon container optimized for mobile */}
                    <div className={`relative p-2 md:p-1.5 rounded-full transition-all duration-300 transform ${
                      isActive 
                        ? "bg-nxe-primary/15 text-nxe-primary shadow-md scale-105" 
                        : isGuestStatus 
                        ? "text-gray-400 bg-gray-100/50 dark:bg-gray-800/50"
                        : "text-gray-400 group-hover:text-nxe-primary group-hover:bg-nxe-primary/10 group-hover:scale-105"
                    }`}>
                      <Icon className={`h-5 w-5 md:h-4 md:w-4 transition-all duration-300 ${
                        isActive ? "drop-shadow-sm" : ""
                      }`} />
                      
                      {/* Active indicator - hidden on desktop vertical */}
                      {isActive && (
                        <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-nxe-primary rounded-full md:hidden" />
                      )}
                      
                      {/* Notification badge for chat */}
                      {hasNotificationBadge && item.label === "Chat" && typeof item.badge === 'number' && item.badge > 0 && (
                        <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-nxe-surface shadow-lg">
                          {item.badge > 9 ? '9+' : item.badge}
                        </div>
                      )}
                    </div>
                  </div>
                </Button>
                
                {/* Label positioned below icon on both mobile and desktop */}
                <span className={`text-xs md:text-[9px] font-medium mt-1 md:mt-0.5 transition-all duration-300 ${
                  isActive 
                    ? "text-nxe-primary font-semibold" 
                    : isGuestStatus
                    ? "text-gray-400"
                    : "text-gray-400"
                }`}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
