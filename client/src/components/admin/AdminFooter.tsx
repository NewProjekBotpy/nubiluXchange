import { useState, useEffect } from "react";
import { 
  Shield, 
  Clock, 
  Users, 
  Activity, 
  Server, 
  Wifi, 
  Database,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Heart,
  Code,
  Zap,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminData } from "@/components/admin/hooks/useAdminData";
import { useAdminPanel } from "@/features/admin/context/AdminPanelContext";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { hasAdminAccess } from '@shared/auth-utils';

interface SystemHealth {
  cpu: number;
  memory: number;
  requests: number;
  responseTime: number;
  errorRate: number;
  status: 'healthy' | 'degraded' | 'critical';
}

export default function AdminFooter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isRealTimeEnabled } = useAdminPanel();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get real admin data
  const hasAccess = hasAdminAccess(user);
  const { stats, statsLoading, statsError, refetchStats } = useAdminData({ 
    hasAdminAccess: hasAccess, 
    isRealTimeEnabled 
  });

  // Get system health data
  const { data: systemHealth, isLoading: healthLoading, error: healthError, refetch: refetchHealth } = useQuery<SystemHealth>({
    queryKey: ['/api/admin/live/health'],
    refetchInterval: isRealTimeEnabled ? 30000 : 0,
    staleTime: 15000,
    enabled: hasAccess,
    retry: 2,
  });

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
      case 'maintenance':
        return 'bg-yellow-500';
      case 'offline':
      case 'down':
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'degraded':
      case 'maintenance':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'offline':
      case 'down':
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const handleRefreshAll = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/requests'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/activity-logs'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/live/health'] }),
      ]);
      
      toast({
        title: "Data Refreshed",
        description: "All admin data has been refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSystemHealthCheck = async () => {
    try {
      const result = await refetchHealth();
      const freshStatus = result.data?.status || 'unknown';
      toast({
        title: "Health Check Complete",
        description: `System status: ${freshStatus}`,
      });
    } catch (error) {
      toast({
        title: "Health Check Failed",
        description: "Failed to check system health",
        variant: "destructive",
      });
    }
  };

  const handleViewLogs = () => {
    setLocation('/admin/activity');
  };

  // Database status (derived from system health)
  const databaseStatus = healthError ? 'offline' : (systemHealth?.status === 'critical' ? 'maintenance' : 'online');
  const apiStatus = healthError ? 'down' : (systemHealth?.status || 'healthy');

  // Calculate active users from stats
  const activeUsers = stats?.totalUsers || 0;
  const totalRequests = systemHealth?.requests || 0;

  return (
    <TooltipProvider>
      <footer className="bg-gradient-to-r from-nxe-darker via-nxe-dark to-nxe-darker border-t border-nxe-border">
        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* System Status */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center">
                <Server className="h-4 w-4 mr-2 text-nxe-primary" />
                System Status
              </h3>
              <div className="space-y-1">
                {healthLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    <span className="text-xs text-gray-400">Loading...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Database</span>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(databaseStatus)}
                        <Badge variant="outline" className="text-xs border-nxe-border text-gray-300 px-2 py-1">
                          {databaseStatus}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">API</span>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(apiStatus)}
                        <Badge variant="outline" className="text-xs border-nxe-border text-gray-300 px-2 py-1">
                          {apiStatus}
                        </Badge>
                      </div>
                    </div>
                    {systemHealth && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Response Time</span>
                        <span className="text-xs text-green-400">{systemHealth.responseTime}ms</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Statistics */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center">
                <Activity className="h-4 w-4 mr-2 text-nxe-primary" />
                Live Stats
              </h3>
              <div className="space-y-1">
                {statsLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    <span className="text-xs text-gray-400">Loading...</span>
                  </div>
                ) : statsError ? (
                  <div className="text-xs text-red-400">Error loading stats</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Active Users</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-white font-medium" data-testid="text-active-users">
                          {activeUsers}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Total Requests</span>
                      <span className="text-xs text-white font-medium" data-testid="text-total-requests">
                        {totalRequests.toLocaleString()}
                      </span>
                    </div>
                    {systemHealth && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Memory</span>
                        <span className={`text-xs font-medium ${systemHealth.memory > 80 ? 'text-red-400' : 'text-green-400'}`}>
                          {systemHealth.memory}%
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Date & Time */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center">
                <Clock className="h-4 w-4 mr-2 text-nxe-primary" />
                Current Time
              </h3>
              <div className="space-y-1">
                <div className="text-lg font-mono text-nxe-primary" data-testid="text-current-time">
                  {formatTime(currentTime)}
                </div>
                <div className="text-xs text-gray-400" data-testid="text-current-date">
                  {formatDate(currentTime)}
                </div>
                <div className="text-xs text-gray-500">
                  Server Time (UTC)
                </div>
              </div>
            </div>

            {/* Admin Info */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center">
                <Shield className="h-4 w-4 mr-2 text-nxe-primary" />
                Admin Session
              </h3>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">User</span>
                  <span className="text-xs text-white font-medium" data-testid="text-admin-username">
                    {user?.username}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Role</span>
                  <Badge variant="outline" className="text-xs border-nxe-primary text-nxe-primary" data-testid="badge-admin-role">
                    {user?.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Session</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-green-400">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions Bar */}
        <div className="bg-nxe-surface border-t border-nxe-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
              
              {/* Left side - Quick Actions */}
              <div className="flex items-center space-x-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-nxe-card transition-all duration-200"
                      onClick={handleRefreshAll}
                      disabled={isRefreshing}
                      data-testid="button-refresh-data"
                      aria-label="Refresh all data"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh All Data</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-nxe-card transition-all duration-200"
                      onClick={handleSystemHealthCheck}
                      data-testid="button-system-health"
                      aria-label="Check system health"
                    >
                      <Database className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>System Health Check</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-nxe-card transition-all duration-200"
                      onClick={handleViewLogs}
                      data-testid="button-view-logs"
                      aria-label="View system logs"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View System Logs</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Center - Version & Status */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <Code className="h-3 w-3" />
                  <span>NXE Admin v2.1.0</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <Zap className="h-3 w-3" />
                  <span>{isRealTimeEnabled ? 'Real-time Mode' : 'Performance Mode'}</span>
                </div>
              </div>

              {/* Right side - Copyright */}
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <span>© 2025 NXE Marketplace</span>
                <Heart className="h-3 w-3 text-red-400" />
                <span>Built with care</span>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Status Indicator */}
        <div className="bg-nxe-surface">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-1">
              <div className="flex items-center space-x-2 text-xs" data-testid="connection-status">
                {healthError ? (
                  <>
                    <AlertTriangle className="h-3 w-3 text-red-400" />
                    <span className="text-red-400">Connection Lost</span>
                    <div className="w-1 h-1 bg-red-400 rounded-full animate-pulse"></div>
                  </>
                ) : (
                  <>
                    <Wifi className="h-3 w-3 text-green-400" />
                    <span className="text-green-400">Connected to NXE Cloud</span>
                    <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </TooltipProvider>
  );
}
