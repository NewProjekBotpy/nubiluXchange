import { useState, useRef, useEffect } from "react";
import { Search, Bell, MoreVertical, ArrowLeft, ArrowRight, Shield, Crown, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { hasAdminAccess, hasOwnerAccess } from '@shared/auth-utils';

interface TopNavbarProps {
  onShowNotifications: () => void;
}

interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'order' | 'message' | 'payment' | 'system';
  isRead: boolean;
  metadata?: {
    productId?: number;
    chatId?: number;
    transactionId?: number;
    amount?: string;
  };
  createdAt: string;
}

export default function TopNavbar({ onShowNotifications }: TopNavbarProps) {
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { confirm } = useConfirmation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLFormElement>(null);

  // Check if we're on any news-related page (/news or /news/:id)
  const isNewsPage = location.startsWith('/news');

  // Fetch notifications for unread count
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: false, // Disable automatic polling
  });

  // Calculate unread count
  const unreadCount = (notifications as Notification[]).filter(n => !n.isRead).length;

  const toggleSearch = () => {
    setSearchExpanded(!searchExpanded);
    if (searchExpanded) {
      setSearchQuery("");
    }
  };

  const closeSearch = () => {
    setSearchExpanded(false);
    setSearchQuery("");
  };

  // Focus input when search expands
  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchExpanded]);

  // Handle click outside to close search
  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (searchExpanded && 
          searchContainerRef.current && 
          !searchContainerRef.current.contains(event.target as Node)) {
        closeSearch();
      }
    };

    if (searchExpanded) {
      document.addEventListener('pointerdown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [searchExpanded]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Close search on Escape
      if (event.key === 'Escape' && searchExpanded) {
        closeSearch();
      }
      // Open search on Ctrl/Cmd + K
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setSearchExpanded(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchExpanded]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results page with query
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      closeSearch();
    }
  };

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: "Keluar dari Akun",
      description: "Apakah Anda yakin ingin keluar dari akun? Anda perlu login kembali untuk mengakses fitur yang memerlukan autentikasi.",
      confirmText: "Keluar",
      cancelText: "Batal",
      variant: "warning",
      icon: "logout"
    });
    
    if (confirmed) {
      logout();
      setLocation("/");
    }
  };

  const handleHelp = () => {
    setLocation("/help");
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return "G";
    const name = user.username || user.email || "";
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 nxe-glass border-b border-nxe-surface backdrop-blur-lg">
      <div className="h-14 px-2 sm:px-4 relative overflow-hidden">
        <div className="h-full flex items-center justify-between relative min-w-0">
          {/* Left Section - Back Button */}
          <div className={`flex items-center justify-start min-w-0 transition-all duration-500 ease-in-out ${
            searchExpanded ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
          } ${isNewsPage ? '' : 'gap-2'}`}>
            {/* Back Button - Only visible on news pages */}
            <div className={`overflow-hidden transition-all duration-500 ease-out ${
              isNewsPage ? 'w-10 opacity-100' : 'w-0 opacity-0'
            }`}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(location === '/news' ? '/' : '/news')}
                className="p-2 hover:bg-transparent hover:scale-110 shrink-0 transition-all duration-300"
                data-testid="button-back-news"
                aria-label={location === '/news' ? 'Back to Home' : 'Back to News'}
              >
                <ArrowLeft className="h-5 w-5 text-gray-300 hover:text-nxe-accent transition-colors duration-200" />
              </Button>
            </div>
          </div>

          {/* Logo - Smooth sliding between left and right positions */}
          <div 
            className={`absolute left-2 sm:left-4 top-1/2 transition-all duration-500 ease-in-out ${
              searchExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            style={{
              transform: isNewsPage 
                ? 'translateY(-50%) translateX(calc(100vw - 100% - 0.5rem - 0.5rem))' 
                : 'translateY(-50%) translateX(0)'
            }}
          >
            <button 
              onClick={() => setLocation("/")}
              className="flex items-center space-x-1 nxe-logo hover:opacity-80 transition-opacity"
              data-testid="button-logo"
            >
              <span className="font-bold text-lg text-white">
                Nubilu
              </span>
              <span className="font-bold text-lg text-nxe-accent mx-1">
                X
              </span>
              <span className="font-bold text-lg text-white relative inline-block min-w-[70px]">
                <span className="invisible" aria-hidden="true">change</span>
                <span className={`absolute left-0 top-0 inline-block transition-all duration-500 ease-in-out ${
                  isNewsPage ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
                }`}>
                  change
                </span>
                <span className={`absolute left-0 top-0 inline-block transition-all duration-500 ease-in-out ${
                  isNewsPage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}>
                  News
                </span>
              </span>
            </button>
          </div>

          {/* Animated search bar */}
          <div className={`absolute inset-x-2 sm:inset-x-4 inset-y-0 h-full flex items-center justify-center z-20 transition-all duration-500 ease-out ${
            searchExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
          }`}>
            <form 
              ref={searchContainerRef} 
              onSubmit={handleSearch} 
              className="relative w-full max-w-2xl"
            >
              <button
                type="button"
                onClick={closeSearch}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full hover:bg-gray-600/50 transition-all duration-200"
                data-testid="button-search-back"
                aria-label="Close search"
              >
                <ArrowLeft className="h-5 w-5 text-gray-400 hover:text-nxe-accent transition-colors" />
              </button>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari produk, kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-gray-700/90 rounded-full pl-12 pr-4 text-sm text-white placeholder-gray-400 border-0 focus:outline-none focus:bg-gray-600/90 focus:ring-2 focus:ring-nxe-accent/50 focus:shadow-lg focus:shadow-nxe-accent/25 selection:bg-nxe-accent selection:text-white transition-all duration-300"
                data-testid="input-search"
                autoComplete="off"
                spellCheck="false"
                aria-label="Search products"
              />
            </form>
          </div>

          {/* Right - Actions */}
          <div className={`flex items-center space-x-1 min-w-0 flex-shrink-0 transition-all duration-500 ease-in-out ${
            searchExpanded ? 'opacity-0 pointer-events-none' : ''
          } ${
            isNewsPage 
              ? 'opacity-0 translate-x-8 pointer-events-none' 
              : 'opacity-100 translate-x-0'
          }`}>
            {/* Search Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSearch}
              className="p-2 hover:bg-transparent shrink-0 hover:scale-110 transition-transform duration-200"
              data-testid="button-search-toggle"
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-gray-300 hover:text-nxe-accent transition-colors duration-200" />
            </Button>
            
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onShowNotifications}
                  className="relative p-2 hover:bg-transparent hover:scale-110 shrink-0 transition-all duration-200"
                  data-testid="button-notifications"
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                >
                  <div className="relative">
                    <Bell className="h-5 w-5 text-gray-300 hover:text-nxe-accent transition-colors duration-200" />
                    
                    {/* Notification indicator */}
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 transform">
                        <div 
                          className="w-2 h-2 bg-nxe-accent rounded-full border border-nxe-dark animate-pulse"
                          data-testid="status-notifications-unread-dot"
                          aria-label={`${unreadCount} unread notifications`}
                        />
                      </div>
                    )}
                  </div>
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 hover:bg-transparent hover:scale-110 shrink-0 transition-all duration-200 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      data-testid="button-menu"
                      aria-label="User menu"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={user?.profilePicture || undefined} alt={user?.username || "User"} />
                        <AvatarFallback className="bg-nxe-accent text-nxe-dark text-xs font-semibold">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-52 bg-nxe-surface border border-gray-600 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
                    data-testid="dropdown-menu-user"
                  >
                    {/* User info header */}
                    <div className="px-2 py-2 border-b border-gray-600">
                      <p className="text-sm font-medium text-white truncate">
                        {user?.username || user?.email}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">
                        {user?.role || 'user'}
                      </p>
                    </div>

                    <DropdownMenuItem 
                      onClick={() => setLocation("/profile")} 
                      className="cursor-pointer hover:bg-gray-700 transition-colors duration-150"
                      data-testid="menu-item-profile"
                    >
                      <span className="text-white">Profil</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      onClick={() => setLocation("/settings")} 
                      className="cursor-pointer hover:bg-gray-700 transition-colors duration-150"
                      data-testid="menu-item-settings"
                    >
                      <span className="text-white">Pengaturan</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      onClick={() => setLocation("/chat")} 
                      className="cursor-pointer hover:bg-gray-700 transition-colors duration-150"
                      data-testid="menu-item-chat"
                    >
                      <span className="text-white">Chat</span>
                    </DropdownMenuItem>
                    
                    {/* Admin Panel - Show for admin and owner roles */}
                    {hasAdminAccess(user) && (
                      <>
                        <DropdownMenuSeparator className="bg-gray-600" />
                        <DropdownMenuItem 
                          onClick={() => setLocation("/admin")} 
                          className="cursor-pointer hover:bg-blue-700/20 transition-colors duration-150"
                          data-testid="menu-item-admin"
                        >
                          <Shield className="h-4 w-4 mr-2 text-blue-400" />
                          <span className="text-blue-400">Admin Panel</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {/* Owner Dashboard - Show only for owner role */}
                    {hasOwnerAccess(user) && (
                      <DropdownMenuItem 
                        onClick={() => setLocation("/owner")} 
                        className="cursor-pointer hover:bg-purple-700/20 transition-colors duration-150"
                        data-testid="menu-item-owner"
                      >
                        <Crown className="h-4 w-4 mr-2 text-purple-400" />
                        <span className="text-purple-400">Owner Dashboard</span>
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator className="bg-gray-600" />
                    
                    <DropdownMenuItem 
                      onClick={handleHelp}
                      className="cursor-pointer hover:bg-gray-700 transition-colors duration-150"
                      data-testid="menu-item-help"
                    >
                      <HelpCircle className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-white">Bantuan</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator className="bg-gray-600" />
                    
                    <DropdownMenuItem 
                      onClick={handleLogout} 
                      className="cursor-pointer text-red-400 focus:text-red-400 hover:bg-red-400/10 transition-colors duration-150"
                      data-testid="menu-item-logout"
                    >
                      <span>Keluar</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {/* Guest Mode - Disabled notifications */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative p-2 hover:bg-transparent shrink-0 transition-all duration-200 opacity-40 cursor-not-allowed"
                  disabled
                  data-testid="button-notifications-guest"
                  aria-label="Notifications (login required)"
                >
                  <Bell className="h-5 w-5 text-gray-300" />
                </Button>

                {/* Guest Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 hover:bg-transparent hover:scale-110 shrink-0 transition-all duration-200 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      data-testid="button-menu-guest"
                      aria-label="Guest menu"
                    >
                      <MoreVertical className="h-5 w-5 text-gray-300 hover:text-white transition-colors duration-200" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-48 bg-nxe-surface border border-gray-600 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
                    data-testid="dropdown-menu-guest"
                  >
                    <DropdownMenuItem 
                      onClick={() => setLocation("/auth")} 
                      className="cursor-pointer hover:bg-gray-700 transition-colors duration-150"
                      data-testid="menu-item-login"
                    >
                      <span className="text-white">Masuk / Daftar</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator className="bg-gray-600" />
                    
                    <DropdownMenuItem 
                      onClick={handleHelp}
                      className="cursor-pointer hover:bg-gray-700 transition-colors duration-150"
                      data-testid="menu-item-help-guest"
                    >
                      <HelpCircle className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-white">Bantuan</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
