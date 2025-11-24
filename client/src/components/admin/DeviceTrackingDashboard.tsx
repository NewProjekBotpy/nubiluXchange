import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Smartphone,
  Monitor,
  Tablet,
  AlertTriangle,
  Shield,
  MapPin,
  Clock,
  Activity,
  TrendingUp,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Wifi
} from 'lucide-react';

interface DeviceInfo {
  id: string;
  userId: number;
  userAgent: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  location?: {
    country: string;
    city: string;
    region: string;
  };
  isSuspicious: boolean;
  riskScore: number;
  riskFactors: string[];
  sessionCount: number;
  lastSeen: string;
  firstSeen: string;
  isBlocked: boolean;
}

interface DeviceStats {
  totalDevices: number;
  suspiciousDevices: number;
  blockedDevices: number;
  uniqueIPs: number;
  multipleAccountDevices: number;
  vpnDetected: number;
}

interface DeviceTrackingDashboardProps {
  hasAdminAccess?: boolean;
}

export default function DeviceTrackingDashboard({ hasAdminAccess = false }: DeviceTrackingDashboardProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'suspicious' | 'blocked'>('all');
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);

  // Fetch device statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<DeviceStats>({
    queryKey: ['/api/admin/devices/stats'],
    enabled: hasAdminAccess,
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch device list
  const { data: devices = [], isLoading: devicesLoading, refetch: refetchDevices } = useQuery<DeviceInfo[]>({
    queryKey: ['/api/admin/devices'],
    enabled: hasAdminAccess,
    refetchInterval: 30000
  });

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'desktop': return <Monitor className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Smartphone className="h-4 w-4" />;
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 80) return 'text-red-400';
    if (riskScore >= 60) return 'text-orange-400';
    if (riskScore >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 80) return <Badge className="bg-red-500/20 text-red-400">Critical</Badge>;
    if (riskScore >= 60) return <Badge className="bg-orange-500/20 text-orange-400">High</Badge>;
    if (riskScore >= 40) return <Badge className="bg-yellow-500/20 text-yellow-400">Medium</Badge>;
    return <Badge className="bg-green-500/20 text-green-400">Low</Badge>;
  };

  const filteredDevices = useMemo(() => {
    let filtered = devices;

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(device =>
        device.deviceName.toLowerCase().includes(search) ||
        device.ipAddress.includes(search) ||
        device.userId.toString().includes(search) ||
        device.browser.toLowerCase().includes(search) ||
        device.os.toLowerCase().includes(search)
      );
    }

    // Filter by status
    if (selectedFilter === 'suspicious') {
      filtered = filtered.filter(device => device.isSuspicious);
    } else if (selectedFilter === 'blocked') {
      filtered = filtered.filter(device => device.isBlocked);
    }

    return filtered;
  }, [devices, searchTerm, selectedFilter]);

  const handleRefresh = () => {
    refetchStats();
    refetchDevices();
    toast({
      title: "Refreshed",
      description: "Device tracking data has been updated"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Smartphone className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Device Tracking</h2>
            <p className="text-sm text-gray-400">Monitor and flag suspicious devices</p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={devicesLoading || statsLoading}
          data-testid="button-refresh-devices"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total Devices</p>
                <p className="text-xl font-bold text-white">
                  {statsLoading ? '—' : stats?.totalDevices || 0}
                </p>
              </div>
              <Smartphone className="h-6 w-6 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Suspicious</p>
                <p className="text-xl font-bold text-white">
                  {statsLoading ? '—' : stats?.suspiciousDevices || 0}
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Blocked</p>
                <p className="text-xl font-bold text-white">
                  {statsLoading ? '—' : stats?.blockedDevices || 0}
                </p>
              </div>
              <Ban className="h-6 w-6 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Unique IPs</p>
                <p className="text-xl font-bold text-white">
                  {statsLoading ? '—' : stats?.uniqueIPs || 0}
                </p>
              </div>
              <Wifi className="h-6 w-6 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Multi-Account</p>
                <p className="text-xl font-bold text-white">
                  {statsLoading ? '—' : stats?.multipleAccountDevices || 0}
                </p>
              </div>
              <Activity className="h-6 w-6 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">VPN Detected</p>
                <p className="text-xl font-bold text-white">
                  {statsLoading ? '—' : stats?.vpnDetected || 0}
                </p>
              </div>
              <Shield className="h-6 w-6 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-nxe-surface">
          <TabsTrigger value="devices" className="data-[state=active]:bg-nxe-primary">
            Device List
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-nxe-primary">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="patterns" className="data-[state=active]:bg-nxe-primary">
            Patterns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          {/* Search and Filters */}
          <Card className="bg-nxe-surface border-nxe-border">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="device-search" className="text-gray-300">Search Devices</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="device-search"
                      placeholder="Search by user ID, IP, device, browser..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-nxe-dark border-nxe-border text-white"
                      data-testid="input-search-devices"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Filter by Status</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={selectedFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedFilter('all')}
                      data-testid="filter-all"
                    >
                      All
                    </Button>
                    <Button
                      variant={selectedFilter === 'suspicious' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedFilter('suspicious')}
                      data-testid="filter-suspicious"
                    >
                      Suspicious
                    </Button>
                    <Button
                      variant={selectedFilter === 'blocked' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedFilter('blocked')}
                      data-testid="filter-blocked"
                    >
                      Blocked
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Devices Table */}
          <Card className="bg-nxe-surface border-nxe-border">
            <CardHeader>
              <CardTitle className="text-white">Tracked Devices</CardTitle>
              <CardDescription className="text-gray-400">
                {filteredDevices.length} devices found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-nxe-border">
                      <TableHead className="text-gray-300">Device</TableHead>
                      <TableHead className="text-gray-300">User ID</TableHead>
                      <TableHead className="text-gray-300">IP Address</TableHead>
                      <TableHead className="text-gray-300">Location</TableHead>
                      <TableHead className="text-gray-300">Risk Score</TableHead>
                      <TableHead className="text-gray-300">Sessions</TableHead>
                      <TableHead className="text-gray-300">Last Seen</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devicesLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                          Loading devices...
                        </TableCell>
                      </TableRow>
                    ) : filteredDevices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                          No devices found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDevices.map((device) => (
                        <TableRow key={device.id} className="border-nxe-border">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getDeviceIcon(device.deviceType)}
                              <div>
                                <p className="text-white text-sm font-medium">{device.deviceName}</p>
                                <p className="text-xs text-gray-400">{device.browser} • {device.os}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-white">{device.userId}</TableCell>
                          <TableCell className="text-white font-mono text-sm">{device.ipAddress}</TableCell>
                          <TableCell>
                            {device.location ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-gray-400" />
                                <span className="text-white text-sm">
                                  {device.location.city}, {device.location.country}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    device.riskScore >= 80 ? 'bg-red-500' :
                                    device.riskScore >= 60 ? 'bg-orange-500' :
                                    device.riskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${device.riskScore}%` }}
                                />
                              </div>
                              <span className={`text-sm font-medium ${getRiskColor(device.riskScore)}`}>
                                {device.riskScore}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-white">{device.sessionCount}</TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {new Date(device.lastSeen).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getRiskBadge(device.riskScore)}
                              {device.isBlocked && (
                                <Badge className="bg-red-500/20 text-red-400">
                                  <Ban className="h-3 w-3 mr-1" />
                                  Blocked
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedDevice(device)}
                              data-testid={`button-view-device-${device.id}`}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card className="bg-nxe-surface border-nxe-border">
            <CardHeader>
              <CardTitle className="text-white">Device Analytics</CardTitle>
              <CardDescription className="text-gray-400">
                Detailed insights into device usage and risk patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Device Type Distribution</h3>
                  <div className="space-y-3">
                    {[
                      { type: 'mobile', label: 'Mobile Devices', icon: Smartphone, color: 'bg-blue-500' },
                      { type: 'desktop', label: 'Desktop Computers', icon: Monitor, color: 'bg-purple-500' },
                      { type: 'tablet', label: 'Tablets', icon: Tablet, color: 'bg-green-500' }
                    ].map(({ type, label, icon: Icon, color }) => {
                      const count = devices.filter(d => d.deviceType === type).length;
                      const percentage = devices.length > 0 ? (count / devices.length) * 100 : 0;
                      
                      return (
                        <div key={type} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300 flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{count}</span>
                              <span className="text-gray-400">({percentage.toFixed(1)}%)</span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${color} transition-all duration-300`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Risk Distribution</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Critical Risk (80-100)', min: 80, color: 'bg-red-500' },
                      { label: 'High Risk (60-79)', min: 60, max: 79, color: 'bg-orange-500' },
                      { label: 'Medium Risk (40-59)', min: 40, max: 59, color: 'bg-yellow-500' },
                      { label: 'Low Risk (0-39)', min: 0, max: 39, color: 'bg-green-500' }
                    ].map(({ label, min, max = 100, color }) => {
                      const count = devices.filter(d => d.riskScore >= min && d.riskScore <= max).length;
                      const percentage = devices.length > 0 ? (count / devices.length) * 100 : 0;
                      
                      return (
                        <div key={label} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">{label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{count}</span>
                              <span className="text-gray-400">({percentage.toFixed(1)}%)</span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${color} transition-all duration-300`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card className="bg-nxe-surface border-nxe-border">
            <CardHeader>
              <CardTitle className="text-white">Suspicious Patterns</CardTitle>
              <CardDescription className="text-gray-400">
                Common patterns and indicators of suspicious device activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-nxe-dark rounded-lg border border-orange-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                    <h4 className="text-sm font-medium text-white">Multiple Account Access</h4>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Single device accessing multiple user accounts
                  </p>
                  <div className="text-xl font-bold text-orange-400">
                    {stats?.multipleAccountDevices || 0} devices
                  </div>
                </div>

                <div className="p-4 bg-nxe-dark rounded-lg border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-purple-400" />
                    <h4 className="text-sm font-medium text-white">VPN Usage</h4>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Devices connecting through VPN services
                  </p>
                  <div className="text-xl font-bold text-purple-400">
                    {stats?.vpnDetected || 0} devices
                  </div>
                </div>

                <div className="p-4 bg-nxe-dark rounded-lg border border-red-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Ban className="h-5 w-5 text-red-400" />
                    <h4 className="text-sm font-medium text-white">Blocked Devices</h4>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Devices with confirmed malicious activity
                  </p>
                  <div className="text-xl font-bold text-red-400">
                    {stats?.blockedDevices || 0} devices
                  </div>
                </div>

                <div className="p-4 bg-nxe-dark rounded-lg border border-yellow-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-yellow-400" />
                    <h4 className="text-sm font-medium text-white">Unusual Session Patterns</h4>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Abnormal session frequency or duration
                  </p>
                  <div className="text-xl font-bold text-yellow-400">
                    {devices.filter(d => d.riskFactors.some(f => f.includes('session'))).length} devices
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
