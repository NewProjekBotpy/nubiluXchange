import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Shield,
  LogOut,
  User,
  Settings,
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<any>;
  iconBgColor?: string;
  iconColor?: string;
}

export default function AdminPageHeader({ 
  title, 
  subtitle,
  icon: Icon,
  iconBgColor = "bg-nxe-primary/20",
  iconColor = "text-nxe-primary"
}: AdminPageHeaderProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
      setLocation("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-nxe-darker via-nxe-dark to-nxe-darker border-b border-nxe-border backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Breadcrumb */}
          <div className="flex items-center space-x-4">
            <Link href="/admin" className="flex items-center space-x-2 group" data-testid="link-admin-breadcrumb">
              <div className="w-8 h-8 bg-gradient-to-br from-nxe-primary to-nxe-accent rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">NXE Admin</h1>
              </div>
            </Link>
            
            {/* Breadcrumb separator */}
            <ChevronRight className="h-4 w-4 text-gray-600 hidden sm:block" />
            
            {/* Page title with icon */}
            <div className="flex items-center gap-2">
              {Icon && (
                <div className={`p-1.5 ${iconBgColor} rounded-lg hidden sm:block`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
              )}
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-white">{title}</h2>
                {subtitle && (
                  <p className="text-xs text-gray-400 hidden md:block">{subtitle}</p>
                )}
              </div>
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 text-gray-300 hover:text-white hover:bg-nxe-surface px-3 py-2 rounded-lg transition-all duration-200"
                  data-testid="button-user-menu"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden md:block text-sm">{user?.displayName || user?.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-nxe-surface border-nxe-border">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-white">{user?.displayName || user?.username}</p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                  <p className="text-xs text-nxe-primary mt-1 capitalize">{user?.role}</p>
                </div>
                <DropdownMenuSeparator className="bg-nxe-border" />
                <DropdownMenuItem 
                  onClick={() => setLocation('/profile')}
                  className="text-gray-300 hover:text-white hover:bg-nxe-dark cursor-pointer"
                  data-testid="menu-item-profile"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLocation('/admin/platform-settings')}
                  className="text-gray-300 hover:text-white hover:bg-nxe-dark cursor-pointer"
                  data-testid="menu-item-settings"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-nxe-border" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-red-400 hover:text-red-300 hover:bg-nxe-dark cursor-pointer"
                  data-testid="menu-item-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
