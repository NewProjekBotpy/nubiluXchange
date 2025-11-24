import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Shield, 
  Lock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  Globe,
  Eye,
  Users,
  Activity,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  TrendingUp,
  Signal,
  MapPin,
  Clock,
  Zap,
  Server
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import KPIGrid, { type KPIItem } from "./KPIGrid";

interface ConnectionMetrics {
  totalConnections: number;
  secureConnections: number;
  insecureConnections: number;
  suspiciousConnections: number;
  averageConnectionTime: number;
  uniqueIPs: number;
  vpnConnections: number;
  anomalousConnections: number;
}

interface ConnectionAlert {
  id: string;
  userId?: number;
  ipAddress: string;
  userAgent: string;
  alertType: 'insecure_connection' | 'vpn_detected' | 'suspicious_location' | 'multiple_sessions' | 'anomalous_behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  resolved: boolean;
}

interface UserConnection {
  userId: number;
  ipAddress: string;
  userAgent: string;
  isSecure: boolean;
  country?: string;
  city?: string;
  isVPN: boolean;
  sessionId: string;
  connectedAt: string;
  lastActivity: string;
  riskScore: number;
  username?: string;
  displayName?: string;
}

const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

interface ConnectionSecurityDashboardProps {
  hasAdminAccess?: boolean;
}

