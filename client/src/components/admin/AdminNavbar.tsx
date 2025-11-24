import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { 
  Menu, 
  X, 
  User, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  Shield,
  Database,
  Activity,
  Users,
  FileText,
  BarChart3,
  Palette,
  Lock,
  Bot,
  BookOpen,
  CreditCard,
  AlertTriangle,
  Phone,
  Link2,
  Download
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";

interface AdminNavbarProps {
  onTabChange?: (tab: string) => void;
  currentTab?: string;
}

interface TabItem {
  id: string;
  label: string;
  icon: any;
  path?: string;
}


export default function AdminNavbar({ onTabChange, currentTab = "dashboard" }: AdminNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch search results
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['/api/admin/search', debouncedSearch],
    queryFn: async () => {
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(debouncedSearch)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: debouncedSearch.length >= 2,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show results when we have search term
  useEffect(() => {
    setShowSearchResults(debouncedSearch.length >= 2);
  }, [debouncedSearch]);

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

  const adminTabs: TabItem[] = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "security", label: "Security", icon: Shield },
    { id: "ai-admin", label: "AI Admin", icon: Bot },
    { id: "fraud", label: "Fraud", icon: AlertTriangle },
    { id: "activity", label: "Activity", icon: Activity }
  ];

  const handleTabClick = (tabId: string) => {
    const tab = adminTabs.find(t => t.id === tabId);
    if (tab?.path) {
      setLocation(tab.path);
    } else if (onTabChange) {
      onTabChange(tabId);
    }
    setIsMenuOpen(false);
  };


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleSearchResultClick = (url: string) => {
    setLocation(url);
    setSearchTerm("");
    setDebouncedSearch("");
    setShowSearchResults(false);
  };

  return (
    <nav className="bg-gradient-to-r from-nxe-darker via-nxe-dark to-nxe-darker border-b border-nxe-border">
      {/* Main Navbar - Sticky */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-nxe-darker via-nxe-dark to-nxe-darker backdrop-blur-sm border-b border-nxe-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-nxe-primary to-nxe-accent rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-white">NXE Admin</h1>
                <p className="text-xs text-gray-400">Control Panel</p>
              </div>
            </Link>
          </div>

          {/* Search Bar - Hidden on small screens */}
          <div className="hidden md:block flex-1 max-w-md mx-8" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text"
                placeholder="Search users, activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-nxe-surface border-nxe-border text-white placeholder-gray-400 focus:ring-2 focus:ring-nxe-primary focus:border-nxe-primary transition-all duration-200"
                data-testid="input-admin-search"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              
              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full mt-2 w-full bg-nxe-surface border border-nxe-border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                  {isSearching && (
                    <div className="p-4 text-center text-gray-400">Searching...</div>
                  )}
                  
                  {!isSearching && searchResults?.results?.length === 0 && (
                    <div className="p-4 text-center text-gray-400">No results found</div>
                  )}
                  
                  {!isSearching && searchResults?.results?.length > 0 && (
                    <div className="py-2">
                      {searchResults.results.map((result: any, idx: number) => (
                        <button
                          key={`${result.type}-${result.id}-${idx}`}
                          onClick={() => handleSearchResultClick(result.url)}
                          className="w-full px-4 py-3 text-left hover:bg-nxe-dark transition-colors border-b border-nxe-border last:border-b-0"
                          data-testid={`search-result-${result.type}-${idx}`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              {result.type === 'user' && <Users className="h-5 w-5 text-nxe-primary" />}
                              {result.type === 'activity' && <Activity className="h-5 w-5 text-blue-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{result.title}</p>
                              <p className="text-xs text-gray-400 truncate">{result.subtitle}</p>
                              {result.metadata && (
                                <div className="flex gap-2 mt-1">
                                  {result.metadata.role && (
                                    <span className="text-xs px-2 py-0.5 bg-nxe-primary/20 text-nxe-primary rounded">
                                      {result.metadata.role}
                                    </span>
                                  )}
                                  {result.metadata.category && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                      {result.metadata.category}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {adminTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-nxe-primary text-white shadow-lg ring-2 ring-nxe-primary/20"
                      : "text-gray-300 hover:text-white hover:bg-nxe-surface"
                  }`}
                  data-testid={`button-tab-${tab.id}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden xl:block">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right side controls */}
          <div className="flex items-center space-x-2">
            {/* Mobile Search Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="md:hidden h-10 w-10 text-gray-300 hover:text-white hover:bg-nxe-surface transition-all duration-200"
              data-testid="button-mobile-search"
            >
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 text-gray-300 hover:text-white hover:bg-nxe-surface transition-all duration-200"
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 text-gray-300 hover:text-white hover:bg-nxe-surface px-3 py-2 rounded-lg transition-all duration-200"
                  data-testid="button-user-menu"
                >
                  <User className="h-5 w-5" />
                  <span className="hidden sm:block text-sm font-medium">
                    {user?.username || "Admin"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-nxe-surface border-nxe-border shadow-lg">
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-nxe-dark">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-nxe-dark">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-nxe-border" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden h-10 w-10 text-gray-300 hover:text-white hover:bg-nxe-surface transition-all duration-200"
              data-testid="button-mobile-menu"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Search Drawer */}
        {isSearchOpen && (
          <div className="md:hidden border-t border-nxe-border bg-nxe-surface/95 backdrop-blur-sm">
            <div className="p-4">
              <div className="flex items-center space-x-2">
                <form onSubmit={handleSearch} className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="Search admin data..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-nxe-dark border-nxe-border text-white placeholder-gray-400 focus:ring-2 focus:ring-nxe-primary focus:border-nxe-primary transition-all duration-200"
                    data-testid="input-mobile-search"
                    autoFocus
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </form>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchTerm("");
                    setDebouncedSearch("");
                  }}
                  className="h-10 w-10 text-gray-300 hover:text-white hover:bg-nxe-dark flex-shrink-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Search Results for Mobile */}
              {showSearchResults && (
                <div className="mt-3 bg-nxe-dark border border-nxe-border rounded-lg max-h-60 overflow-y-auto">
                  {isSearching && (
                    <div className="p-4 text-center text-gray-400">Searching...</div>
                  )}
                  
                  {!isSearching && searchResults?.results?.length === 0 && (
                    <div className="p-4 text-center text-gray-400">No results found</div>
                  )}
                  
                  {!isSearching && searchResults?.results?.length > 0 && (
                    <div className="py-2">
                      {searchResults.results.map((result: any, idx: number) => (
                        <button
                          key={`${result.type}-${result.id}-${idx}`}
                          onClick={() => {
                            handleSearchResultClick(result.url);
                            setIsSearchOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-nxe-surface transition-colors border-b border-nxe-border last:border-b-0"
                          data-testid={`search-result-${result.type}-${idx}`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              {result.type === 'user' && <Users className="h-5 w-5 text-nxe-primary" />}
                              {result.type === 'activity' && <Activity className="h-5 w-5 text-blue-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{result.title}</p>
                              <p className="text-xs text-gray-400 truncate">{result.subtitle}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-nxe-surface border-t border-nxe-border">
          <div className="px-4 py-4 space-y-2">
            {adminTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-nxe-primary text-white shadow-lg ring-2 ring-nxe-primary/20"
                      : "text-gray-300 hover:text-white hover:bg-nxe-card"
                  }`}
                  data-testid={`button-mobile-tab-${tab.id}`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Indicator for current section - Hidden on Mobile */}
      <div className="hidden md:block bg-nxe-surface border-t border-nxe-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-2">
              {(() => {
                const currentTabData = adminTabs.find(tab => tab.id === currentTab);
                if (currentTabData) {
                  const Icon = currentTabData.icon;
                  return (
                    <>
                      <Icon className="h-4 w-4 text-nxe-primary" />
                      <span className="text-sm font-medium text-white">
                        {currentTabData.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        / Admin Panel
                      </span>
                    </>
                  );
                }
                return null;
              })()}
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-xs text-green-400">Online</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}