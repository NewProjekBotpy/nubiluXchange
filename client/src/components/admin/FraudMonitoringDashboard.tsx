import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  RefreshCw,
  Eye,
  UserX,
  Activity,
  BarChart3,
  PieChart,
  Zap,
  Phone,
  Users
} from 'lucide-react';

// Types from shared schema
interface FraudAlert {
  id: number;
  userId: number;
  transactionId?: number;
  alertType: 'high_risk' | 'critical_risk' | 'velocity' | 'device_suspicious' | 'behavioral_anomaly' | 'manual_review';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  riskScore: number;
  riskFactors: string[];
  metadata: Record<string, any>;
  status: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
  assignedTo?: number;
  acknowledgedBy?: number;
  acknowledgedAt?: string;
  resolvedBy?: number;
  resolvedAt?: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
}

interface AlertStats {
  totalActive: number;
  totalToday: number;
  highPriority: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  averageResponseTime: number;
  falsePositiveRate: number;
}

interface FraudMonitoringDashboardProps {
  hasAdminAccess?: boolean;
}

const FraudMonitoringDashboard = ({ hasAdminAccess = false }: FraudMonitoringDashboardProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolutionType, setResolutionType] = useState<'resolved' | 'false_positive'>('resolved');
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    alertType: 'all',
    search: ''
  });
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch fraud alert statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['/api/admin/fraud-alerts/stats'],
    enabled: hasAdminAccess,
    refetchInterval: autoRefresh ? 30000 : false // Refresh every 30 seconds if enabled
  });

  // Fetch fraud alerts with filters and pagination
  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['/api/admin/fraud-alerts', filters, page],
    enabled: hasAdminAccess,
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.status && filters.status !== 'all' && { status: filters.status }),
        ...(filters.severity && filters.severity !== 'all' && { severity: filters.severity }),
        ...(filters.alertType && filters.alertType !== 'all' && { alertType: filters.alertType })
      });
      return apiRequest(`/api/admin/fraud-alerts?${params}`);
    },
    refetchInterval: autoRefresh ? 15000 : false // Refresh every 15 seconds if enabled
  });

  // Acknowledge alert mutation
  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: number) => 
      apiRequest(`/api/admin/fraud-alerts/${alertId}/acknowledge`, { method: 'PATCH' }),
    onSuccess: () => {
      toast({
        title: "Alert Acknowledged",
        description: "The fraud alert has been acknowledged successfully.",
      });
      refetchAlerts();
      refetchStats();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to acknowledge the alert. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Resolve alert mutation
  const resolveMutation = useMutation({
    mutationFn: ({ alertId, resolution, note }: { alertId: number; resolution: string; note?: string }) =>
      apiRequest(`/api/admin/fraud-alerts/${alertId}/resolve`, {
        method: 'PATCH',
        body: { resolution, note }
      }),
    onSuccess: () => {
      toast({
        title: "Alert Resolved",
        description: "The fraud alert has been resolved successfully.",
      });
      setIsResolveDialogOpen(false);
      setSelectedAlert(null);
      setResolutionNote('');
      refetchAlerts();
      refetchStats();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resolve the alert. Please try again.",
        variant: "destructive",
      });
    }
  });

  // WebSocket connection for real-time fraud alerts
  const { isConnected } = useWebSocket(user?.id || null, {
    onMessage: (message) => {
      // Handle fraud alert messages (using type assertion for fraud_alert which is a valid backend message type)
      if ((message as any).type === 'fraud_alert' && (message as any).alert) {
        const alert = (message as any).alert;
        
        // Show toast notification for critical and high severity alerts
        if (alert.severity === 'critical' || alert.severity === 'high') {
          toast({
            title: alert.severity === 'critical' ? '🚨 Critical Fraud Alert' : '⚠️ High Risk Alert',
            description: alert.message,
            variant: alert.severity === 'critical' ? 'destructive' : 'default',
            duration: alert.severity === 'critical' ? 10000 : 5000,
          });

          // Play sound for critical alerts
          if (alert.severity === 'critical' && audioRef.current) {
            try {
              audioRef.current.play().catch(() => {
                // Audio playback failed - user interaction may be required
              });
            } catch {
              // Audio error - silently fail
            }
          }
        }

        // Refresh alerts list to show the new alert
        refetchAlerts();
        refetchStats();
      }
    },
    onConnect: () => {
      // WebSocket connected - real-time fraud alerts enabled
    },
    onDisconnect: () => {
      // WebSocket disconnected - falling back to polling
    },
    autoReconnect: true
  });

  // Auto-refresh effect (fallback when WebSocket is not connected)
  useEffect(() => {
    const interval = autoRefresh ? setInterval(() => {
      refetchAlerts();
      refetchStats();
    }, 30000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refetchAlerts, refetchStats]);

  const handleAcknowledge = (alertId: number) => {
    acknowledgeMutation.mutate(alertId);
  };

  const handleResolve = () => {
    if (!selectedAlert) return;
    resolveMutation.mutate({
      alertId: selectedAlert.id,
      resolution: resolutionType,
      note: resolutionNote.trim() || undefined
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'acknowledged': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'false_positive': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getAlertTypeIcon = (alertType: string) => {
    switch (alertType) {
      case 'critical_risk': return <AlertTriangle className="h-4 w-4" />;
      case 'high_risk': return <AlertCircle className="h-4 w-4" />;
      case 'velocity': return <Zap className="h-4 w-4" />;
      case 'device_suspicious': return <Shield className="h-4 w-4" />;
      case 'behavioral_anomaly': return <Activity className="h-4 w-4" />;
      case 'manual_review': return <Eye className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Filter alerts based on search
  const filteredAlerts = alertsData?.alerts?.filter((alert: FraudAlert) => {
    if (!filters.search) return true;
    const searchTerm = filters.search.toLowerCase();
    return (
      alert.title.toLowerCase().includes(searchTerm) ||
      alert.message.toLowerCase().includes(searchTerm) ||
      alert.alertType.toLowerCase().includes(searchTerm) ||
      alert.userId.toString().includes(searchTerm)
    );
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <Shield className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Fraud Monitoring</h2>
            <p className="text-sm text-gray-400">Real-time fraud detection and alert management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-2"
            data-testid="button-toggle-autorefresh"
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button
            onClick={() => {
              refetchAlerts();
              refetchStats();
            }}
            variant="outline"
            size="sm"
            disabled={alertsLoading || statsLoading}
            data-testid="button-manual-refresh"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Active Alerts</p>
                <p className="text-2xl font-bold text-white">
                  {statsLoading ? '—' : (stats as AlertStats)?.totalActive || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
              <span className="text-green-400">
                {(stats as AlertStats)?.totalToday || 0} today
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">High Priority</p>
                <p className="text-2xl font-bold text-white">
                  {statsLoading ? '—' : (stats as AlertStats)?.highPriority || 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-400" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <Clock className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-gray-400">
                Avg Response: {(stats as AlertStats)?.averageResponseTime?.toFixed(1) || 0}m
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">False Positive Rate</p>
                <p className="text-2xl font-bold text-white">
                  {statsLoading ? '—' : `${(stats as AlertStats)?.falsePositiveRate?.toFixed(1) || 0}%`}
                </p>
              </div>
              <PieChart className="h-8 w-8 text-blue-400" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingDown className="h-4 w-4 text-green-400 mr-1" />
              <span className="text-green-400">Improving</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Alert Types</p>
                <p className="text-2xl font-bold text-white">
                  {statsLoading ? '—' : Object.keys((stats as AlertStats)?.byType || {}).length}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-400" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <Activity className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-gray-400">Active monitoring</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-nxe-surface">
          <TabsTrigger value="alerts" className="data-[state=active]:bg-nxe-primary">
            Alert Management
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-nxe-primary">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-nxe-primary">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          {/* Filters */}
          <Card className="bg-nxe-surface border-nxe-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-gray-300">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search alerts..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-9 bg-nxe-dark border-nxe-border text-white"
                      data-testid="input-search-alerts"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                    <SelectTrigger className="bg-nxe-dark border-nxe-border text-white" data-testid="select-status-filter">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent className="bg-nxe-surface border-nxe-border">
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="false_positive">False Positive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Severity</Label>
                  <Select value={filters.severity} onValueChange={(value) => setFilters({ ...filters, severity: value })}>
                    <SelectTrigger className="bg-nxe-dark border-nxe-border text-white" data-testid="select-severity-filter">
                      <SelectValue placeholder="All severities" />
                    </SelectTrigger>
                    <SelectContent className="bg-nxe-surface border-nxe-border">
                      <SelectItem value="all">All severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Alert Type</Label>
                  <Select value={filters.alertType} onValueChange={(value) => setFilters({ ...filters, alertType: value })}>
                    <SelectTrigger className="bg-nxe-dark border-nxe-border text-white" data-testid="select-type-filter">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent className="bg-nxe-surface border-nxe-border">
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="critical_risk">Critical Risk</SelectItem>
                      <SelectItem value="high_risk">High Risk</SelectItem>
                      <SelectItem value="velocity">Velocity</SelectItem>
                      <SelectItem value="device_suspicious">Device Suspicious</SelectItem>
                      <SelectItem value="behavioral_anomaly">Behavioral Anomaly</SelectItem>
                      <SelectItem value="manual_review">Manual Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Table */}
          <Card className="bg-nxe-surface border-nxe-border">
            <CardHeader>
              <CardTitle className="text-white">Active Fraud Alerts</CardTitle>
              <CardDescription className="text-gray-400">
                Manage and respond to fraud detection alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-nxe-border">
                      <TableHead className="text-gray-300">Type</TableHead>
                      <TableHead className="text-gray-300">Severity</TableHead>
                      <TableHead className="text-gray-300">User ID</TableHead>
                      <TableHead className="text-gray-300">Risk Score</TableHead>
                      <TableHead className="text-gray-300">Message</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Created</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                          Loading alerts...
                        </TableCell>
                      </TableRow>
                    ) : filteredAlerts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                          No fraud alerts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAlerts.map((alert: FraudAlert) => (
                        <TableRow key={alert.id} className="border-nxe-border">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getAlertTypeIcon(alert.alertType)}
                              <span className="text-white text-sm">{alert.alertType.replace('_', ' ')}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white">{alert.userId}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${
                                    alert.riskScore >= 75 ? 'bg-red-500' :
                                    alert.riskScore >= 50 ? 'bg-orange-500' :
                                    alert.riskScore >= 25 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${alert.riskScore}%` }}
                                />
                              </div>
                              <span className="text-white text-sm">{alert.riskScore}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-white max-w-xs truncate" title={alert.message}>
                            {alert.title}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(alert.status)}>
                              {alert.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {new Date(alert.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {alert.status === 'active' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAcknowledge(alert.id)}
                                  disabled={acknowledgeMutation.isPending}
                                  className="h-8 px-2"
                                  data-testid={`button-acknowledge-${alert.id}`}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              )}
                              {(alert.status === 'active' || alert.status === 'acknowledged') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedAlert(alert);
                                    setIsResolveDialogOpen(true);
                                  }}
                                  className="h-8 px-2"
                                  data-testid={`button-resolve-${alert.id}`}
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {alertsData?.pagination && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-400">
                    Page {alertsData.pagination.page} of {alertsData.pagination.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                      data-testid="button-prev-page"
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= alertsData.pagination.totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            {/* Comprehensive Fraud Analytics */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Fraud Pattern Analysis
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Detailed analytics, trends, and patterns for fraud detection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Alert Distribution Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Alert Types Distribution with Visual Bar */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-purple-400" />
                      Alert Types Distribution
                    </h3>
                    <div className="space-y-3">
                      {Object.entries((stats as AlertStats)?.byType || {}).map(([type, count]) => {
                        const total = Object.values((stats as AlertStats)?.byType || {}).reduce((a, b) => (a as number) + (b as number), 0) as number;
                        const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
                        return (
                          <div key={type} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-300 capitalize flex items-center gap-2">
                                {getAlertTypeIcon(type)}
                                {type.replace('_', ' ')}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{count as number}</span>
                                <span className="text-gray-400">({percentage.toFixed(1)}%)</span>
                              </div>
                            </div>
                            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 ${
                                  type.includes('critical') ? 'bg-red-500' :
                                  type.includes('high') ? 'bg-orange-500' :
                                  type.includes('velocity') ? 'bg-yellow-500' :
                                  type.includes('device') ? 'bg-purple-500' :
                                  type.includes('behavioral') ? 'bg-blue-500' : 'bg-gray-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status Distribution with Visual Progress */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-400" />
                      Status Distribution
                    </h3>
                    <div className="space-y-3">
                      {Object.entries((stats as AlertStats)?.byStatus || {}).map(([status, count]) => {
                        const total = Object.values((stats as AlertStats)?.byStatus || {}).reduce((a, b) => (a as number) + (b as number), 0) as number;
                        const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
                        return (
                          <div key={status} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-300 capitalize flex items-center gap-2">
                                {status === 'active' && <AlertTriangle className="h-4 w-4 text-red-400" />}
                                {status === 'acknowledged' && <Clock className="h-4 w-4 text-yellow-400" />}
                                {status === 'resolved' && <CheckCircle className="h-4 w-4 text-green-400" />}
                                {status === 'false_positive' && <XCircle className="h-4 w-4 text-gray-400" />}
                                {status.replace('_', ' ')}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{count as number}</span>
                                <span className="text-gray-400">({percentage.toFixed(1)}%)</span>
                              </div>
                            </div>
                            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 ${
                                  status === 'active' ? 'bg-red-500' :
                                  status === 'acknowledged' ? 'bg-yellow-500' :
                                  status === 'resolved' ? 'bg-green-500' : 'bg-gray-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Advanced Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-nxe-border">
                  <div className="bg-nxe-dark/50 p-4 rounded-lg border border-nxe-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Detection Rate</span>
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {((((stats as AlertStats)?.totalActive || 0) / Math.max((stats as AlertStats)?.totalToday || 1, 1)) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Active vs Total Today</div>
                  </div>

                  <div className="bg-nxe-dark/50 p-4 rounded-lg border border-nxe-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Avg Response Time</span>
                      <Clock className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {((stats as AlertStats)?.averageResponseTime || 0).toFixed(1)}m
                    </div>
                    <div className="text-xs text-gray-500 mt-1">From detection to acknowledgment</div>
                  </div>

                  <div className="bg-nxe-dark/50 p-4 rounded-lg border border-nxe-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Accuracy Rate</span>
                      <Shield className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {(100 - ((stats as AlertStats)?.falsePositiveRate || 0)).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">True positive detections</div>
                  </div>
                </div>

                {/* Severity Heatmap */}
                <div className="pt-4 border-t border-nxe-border">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                    Severity Distribution Heatmap
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {['critical', 'high', 'medium', 'low'].map((severity) => {
                      const alertCount = filteredAlerts.filter((a: FraudAlert) => a.severity === severity).length;
                      const maxCount = Math.max(...['critical', 'high', 'medium', 'low'].map(s => 
                        filteredAlerts.filter((a: FraudAlert) => a.severity === s).length
                      ));
                      const intensity = maxCount > 0 ? (alertCount / maxCount) : 0;
                      
                      return (
                        <div 
                          key={severity}
                          className={`p-4 rounded-lg border transition-all duration-300 ${
                            severity === 'critical' ? 'border-red-500/30 hover:border-red-500/50' :
                            severity === 'high' ? 'border-orange-500/30 hover:border-orange-500/50' :
                            severity === 'medium' ? 'border-yellow-500/30 hover:border-yellow-500/50' :
                            'border-blue-500/30 hover:border-blue-500/50'
                          }`}
                          style={{
                            backgroundColor: 
                              severity === 'critical' ? `rgba(239, 68, 68, ${0.1 + intensity * 0.3})` :
                              severity === 'high' ? `rgba(249, 115, 22, ${0.1 + intensity * 0.3})` :
                              severity === 'medium' ? `rgba(234, 179, 8, ${0.1 + intensity * 0.3})` :
                              `rgba(59, 130, 246, ${0.1 + intensity * 0.3})`
                          }}
                        >
                          <div className="text-center">
                            <div className={`text-xs font-medium mb-2 ${
                              severity === 'critical' ? 'text-red-400' :
                              severity === 'high' ? 'text-orange-400' :
                              severity === 'medium' ? 'text-yellow-400' :
                              'text-blue-400'
                            }`}>
                              {severity.toUpperCase()}
                            </div>
                            <div className="text-2xl font-bold text-white">{alertCount}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {maxCount > 0 ? `${((alertCount / maxCount) * 100).toFixed(0)}%` : '0%'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Risk Score Distribution */}
                <div className="pt-4 border-t border-nxe-border">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-400" />
                    Risk Score Distribution
                  </h3>
                  <div className="space-y-2">
                    {[
                      { label: '0-25 (Low Risk)', min: 0, max: 25, color: 'bg-green-500' },
                      { label: '26-50 (Medium Risk)', min: 26, max: 50, color: 'bg-yellow-500' },
                      { label: '51-75 (High Risk)', min: 51, max: 75, color: 'bg-orange-500' },
                      { label: '76-100 (Critical Risk)', min: 76, max: 100, color: 'bg-red-500' }
                    ].map((range) => {
                      const count = filteredAlerts.filter((a: FraudAlert) => 
                        a.riskScore >= range.min && a.riskScore <= range.max
                      ).length;
                      const percentage = filteredAlerts.length > 0 ? (count / filteredAlerts.length) * 100 : 0;
                      
                      return (
                        <div key={range.label} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">{range.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{count}</span>
                              <span className="text-gray-400">({percentage.toFixed(1)}%)</span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${range.color} transition-all duration-300`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            {/* Automated Payment Blocker Settings */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-400" />
                  Automated Risky Payment Blocker
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure automatic blocking of high-risk payments with manual override capability
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-nxe-dark rounded-lg border border-nxe-border">
                      <div>
                        <h4 className="text-sm font-medium text-white">Auto-Block Critical Risk</h4>
                        <p className="text-xs text-gray-400 mt-1">Automatically block payments with risk score ≥ 90</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-500/20 text-red-400">Enabled</Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-nxe-dark rounded-lg border border-nxe-border">
                      <div>
                        <h4 className="text-sm font-medium text-white">Hold High Risk Payments</h4>
                        <p className="text-xs text-gray-400 mt-1">Hold payments with risk score 75-89 for review</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-500/20 text-orange-400">Enabled</Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-nxe-dark rounded-lg border border-nxe-border">
                      <div>
                        <h4 className="text-sm font-medium text-white">Manual Override Access</h4>
                        <p className="text-xs text-gray-400 mt-1">Allow admin to manually override blocked payments</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-500/20 text-green-400">Enabled</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-nxe-dark rounded-lg border border-nxe-border">
                      <h4 className="text-sm font-medium text-white mb-3">Risk Score Thresholds</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">Critical (Auto-Block)</span>
                            <span className="text-xs text-red-400 font-medium">≥ 90</span>
                          </div>
                          <div className="w-full h-2 bg-gray-700 rounded-full">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: '90%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">High (Hold for Review)</span>
                            <span className="text-xs text-orange-400 font-medium">75-89</span>
                          </div>
                          <div className="w-full h-2 bg-gray-700 rounded-full">
                            <div className="h-full bg-orange-500 rounded-full" style={{ width: '75%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">Medium (Monitor)</span>
                            <span className="text-xs text-yellow-400 font-medium">50-74</span>
                          </div>
                          <div className="w-full h-2 bg-gray-700 rounded-full">
                            <div className="h-full bg-yellow-500 rounded-full" style={{ width: '50%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">Low (Allow)</span>
                            <span className="text-xs text-green-400 font-medium">&lt; 50</span>
                          </div>
                          <div className="w-full h-2 bg-gray-700 rounded-full">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: '25%' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-nxe-border">
                  <h4 className="text-sm font-medium text-white mb-3">Recent Blocked Payments</h4>
                  <div className="text-sm text-gray-400">
                    Auto-blocked payments require manual review and admin approval to process.
                    Override requests are logged and require justification.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alert Notification Settings */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  Alert Notification Settings
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure how and when fraud alerts are sent to administrators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-white">Notification Channels</h4>
                    
                    <div className="flex items-center justify-between p-3 bg-nxe-dark rounded-lg border border-nxe-border">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm text-white">In-App Notifications</span>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-nxe-dark rounded-lg border border-nxe-border">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-white">SMS Alerts</span>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-nxe-dark rounded-lg border border-nxe-border">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-purple-400" />
                        <span className="text-sm text-white">WebSocket Push</span>
                      </div>
                      <Badge className={`${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-white">Alert Priorities</h4>
                    
                    <div className="p-3 bg-nxe-dark rounded-lg border border-red-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white font-medium">Critical Alerts</span>
                        <span className="text-xs text-red-400">Immediate</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Sound + SMS + Push notification instantly
                      </div>
                    </div>

                    <div className="p-3 bg-nxe-dark rounded-lg border border-orange-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white font-medium">High Priority</span>
                        <span className="text-xs text-orange-400">Within 5 min</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Push notification + In-app alert
                      </div>
                    </div>

                    <div className="p-3 bg-nxe-dark rounded-lg border border-yellow-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white font-medium">Medium/Low</span>
                        <span className="text-xs text-yellow-400">Batched</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        In-app notification only
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Automated Alert Handling */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-400" />
                  Automated Alert Handling & Assignment
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Auto-assign alerts to available administrators based on severity and workload
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-nxe-dark rounded-lg border border-nxe-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-purple-400" />
                      <span className="text-sm font-medium text-white">Auto-Assignment</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      Automatically assign new alerts to least busy admin
                    </p>
                    <Badge className="bg-purple-500/20 text-purple-400">Enabled</Badge>
                  </div>

                  <div className="p-4 bg-nxe-dark rounded-lg border border-nxe-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-white">Smart Escalation</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      Escalate unacknowledged critical alerts after 10 minutes
                    </p>
                    <Badge className="bg-blue-500/20 text-blue-400">Enabled</Badge>
                  </div>

                  <div className="p-4 bg-nxe-dark rounded-lg border border-nxe-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-medium text-white">Load Balancing</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      Distribute alerts evenly across admin team
                    </p>
                    <Badge className="bg-green-500/20 text-green-400">Enabled</Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-nxe-border">
                  <h4 className="text-sm font-medium text-white mb-3">Assignment Rules</h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                      <span>Critical alerts assigned to senior administrators first</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                      <span>Velocity alerts assigned to fraud specialists</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                      <span>Device suspicious alerts assigned to security team</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                      <span>Unassigned alerts redistributed after 30 minutes</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Resolve Alert Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent className="bg-nxe-surface border-nxe-border text-white">
          <DialogHeader>
            <DialogTitle>Resolve Fraud Alert</DialogTitle>
            <DialogDescription className="text-gray-400">
              Mark this alert as resolved or false positive
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resolution-type" className="text-gray-300">Resolution Type</Label>
              <Select value={resolutionType} onValueChange={(value: 'resolved' | 'false_positive') => setResolutionType(value)}>
                <SelectTrigger className="bg-nxe-dark border-nxe-border text-white" data-testid="select-resolution-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-nxe-surface border-nxe-border">
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="resolution-note" className="text-gray-300">Resolution Note (Optional)</Label>
              <Textarea
                id="resolution-note"
                placeholder="Add notes about the resolution..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                className="bg-nxe-dark border-nxe-border text-white"
                rows={3}
                data-testid="textarea-resolution-note"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResolveDialogOpen(false)}
              data-testid="button-cancel-resolve"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={resolveMutation.isPending}
              data-testid="button-confirm-resolve"
            >
              {resolveMutation.isPending ? 'Resolving...' : 'Resolve Alert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden audio element for critical alert sound */}
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE8jdf03aFOFg5TqOTxuG4jCDKF0PLWhTIHH2q+8OGdUhQyiNLz1oM1Bx1mtfDjmlUSL4DN89qINAgeZrTw4plTFTCCz/PVizcIHGWy8OSaUhYugc/z24cyCBtlsfDlnFQYL37N9NyJOwcaY7Dw5pxUGC5+zfTciTsHGWOw8OacVBgufM302ok7BxljsPDmnFQYLnzN9NqJOwcZY7Dw5pxUGC58zfTaiTsHGWOw8OacVBgue8302Yk7Bxlkr/DlnVQYL3vN9NqJOwcaZK/w5Z1UGC97zfTaiTwHGWSv8OWdVBgve8302ok8Bxlkr/DlnVQYL3vN9NqJPAcZZK/w5Z1UGC97zfTaiTwHGWSv8OWdVBgvfM302Yk8Bxlkr/DlnVQYL3zN9NmJPAcZZK/w5Z1UGC98zfTZiTwHGWSv8OWdVBgvfM302Yk8Bxlkr/DlnVQYL3zN9NmJPAcZZK/w5Z1UGC98zfTZiTwHGWSv8OWdVBgvfM302Yk8Bxlkr/DlnVQYL3zN9NmJPAcZZK/w5Z1UGC98zfTZiTwHGWSv8OWdVBgvfM302Yk8Bxlkr/DlnVQYL3zN9NmJPAcZZK/w5Z1UGC98zfTZiTwHGWSv8OWdVBgvfM302Yk8Bxlkr/DlnVQYL3zN9NmJPAcZZK/w5Z1UGC98zfTZiTwHGWSv8OWdVBgvfM302Yk8Bxlkr/DlnVQYL3zN9NmJPAcZZK/w5Z1UGC98zfTZiTwH"
        preload="auto"
      />
    </div>
  );
};

export default FraudMonitoringDashboard;