export default function ConnectionSecurityDashboard({ hasAdminAccess = false }: ConnectionSecurityDashboardProps) {
  const [selectedAlert, setSelectedAlert] = useState<ConnectionAlert | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [resolveAlertId, setResolveAlertId] = useState<string | null>(null);
  const { toast } = useToast();

  // Queries
  const { data: metrics = {} as ConnectionMetrics, isLoading: metricsLoading } = useQuery<ConnectionMetrics>({
    queryKey: ['/api/admin/connection-security/metrics'],
    enabled: hasAdminAccess,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<ConnectionAlert[]>({
    queryKey: ['/api/admin/connection-security/alerts'],
    enabled: hasAdminAccess,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const { data: connections = [], isLoading: connectionsLoading } = useQuery<UserConnection[]>({
    queryKey: ['/api/admin/connection-security/connections'],
    enabled: hasAdminAccess,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Mutations
  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest(`/api/admin/connection-security/alerts/${alertId}/resolve`, {
        method: 'PATCH'
      });
    },
    onSuccess: () => {
      toast({
        title: "Alert Resolved",
        description: "Connection security alert has been resolved",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/connection-security/alerts'] });
      setResolveAlertId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Resolve Alert",
        description: error.message || "Could not resolve the alert",
        variant: "destructive",
      });
    }
  });

  // KPI Items
  const kpiItems: KPIItem[] = [
    {
      title: "Total Connections",
      value: metrics.totalConnections || 0,
      icon: Users,
      iconColor: "text-blue-500",
      subtitle: "Active sessions"
    },
    {
      title: "Secure Connections",
      value: `${Math.round(((metrics.secureConnections || 0) / Math.max(metrics.totalConnections || 1, 1)) * 100)}%`,
      icon: Shield,
      iconColor: "text-green-500",
      subtitle: `${metrics.secureConnections || 0} HTTPS connections`,
      trend: {
        value: metrics.secureConnections > metrics.insecureConnections ? "+5%" : "-2%",
        isPositive: metrics.secureConnections > metrics.insecureConnections
      }
    },
    {
      title: "Suspicious Activity",
      value: metrics.suspiciousConnections || 0,
      icon: AlertTriangle,
      iconColor: metrics.suspiciousConnections > 5 ? "text-red-500" : "text-yellow-500",
      subtitle: "Flagged connections"
    },
    {
      title: "VPN Usage",
      value: metrics.vpnConnections || 0,
      icon: Globe,
      iconColor: "text-purple-500",
      subtitle: "VPN/Proxy connections"
    },
    {
      title: "Average Session",
      value: `${Math.round((metrics.averageConnectionTime || 0) / 60)}m`,
      icon: Clock,
      iconColor: "text-indigo-500",
      subtitle: "Session duration"
    },
    {
      title: "Unique IPs",
      value: metrics.uniqueIPs || 0,
      icon: MapPin,
      iconColor: "text-cyan-500",
      subtitle: "Different locations"
    }
  ];

  // Chart data
  const connectionTypeData = [
    { name: 'Secure (HTTPS)', value: metrics.secureConnections || 0, color: '#10b981' },
    { name: 'Insecure (HTTP)', value: metrics.insecureConnections || 0, color: '#ef4444' },
    { name: 'VPN/Proxy', value: metrics.vpnConnections || 0, color: '#8b5cf6' }
  ];

  const riskLevelData = connections.reduce((acc, conn) => {
    const riskLevel = conn.riskScore >= 70 ? 'High Risk' : 
                     conn.riskScore >= 40 ? 'Medium Risk' : 'Low Risk';
    acc[riskLevel] = (acc[riskLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const riskChartData = Object.entries(riskLevelData).map(([level, count]) => ({
    name: level,
    value: count,
    color: level === 'High Risk' ? '#ef4444' : 
           level === 'Medium Risk' ? '#f59e0b' : '#10b981'
  }));

  const handleViewAlert = (alert: ConnectionAlert) => {
    setSelectedAlert(alert);
    setAlertDialogOpen(true);
  };

  const handleResolveAlert = (alertId: string) => {
    setResolveAlertId(alertId);
  };

  const confirmResolveAlert = () => {
    if (resolveAlertId) {
      resolveAlertMutation.mutate(resolveAlertId);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels = {
      'insecure_connection': 'Insecure Connection',
      'vpn_detected': 'VPN Detected',
      'suspicious_location': 'Suspicious Location',
      'multiple_sessions': 'Multiple Sessions',
      'anomalous_behavior': 'Anomalous Behavior'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-6" data-testid="connection-security-dashboard">
      {/* Connection Security KPIs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Connection Security</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/admin/connection-security/metrics'] });
              queryClient.invalidateQueries({ queryKey: ['/api/admin/connection-security/alerts'] });
              queryClient.invalidateQueries({ queryKey: ['/api/admin/connection-security/connections'] });
            }}
            data-testid="button-refresh-security"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {metricsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="bg-nxe-card border-nxe-border">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-600 rounded animate-pulse w-1/2"></div>
                    <div className="h-8 bg-gray-600 rounded animate-pulse w-1/3"></div>
                    <div className="h-3 bg-gray-700 rounded animate-pulse w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <KPIGrid items={kpiItems} />
        )}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {alerts.filter(a => !a.resolved).length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alerts.filter(a => !a.resolved).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Connection Types Chart */}
            <Card className="bg-nxe-card border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white">Connection Types</CardTitle>
                <CardDescription>Distribution of secure vs insecure connections</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={connectionTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {connectionTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk Level Distribution */}
            <Card className="bg-nxe-card border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white">Risk Level Distribution</CardTitle>
                <CardDescription>User connections by risk assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={riskChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card className="bg-nxe-card border-nxe-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Security Alerts
              </CardTitle>
              <CardDescription>Active connection security alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-600 rounded animate-pulse w-1/3"></div>
                        <div className="h-3 bg-gray-700 rounded animate-pulse w-2/3"></div>
                      </div>
                      <div className="h-8 w-20 bg-gray-600 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts.filter(alert => !alert.resolved).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="text-white font-medium">
                            {getAlertTypeLabel(alert.alertType)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {alert.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          IP: {alert.ipAddress} • {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAlert(alert)}
                          data-testid={`button-view-alert-${alert.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveAlert(alert.id)}
                          data-testid={`button-resolve-alert-${alert.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Resolved alerts */}
                  {alerts.filter(alert => alert.resolved).length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Resolved Alerts</h3>
                      <div className="space-y-2">
                        {alerts.filter(alert => alert.resolved).slice(0, 5).map((alert) => (
                          <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg opacity-60">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-gray-300">{getAlertTypeLabel(alert.alertType)}</span>
                              <Badge variant="outline">{alert.severity}</Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(alert.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No security alerts</p>
                  <p className="text-sm">All connections are secure</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connections" className="space-y-6">
          <Card className="bg-nxe-card border-nxe-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Active Connections
              </CardTitle>
              <CardDescription>Current user connections and risk assessment</CardDescription>
            </CardHeader>
            <CardContent>
              {connectionsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-600 rounded animate-pulse w-1/4"></div>
                        <div className="h-3 bg-gray-700 rounded animate-pulse w-1/2"></div>
                        <div className="h-3 bg-gray-700 rounded animate-pulse w-1/3"></div>
                      </div>
                      <div className="h-8 w-16 bg-gray-600 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : connections.length > 0 ? (
                <div className="space-y-4">
                  {connections.map((connection) => (
                    <div key={connection.sessionId} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            {connection.displayName || connection.username || `User ${connection.userId}`}
                          </span>
                          {connection.isSecure ? (
                            <Lock className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          {connection.isVPN && (
                            <Badge variant="outline">VPN</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
                          IP: {connection.ipAddress}
                          {connection.country && ` • ${connection.city}, ${connection.country}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          Connected: {new Date(connection.connectedAt).toLocaleString()} • 
                          Last activity: {new Date(connection.lastActivity).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className={`text-lg font-semibold ${getRiskScoreColor(connection.riskScore)}`}>
                          {connection.riskScore}
                        </div>
                        <div className="text-xs text-gray-500">Risk Score</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active connections</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-nxe-card border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white">Connection Security Score</CardTitle>
                <CardDescription>Overall security health of user connections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white">
                      {Math.round(((metrics.secureConnections || 0) / Math.max(metrics.totalConnections || 1, 1)) * 100)}%
                    </div>
                    <div className="text-gray-400">Secure Connections</div>
                  </div>
                  <Progress 
                    value={((metrics.secureConnections || 0) / Math.max(metrics.totalConnections || 1, 1)) * 100} 
                    className="h-3"
                  />
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-green-500 font-semibold">{metrics.secureConnections || 0}</div>
                      <div className="text-gray-500">Secure</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-500 font-semibold">{metrics.insecureConnections || 0}</div>
                      <div className="text-gray-500">Insecure</div>
                    </div>
                    <div className="text-center">
                      <div className="text-yellow-500 font-semibold">{metrics.suspiciousConnections || 0}</div>
                      <div className="text-gray-500">Suspicious</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-nxe-card border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white">Connection Insights</CardTitle>
                <CardDescription>Key metrics and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Average Session Duration</span>
                    <span className="text-white font-semibold">
                      {Math.round((metrics.averageConnectionTime || 0) / 60)}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Unique IP Addresses</span>
                    <span className="text-white font-semibold">{metrics.uniqueIPs || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">VPN/Proxy Usage</span>
                    <span className="text-white font-semibold">{metrics.vpnConnections || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Anomalous Connections</span>
                    <span className="text-red-500 font-semibold">{metrics.anomalousConnections || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alert Details Dialog */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent className="bg-nxe-card border-nxe-border text-white">
          <DialogHeader>
            <DialogTitle>Security Alert Details</DialogTitle>
            <DialogDescription>
              Detailed information about the security alert
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 text-sm">Alert Type</span>
                  <div className="text-white font-medium">
                    {getAlertTypeLabel(selectedAlert.alertType)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Severity</span>
                  <div>
                    <Badge variant={getSeverityColor(selectedAlert.severity)}>
                      {selectedAlert.severity.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">IP Address</span>
                  <div className="text-white font-mono">{selectedAlert.ipAddress}</div>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Timestamp</span>
                  <div className="text-white">{new Date(selectedAlert.timestamp).toLocaleString()}</div>
                </div>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Description</span>
                <div className="text-white">{selectedAlert.description}</div>
              </div>
              <div>
                <span className="text-gray-400 text-sm">User Agent</span>
                <div className="text-white text-sm font-mono break-all">
                  {selectedAlert.userAgent}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Alert Confirmation */}
      <AlertDialog open={!!resolveAlertId} onOpenChange={() => setResolveAlertId(null)}>
        <AlertDialogContent className="bg-nxe-card border-nxe-border text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve Security Alert</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this security alert as resolved? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResolveAlertId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmResolveAlert}
              disabled={resolveAlertMutation.isPending}
            >
              {resolveAlertMutation.isPending ? 'Resolving...' : 'Resolve Alert'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}