import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Eye,
  BarChart3,
  LineChart as LineChartIcon,
  RefreshCw,
  XCircle
} from 'lucide-react';

interface LiveMetric {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: string;
}

interface LiveActivity {
  id: string;
  type: 'order' | 'user' | 'payment' | 'alert';
  message: string;
  timestamp: string;
  severity?: 'info' | 'warning' | 'error';
}

interface SystemHealth {
  cpu: number;
  memory: number;
  requests: number;
  responseTime: number;
  errorRate: number;
  status: 'healthy' | 'degraded' | 'critical';
}

export default function LiveInsightsDashboard() {
  const [liveActivities, setLiveActivities] = useState<LiveActivity[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  // Fetch initial metrics
  const { data: metrics, refetch: refetchMetrics } = useQuery<LiveMetric[]>({
    queryKey: ['/api/admin/live/metrics'],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch system health
  const { data: health, refetch: refetchHealth } = useQuery<SystemHealth>({
    queryKey: ['/api/admin/live/health'],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket(null, {
    onMessage: (message) => {
      if (message.type === 'activity') {
        setLiveActivities(prev => [message.data, ...prev].slice(0, 50)); // Keep last 50 activities
      } else if (message.type === 'metric_update') {
        refetchMetrics();
      } else if (message.type === 'health_update') {
        refetchHealth();
      }
    },
    onConnect: () => {
      setConnectionStatus('connected');
    },
    onDisconnect: () => {
      setConnectionStatus('disconnected');
    },
    autoReconnect: true
  });

  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [isConnected]);

  const getMetricIcon = (iconName: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      users: <Users className="h-5 w-5" />,
      revenue: <DollarSign className="h-5 w-5" />,
      orders: <ShoppingCart className="h-5 w-5" />,
      alerts: <AlertTriangle className="h-5 w-5" />,
      activity: <Activity className="h-5 w-5" />
    };
    return iconMap[iconName] || <Activity className="h-5 w-5" />;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingCart className="h-4 w-4 text-blue-400" />;
      case 'user': return <Users className="h-4 w-4 text-green-400" />;
      case 'payment': return <DollarSign className="h-4 w-4 text-yellow-400" />;
      case 'alert': return <AlertTriangle className="h-4 w-4 text-red-400" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getActivityColor = (severity?: string) => {
    switch (severity) {
      case 'error': return 'border-l-red-500';
      case 'warning': return 'border-l-yellow-500';
      default: return 'border-l-blue-500';
    }
  };

  const getHealthStatus = () => {
    if (!health) return { color: 'text-gray-400', label: 'Unknown', bg: 'bg-gray-500/20' };
    
    switch (health.status) {
      case 'healthy':
        return { color: 'text-green-400', label: 'Healthy', bg: 'bg-green-500/20' };
      case 'degraded':
        return { color: 'text-yellow-400', label: 'Degraded', bg: 'bg-yellow-500/20' };
      case 'critical':
        return { color: 'text-red-400', label: 'Critical', bg: 'bg-red-500/20' };
      default:
        return { color: 'text-gray-400', label: 'Unknown', bg: 'bg-gray-500/20' };
    }
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Zap className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Live Insights Dashboard</h2>
            <p className="text-sm text-gray-400">Real-time monitoring and system analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            <div className={`h-2 w-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            {connectionStatus}
          </Badge>
          <Button
            onClick={() => {
              refetchMetrics();
              refetchHealth();
            }}
            variant="outline"
            size="sm"
            data-testid="button-refresh-live"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <Card className="bg-nxe-surface border-nxe-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-400" />
              System Health
            </CardTitle>
            <Badge className={healthStatus.bg + ' ' + healthStatus.color}>
              {healthStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">CPU Usage</span>
                <span className="text-xs font-medium text-white">{health?.cpu || 0}%</span>
              </div>
              <Progress value={health?.cpu || 0} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Memory</span>
                <span className="text-xs font-medium text-white">{health?.memory || 0}%</span>
              </div>
              <Progress value={health?.memory || 0} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Requests/min</span>
                <span className="text-xs font-medium text-white">{health?.requests || 0}</span>
              </div>
              <div className="text-xs text-gray-500">Current load</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Response Time</span>
                <span className="text-xs font-medium text-white">{health?.responseTime || 0}ms</span>
              </div>
              <div className="text-xs text-gray-500">Average</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Error Rate</span>
                <span className="text-xs font-medium text-white">{health?.errorRate || 0}%</span>
              </div>
              <Progress value={health?.errorRate || 0} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {metrics?.map((metric, index) => (
          <Card key={index} className="bg-nxe-surface border-nxe-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">{metric.label}</p>
                  <p className="text-2xl font-bold text-white mb-1">
                    {metric.value.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1">
                    {metric.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 text-green-400" />
                    ) : metric.trend === 'down' ? (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    ) : (
                      <Activity className="h-3 w-3 text-gray-400" />
                    )}
                    <span className={`text-xs ${
                      metric.trend === 'up' ? 'text-green-400' :
                      metric.trend === 'down' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {(metric.change ?? 0) >= 0 ? '+' : ''}{(metric.change ?? 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <div className="text-purple-400">
                    {getMetricIcon(metric.icon)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Activity Feed */}
      <Card className="bg-nxe-surface border-nxe-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-400" />
                Live Activity Feed
              </CardTitle>
              <CardDescription className="text-gray-400">
                Real-time system events and activities
              </CardDescription>
            </div>
            <Badge className="bg-blue-500/20 text-blue-400">
              {liveActivities.length} events
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 pr-4">
            {liveActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Activity className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">No recent activity</p>
                <p className="text-xs">Live events will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {liveActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`p-3 rounded-lg border border-nxe-border bg-nxe-dark border-l-4 ${getActivityColor(activity.severity)} transition-all duration-200 hover:border-nxe-border/60`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{activity.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleTimeString()}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {activity.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-nxe-surface border-nxe-border">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-green-400" />
              Today's Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Orders Processed</span>
              <span className="text-sm font-medium text-white">
                {metrics?.find(m => m.label === 'Orders')?.value || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Revenue Generated</span>
              <span className="text-sm font-medium text-white">
                ${(metrics?.find(m => m.label === 'Revenue')?.value || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">New Users</span>
              <span className="text-sm font-medium text-white">
                {metrics?.find(m => m.label === 'Users')?.value || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Critical Alerts</span>
              <Badge className="bg-red-500/20 text-red-400">
                {liveActivities.filter(a => a.severity === 'error').length}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Warnings</span>
              <Badge className="bg-yellow-500/20 text-yellow-400">
                {liveActivities.filter(a => a.severity === 'warning').length}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Info</span>
              <Badge className="bg-blue-500/20 text-blue-400">
                {liveActivities.filter(a => a.severity === 'info').length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4 text-blue-400" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Database</span>
              <Badge className="bg-green-500/20 text-green-400">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">WebSocket</span>
              <Badge className={`${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {isConnected ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">API Health</span>
              <Badge className={healthStatus.bg + ' ' + healthStatus.color}>
                {healthStatus.label}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
