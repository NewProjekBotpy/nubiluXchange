import { 
  User, Shield, Bell, LogOut, ChevronRight,
  Lock, UserPlus, Users, MessageCircle, Palette, 
  QrCode, CheckCircle, Database, Globe, HelpCircle,
  CreditCard, Wallet, MessageSquare, Search, X, Crown
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BolderAvatar } from "@/components/ui/bolder-avatar";
import { hasAdminAccess, hasOwnerAccess } from '@shared/auth-utils';

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirmation();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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
      toast({
        title: "Logout berhasil",
        description: "Anda telah keluar dari akun dengan aman.",
      });
    }
  };

  // Focus input when search expands (matching navbar behavior)
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Handle click outside to close search
  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (showSearch && 
          searchContainerRef.current && 
          !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearch(false);
        setSearchQuery("");
      }
    };

    if (showSearch) {
      document.addEventListener('pointerdown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [showSearch]);

  const handleComingSoon = (featureName: string) => {
    toast({
      title: "Coming Soon",
      description: `${featureName} sedang dalam pengembangan dan akan tersedia segera.`,
    });
  };

  const handleSearchToggle = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery("");
    }
  };

  const handleBackClick = () => {
    if (showSearch) {
      setShowSearch(false);
      setSearchQuery("");
    } else {
      // Use browser history to go back, fallback to home if no history
      if (window.history.length > 1) {
        window.history.back();
      } else {
        setLocation("/");
      }
    }
  };


  const settingSections = [
    // Conditionally add Admin & Management section
    ...(hasAdminAccess(user) ? [{
      title: "Manajemen & Admin",
      items: [
        ...(hasAdminAccess(user) ? [{
          icon: <Shield className="h-6 w-6 text-blue-400" />,
          label: "Admin Panel",
          description: "Kelola pengguna, konten, dan moderasi",
          action: () => setLocation("/admin"),
        }] : []),
        ...(hasOwnerAccess(user) ? [{
          icon: <Crown className="h-6 w-6 text-purple-400" />,
          label: "Owner Dashboard",
          description: "Analytics, konfigurasi sistem, dan kontrol penuh",
          action: () => setLocation("/owner"),
        }] : []),
      ]
    }] : []),
    {
      title: "Akun & Keamanan",
      items: [
        {
          icon: <Lock className="h-6 w-6" />,
          label: "Akun",
          description: "Notifikasi keamanan, ganti nomor",
          action: () => setLocation("/edit-account"),
        },
        {
          icon: <Shield className="h-6 w-6" />,
          label: "Privasi",
          description: "Blokir kontak, pesan sementara",
          action: () => setLocation("/settings/privacy"),
        },
        {
          icon: <UserPlus className="h-6 w-6" />,
          label: "User Role",
          description: "Kelola peran sebagai pembeli atau penjual",
          action: () => setLocation("/settings/user-role"),
        },
      ]
    },
    {
      title: "Komunikasi & Notifikasi",
      items: [
        {
          icon: <MessageCircle className="h-6 w-6" />,
          label: "Chat",
          description: "Tema, wallpaper, riwayat chat",
          action: () => setLocation("/settings/chat"),
        },
        {
          icon: <Bell className="h-6 w-6" />,
          label: "Notifikasi",
          description: "Pesan, grup & nada dering panggilan",
          action: () => setLocation("/settings/notifications"),
        },
      ]
    },
    {
      title: "Tampilan & Bahasa",
      items: [
        {
          icon: <Palette className="h-6 w-6" />,
          label: "Theme Settings",
          description: "Kustomisasi tampilan aplikasi",
          action: () => setLocation("/settings/theme"),
        },
        {
          icon: <Globe className="h-6 w-6" />,
          label: "Ubah Bahasa",
          description: "Ubah bahasa aplikasi",
          action: () => setLocation("/settings/language"),
        },
      ]
    },
    {
      title: "Pembayaran & Keuangan",
      items: [
        {
          icon: <CreditCard className="h-6 w-6" />,
          label: "Kelola Pembayaran",
          description: "Kelola metode pembayaran user",
          action: () => setLocation("/settings/payment-management"),
        },
        {
          icon: <Wallet className="h-6 w-6" />,
          label: "Setting Akun E-Wallet",
          description: "Pengaturan akun e-wallet",
          action: () => setLocation("/settings/ewallet"),
        },
      ]
    },
    {
      title: "Data & Bantuan",
      items: [
        {
          icon: <Database className="h-6 w-6" />,
          label: "Data & Storage",
          description: "Kelola penyimpanan",
          action: () => setLocation("/settings/data-storage"),
        },
        {
          icon: <HelpCircle className="h-6 w-6" />,
          label: "Help & Support",
          description: "Dapatkan bantuan dan hubungi support",
          action: () => setLocation("/help"),
        },
        {
          icon: <MessageSquare className="h-6 w-6" />,
          label: "Feedback",
          description: "Berikan masukan untuk aplikasi",
          action: () => setLocation("/settings/feedback"),
        },
      ]
    }
  ];

  const logoutItem = {
    icon: <LogOut className="h-6 w-6" />,
    label: "Keluar",
    description: "Keluar dari akun Anda",
    action: handleLogout,
  };

  // Flatten all settings for search functionality
  const settingItems = settingSections.flatMap(section => section.items).concat(logoutItem);

  // Filter settings based on search query
  const filteredSettings = settingItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mobile-viewport-fix keyboard-smooth bg-nxe-dark px-4 py-6 pb-24">
      {/* Header - Mobile-optimized search layout */}
      <div ref={searchContainerRef} className="relative mb-6">
        {!showSearch ? (
          // Normal header layout
          <div className="flex items-center justify-between">
            <button 
              onClick={handleBackClick}
              className="text-nxe-text hover:text-nxe-primary transition-colors duration-200 shrink-0"
              data-testid="button-back"
            >
              <ChevronRight className="h-6 w-6 rotate-180" />
            </button>
            
            <h1 className="text-xl font-semibold text-white text-center flex-1">Pengaturan</h1>
            
            <button 
              onClick={handleSearchToggle}
              className="text-nxe-text hover:text-nxe-primary transition-colors duration-200 shrink-0" 
              data-testid="button-search"
            >
              <Search className="h-6 w-6" />
            </button>
          </div>
        ) : (
          // Search mode - full width centered
          <div className="flex items-center space-x-3 animate-in slide-in-from-top-2 duration-300">
            <button 
              onClick={handleBackClick}
              className="text-nxe-text hover:text-nxe-primary transition-colors duration-200 shrink-0"
              data-testid="button-back"
            >
              <ChevronRight className="h-6 w-6 rotate-180" />
            </button>
            
            <div className="flex-1">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari pengaturan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 bg-gray-700/80 text-white placeholder-gray-400 px-4 rounded-full border-0 focus:outline-none focus:bg-gray-600/90 focus:ring-2 focus:ring-green-500/50 transition-all duration-200"
                data-testid="input-search"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            
            <button 
              onClick={handleSearchToggle}
              className="text-nxe-text hover:text-nxe-primary transition-colors duration-200 shrink-0" 
              data-testid="button-search"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        )}
      </div>

      {/* Profile Section */}
      <div className="bg-nxe-card rounded-xl mb-6 overflow-hidden border border-nxe-surface/30">
        <button
          onClick={() => setLocation("/profile")}
          className="w-full p-5 text-left hover:bg-nxe-surface/40 transition-colors duration-200"
          data-testid="button-profile-container"
        >
          <div className="flex items-center space-x-4">
            {/* Avatar with user's custom settings */}
            <div className="relative">
              <BolderAvatar
                src={user?.profilePicture}
                alt="Profile"
                fallback={user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                size="md"
                withAura={false}
                data-testid="avatar-profile-settings"
              />
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-white truncate" data-testid="text-username">
                {user?.displayName || user?.username || "Pengguna"}
              </h2>
              <p className="text-gray-300 text-sm truncate" data-testid="text-contact">
                {user?.email || "Belum ada kontak"}
              </p>
              <p className="text-gray-400 text-xs" data-testid="text-status">
                {user?.role === 'admin' ? 'Administrator' : user?.role === 'owner' ? 'Pemilik' : 'Pengguna'}
              </p>
            </div>
            
            {/* QR Code and Check Icons */}
            <div className="flex space-x-4">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("/qrcode");
                }}
                className="text-nxe-primary hover:text-nxe-primary/80 transition-colors duration-200 cursor-pointer p-1"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    setLocation("/qrcode");
                  }
                }}
                data-testid="button-qr"
              >
                <QrCode className="h-6 w-6" />
              </div>
              <div className="text-nxe-primary" data-testid="icon-check">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Settings Items */}
      {showSearch && searchQuery ? (
        // Show filtered results when searching
        <div className="bg-nxe-card rounded-xl overflow-hidden border border-nxe-surface/30">
          {filteredSettings.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className="w-full p-4 flex items-center space-x-4 hover:bg-nxe-surface/50 transition-colors border-b border-nxe-border/30 last:border-b-0"
              data-testid={`button-setting-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="text-nxe-primary flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-white font-semibold leading-tight">{item.label}</h3>
                <p className="text-gray-400 text-sm mt-1 leading-relaxed">{item.description}</p>
              </div>
              <div className="flex-shrink-0">
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        // Show organized sections when not searching
        <div className="space-y-6">
          {settingSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-3">
              {/* Section Header */}
              <h2 className="text-sm font-medium text-gray-400 px-2 uppercase tracking-wide">
                {section.title}
              </h2>
              
              {/* Section Items */}
              <div className="bg-nxe-card rounded-xl overflow-hidden border border-nxe-surface/30">
                {section.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={item.action}
                    className="w-full p-4 flex items-center space-x-4 hover:bg-nxe-surface/50 transition-colors border-b border-nxe-border/30 last:border-b-0"
                    data-testid={`button-setting-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="text-nxe-primary flex-shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-white font-semibold leading-tight">{item.label}</h3>
                      <p className="text-gray-400 text-sm mt-1 leading-relaxed">{item.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          
          {/* Logout Section - Separate */}
          <div className="bg-nxe-card rounded-xl overflow-hidden border border-nxe-surface/30">
            <button
              onClick={logoutItem.action}
              className="w-full p-4 flex items-center space-x-4 hover:bg-red-500/10 transition-colors"
              data-testid={`button-setting-${logoutItem.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="text-red-500 flex-shrink-0">
                {logoutItem.icon}
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-white font-semibold leading-tight">{logoutItem.label}</h3>
                <p className="text-gray-400 text-sm mt-1 leading-relaxed">{logoutItem.description}</p>
              </div>
              <div className="flex-shrink-0">
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </div>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
