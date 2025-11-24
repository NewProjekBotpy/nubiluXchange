import { useMemo } from 'react';
import { Users, Shield, Activity, AlertTriangle, CheckCircle, Clock, Database, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAdminRealtimeUpdates } from '@/hooks/useAdminRealtimeUpdates';
import { 
  LiveKPIGrid, 
  enhanceKPIWithLiveData, 
  DetailedLiveStatus, 
  LiveNotificationCenter, 
  LiveActivityFeed,
  type LiveKPIItem 
} from '@/components/admin';

interface AdminRealtimeDashboardProps {
  className?: string;
  enableNotifications?: boolean;
  enableActivityFeed?: boolean;
  enableLiveStats?: boolean;
}

export function AdminRealtimeDashboard({
  className,
  enableNotifications = true,
  enableActivityFeed = true,
  enableLiveStats = true
}: AdminRealtimeDashboardProps) {
  const {
    isConnected,
    connectionHealth,
    liveData,
    notifications,
    clearNotification,
    clearAllNotifications,
    clearActivities,
    requestStatsUpdate,
    hasNewNotifications,
    criticalNotifications,
    recentActivities,
    activeAlerts
  } = useAdminRealtimeUpdates({
    enableNotifications,
    enableLiveStats,
    enableActivityFeed,
    updateInterval: 5000
  });

  // Transform live data into KPI items with enhanced real-time indicators
  const liveKPIItems: LiveKPIItem[] = useMemo(() => {
    const baseKPIs = [
      {
        id: 'total-users',
        title: 'Total Users',
        value: liveData.stats.totalUsers,
        icon: Users,
        iconColor: 'text-nxe-accent',
        unit: 'users',
        isLive: isConnected,
        lastUpdate: liveData.stats.lastActivity,
        trend: liveData.stats.totalUsers > 0 ? 'stable' : 'none'
      },
      {
        id: 'total-admins',
        title: 'Admin Users',
        value: liveData.stats.totalAdmins,
        icon: Shield,
        iconColor: 'text-nxe-primary',
        unit: 'admins',
        isLive: isConnected,
        lastUpdate: liveData.stats.lastActivity,
        trend: 'stable'
      },
      {
        id: 'pending-requests',
        title: 'Pending Requests',
        value: liveData.stats.pendingRequests,
        icon: Clock,
        iconColor: liveData.stats.pendingRequests > 20 ? 'text-red-400' :
                   liveData.stats.pendingRequests > 10 ? 'text-yellow-400' : 'text-nxe-warning',
        status: liveData.stats.pendingRequests > 20 ? 'critical' : 
                liveData.stats.pendingRequests > 10 ? 'warning' : 'healthy',
        target: 5,
        isLive: isConnected,
        lastUpdate: liveData.stats.lastActivity,
        trend: liveData.stats.pendingRequests > 10 ? 'up' : 'stable',
        priority: liveData.stats.pendingRequests > 10 ? 'high' : 'normal'
      },
      {
        id: 'active-escrows',
        title: 'Active Escrows',
        value: liveData.stats.activeEscrows,
        icon: Database,
        iconColor: 'text-nxe-info',
        unit: 'escrows',
        isLive: isConnected,
        lastUpdate: liveData.stats.lastActivity,
        trend: 'stable'
      },
      {
        id: 'system-load',
        title: 'System Load',
        value: liveData.stats.systemLoad,
        icon: Zap,
        iconColor: liveData.stats.systemLoad > 80 ? 'text-red-400' :
                   liveData.stats.systemLoad > 60 ? 'text-yellow-400' : 'text-green-400',
        status: liveData.stats.systemLoad > 80 ? 'critical' :
                liveData.stats.systemLoad > 60 ? 'warning' : 'healthy',
        target: 100,
        unit: '%',
        isLive: isConnected,
        lastUpdate: liveData.stats.lastActivity,
        trend: liveData.stats.systemLoad > 70 ? 'up' : 'stable',
        priority: liveData.stats.systemLoad > 80 ? 'critical' : 'normal'
      },
      {
        id: 'connection-health',
        title: 'Connection Health',
        value: isConnected ? (connectionHealth.latency > 0 ? connectionHealth.latency : 'Excellent') : 'Offline',
        icon: Activity,
        iconColor: isConnected ? 
                  (connectionHealth.latency > 1000 ? 'text-red-400' : 
                   connectionHealth.latency > 500 ? 'text-yellow-400' : 'text-green-400') : 'text-red-400',
        status: !isConnected ? 'critical' : 
                connectionHealth.latency > 1000 ? 'warning' : 'healthy',
        unit: typeof connectionHealth.latency === 'number' ? 'ms' : undefined,
        isLive: true,
        lastUpdate: new Date(connectionHealth.lastPing).toISOString(),
        trend: connectionHealth.latency > 1000 ? 'up' : 'stable',
        priority: !isConnected ? 'critical' : 'normal'
      }
    ];

    return baseKPIs.map(kpi => 
      enhanceKPIWithLiveData(
        kpi, 
        {
          lastUpdated: liveData.stats.lastActivity,
          status: kpi.status
        }, 
        isConnected && enableLiveStats
      )
    );
  }, [liveData.stats, isConnected, connectionHealth, enableLiveStats]);

  // Enhanced loading states with connection status
  const isLoading = !isConnected && connectionHealth.reconnectCount === 0;
  const isReconnecting = !isConnected && connectionHealth.reconnectCount > 0;
  const hasError = !connectionHealth.isHealthy && connectionHealth.reconnectCount > 3;

  // Real-time status indicator
  const getConnectionStatusMessage = () => {
    if (hasError) return 'Connection failed - check network';
    if (isReconnecting) return `Reconnecting... (attempt ${connectionHealth.reconnectCount})`;
    if (isLoading) return 'Establishing connection...';
    if (isConnected) return `Live updates active (${connectionHealth.latency || 0}ms)`;
    return 'Connecting...';
  };

  const getConnectionStatusColor = () => {
    if (hasError) return 'text-red-400';
    if (isReconnecting) return 'text-yellow-400';
    if (isLoading) return 'text-blue-400';
    if (isConnected) return 'text-green-400';
    return 'text-gray-400';
  };

  return (
    <div className={className}>
      {/* Enhanced Connection Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Real-time Dashboard</h2>
          <div className="flex items-center gap-3">
            <DetailedLiveStatus 
              isConnected={isConnected}
              connectionHealth={connectionHealth}
            />
            {/* Enhanced Status Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
              hasError ? 'border-red-500 bg-red-500/10' :
              isReconnecting ? 'border-yellow-500 bg-yellow-500/10' :
              isLoading ? 'border-blue-500 bg-blue-500/10' :
              isConnected ? 'border-green-500 bg-green-500/10' : 'border-gray-500 bg-gray-500/10'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                hasError ? 'bg-red-400' :
                isReconnecting ? 'bg-yellow-400 animate-pulse' :
                isLoading ? 'bg-blue-400 animate-pulse' :
                isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
              }`} />
              <span className={`text-xs font-medium ${getConnectionStatusColor()}`}>
                {getConnectionStatusMessage()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {enableNotifications && (
            <LiveNotificationCenter
              notifications={notifications}
              onClearNotification={clearNotification}
              onClearAll={clearAllNotifications}
            />
          )}
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalNotifications.length > 0 && (
        <Card className="mb-6 border-red-500/50 bg-red-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-400 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Critical Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalNotifications.map(notification => (
                <div key={notification.id} className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white">{notification.title}:</span>
                  <span className="text-red-300">{notification.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live KPI Grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Live Metrics</h3>
          {isConnected && (
            <div className="flex items-center space-x-2 text-sm text-nxe-success">
              <div className="w-2 h-2 bg-nxe-success rounded-full animate-pulse" />
              <span>Real-time updates active</span>
            </div>
          )}
        </div>
        
        <LiveKPIGrid
          items={liveKPIItems}
          columns={{ mobile: 2, tablet: 3, desktop: 6 }}
          showLiveIndicators={true}
          animateChanges={true}
        />
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        {enableActivityFeed && (
          <LiveActivityFeed
            activities={recentActivities}
            onClearActivities={clearActivities}
            onRefresh={requestStatsUpdate}
            isLive={isConnected}
          />
        )}

        {/* System Overview */}
        <Card className="admin-glass">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-nxe-primary" />
              <span>System Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <span className="text-nxe-secondary">WebSocket Status</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-nxe-success animate-pulse' : 'bg-nxe-error'
                }`} />
                <span className={isConnected ? 'text-nxe-success' : 'text-nxe-error'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            <Separator />

            {/* Reconnection Count */}
            {connectionHealth.reconnectCount > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-nxe-secondary">Reconnections</span>
                  <span className="text-nxe-warning">{connectionHealth.reconnectCount}</span>
                </div>
                <Separator />
              </>
            )}

            {/* Active Alerts */}
            <div className="flex items-center justify-between">
              <span className="text-nxe-secondary">Active Alerts</span>
              <span className={activeAlerts.length > 0 ? 'text-nxe-warning' : 'text-nxe-success'}>
                {activeAlerts.length}
              </span>
            </div>

            <Separator />

            {/* Pending Notifications */}
            <div className="flex items-center justify-between">
              <span className="text-nxe-secondary">New Notifications</span>
              <span className={hasNewNotifications ? 'text-nxe-accent' : 'text-nxe-secondary'}>
                {notifications.length}
              </span>
            </div>

            <Separator />

            {/* Last Update */}
            <div className="flex items-center justify-between">
              <span className="text-nxe-secondary">Last Updated</span>
              <span className="text-nxe-text text-sm">
                {new Date(liveData.stats.lastActivity).toLocaleTimeString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}