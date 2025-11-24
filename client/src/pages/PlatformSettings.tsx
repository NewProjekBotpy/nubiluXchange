import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Settings,
  Server,
  Bell,
  Wrench,
  Shield,
  Mail,
  Globe,
  Database,
  Upload,
  RefreshCw,
  Download,
  Save,
  Power,
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Wifi,
  Lock,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  CreditCard,
  Zap,
  MessageSquare,
  FileText,
  Image,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  Palette,
  Languages,
  DollarSign,
  Percent,
  Calendar,
  BarChart3
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminNavbar from "@/components/admin/AdminNavbar";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface PlatformConfig {
  id: number;
  key: string;
  value: string;
  description: string;
  updatedAt: string;
  updatedBy?: number;
}

interface SystemStatus {
  uptime: string;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  activeConnections: number;
  databaseStatus: 'healthy' | 'warning' | 'error';
  redisStatus: 'connected' | 'disconnected' | 'disabled';
}

interface NotificationTemplate {
  id: number;
  name: string;
  type: string;
  template: string;
  variables: string[];
  isActive: boolean;
}

interface MaintenanceStatus {
  isEnabled: boolean;
  message: string;
  startTime?: string;
  endTime?: string;
  affectedServices: string[];
}

export default function PlatformSettings() {
  const { toast } = useToast();
  const queryClientInstance = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Pull to refresh
  usePullToRefresh({
    onRefresh: () => {
      queryClientInstance.invalidateQueries({ queryKey: ["admin", "platform"] });
    }
  });

  // Platform configs query
  const { data: platformConfigs, isLoading: loadingConfigs } = useQuery<PlatformConfig[]>({
    queryKey: ["admin", "platform", "configs"],
    queryFn: () => apiRequest("/api/admin/platform/configs"),
    refetchInterval: 30000,
  });

  // System status query
  const { data: systemStatus, isLoading: loadingStatus } = useQuery<SystemStatus>({
    queryKey: ["admin", "platform", "status"],
    queryFn: () => apiRequest("/api/admin/platform/status"),
    refetchInterval: 5000,
  });

  // Notification templates query
  const { data: notificationTemplates, isLoading: loadingTemplates } = useQuery<NotificationTemplate[]>({
    queryKey: ["admin", "platform", "notification-templates"],
    queryFn: () => apiRequest("/api/admin/platform/notification-templates"),
  });

  // Maintenance status query
  const { data: maintenanceStatus, isLoading: loadingMaintenance } = useQuery<MaintenanceStatus>({
    queryKey: ["admin", "platform", "maintenance"],
    queryFn: () => apiRequest("/api/admin/platform/maintenance"),
    refetchInterval: 10000,
  });

  // Mutations
  const updateConfigMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      apiRequest("/api/admin/platform/configs", { 
        method: "PUT", 
        body: { key, value },
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Configuration updated successfully",
      });
      queryClientInstance.invalidateQueries({ queryKey: ["admin", "platform"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update configuration",
        variant: "destructive",
      });
    },
  });

  const toggleMaintenanceMutation = useMutation({
    mutationFn: (data: Partial<MaintenanceStatus>) =>
      apiRequest("/api/admin/platform/maintenance", { 
        method: "POST", 
        body: data,
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Maintenance mode updated successfully",
      });
      queryClientInstance.invalidateQueries({ queryKey: ["admin", "platform"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update maintenance mode",
        variant: "destructive",
      });
    },
  });

  const clearCacheMutation = useMutation({
    mutationFn: () => apiRequest("/api/admin/platform/cache/clear", { method: "POST" }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cache cleared successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear cache",
        variant: "destructive",
      });
    },
  });

  const restartServiceMutation = useMutation({
    mutationFn: (service: string) =>
      apiRequest(`/api/admin/platform/services/${service}/restart`, { method: "POST" }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Service restarted successfully",
      });
      queryClientInstance.invalidateQueries({ queryKey: ["admin", "platform"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restart service",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
      case 'disconnected':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getUsageColor = (usage: number) => {
    if (usage < 50) return 'text-green-400';
    if (usage < 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getConfigValue = (key: string) => {
    const config = platformConfigs?.find(c => c.key === key);
    return config?.value || '';
  };

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateURL = (url: string): boolean => {
    try {
      // Allow hostnames and full URLs
      if (!url.includes('://')) {
        // Just hostname validation
        const hostnameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
        return hostnameRegex.test(url);
      }
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateLength = (value: string, min: number, max: number): boolean => {
    const length = value.trim().length;
    return length >= min && length <= max;
  };

  const validateNumber = (value: string, min: number, max: number): { valid: boolean; message?: string } => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return { valid: false, message: 'Please enter a valid number' };
    }
    if (numValue < min) {
      return { valid: false, message: `Value must be at least ${min}` };
    }
    if (numValue > max) {
      return { valid: false, message: `Value cannot exceed ${max}` };
    }
    return { valid: true };
  };

  const validatePort = (port: string): boolean => {
    const portNum = parseInt(port, 10);
    return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // International phone number format (E.164) or basic validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
  };

  const validateField = (key: string, value: string): string | null => {
    const trimmedValue = value.trim();

    // Empty value check for required fields
    if (!trimmedValue && ['platform_name', 'support_email'].includes(key)) {
      return 'This field is required';
    }

    // Email validation
    if (key === 'support_email' && trimmedValue) {
      if (!validateEmail(trimmedValue)) {
        return 'Please enter a valid email address (e.g., support@example.com)';
      }
    }

    // URL/hostname validation
    if (key === 'smtp_server' && trimmedValue) {
      if (!validateURL(trimmedValue)) {
        return 'Please enter a valid hostname or URL (e.g., smtp.example.com or https://smtp.example.com)';
      }
    }

    // Port validation
    if (key === 'smtp_port' && trimmedValue) {
      if (!validatePort(trimmedValue)) {
        return 'Please enter a valid port number (1-65535)';
      }
    }

    // Phone number validation
    if (key === 'support_phone' && trimmedValue) {
      if (!validatePhoneNumber(trimmedValue)) {
        return 'Please enter a valid phone number (e.g., +1234567890)';
      }
    }

    // Length validation for text fields
    if (['platform_name', 'platform_description'].includes(key)) {
      if (key === 'platform_name') {
        if (!validateLength(trimmedValue, 3, 100)) {
          return 'Platform name must be between 3 and 100 characters';
        }
      }
      if (key === 'platform_description') {
        if (trimmedValue && !validateLength(trimmedValue, 10, 500)) {
          return 'Platform description must be between 10 and 500 characters';
        }
      }
    }

    // Numeric validations with specific ranges
    if (key === 'commission_rate' && trimmedValue) {
      const result = validateNumber(trimmedValue, 0, 100);
      if (!result.valid) {
        return result.message || 'Commission rate must be between 0% and 100%';
      }
    }

    if (key === 'min_withdrawal' && trimmedValue) {
      const result = validateNumber(trimmedValue, 1000, 100000000);
      if (!result.valid) {
        return result.message || 'Minimum withdrawal must be between 1,000 and 100,000,000';
      }
    }

    if (key === 'max_transaction' && trimmedValue) {
      const result = validateNumber(trimmedValue, 1000, 1000000000);
      if (!result.valid) {
        return result.message || 'Maximum transaction must be between 1,000 and 1,000,000,000';
      }
    }

    return null;
  };

  const handleConfigUpdate = (key: string, value: string) => {
    // Trim the value
    const trimmedValue = value.trim();

    // Validate the field
    const error = validateField(key, trimmedValue);
    
    if (error) {
      // Set validation error
      setValidationErrors(prev => ({ ...prev, [key]: error }));
      toast({
        title: "Validation Error",
        description: error,
        variant: "destructive",
      });
      return;
    }

    // Clear validation error if exists
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });

    // Update config
    updateConfigMutation.mutate({ key, value: trimmedValue });
  };

  return (
    <div className="min-h-screen bg-nxe-dark">
      <AdminNavbar currentTab="configs" />
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2" data-testid="text-page-title">
              Platform Settings
            </h1>
            <p className="text-gray-400">Manage system configuration, notifications, and maintenance</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                queryClientInstance.invalidateQueries({ queryKey: ["admin", "platform"] });
              }}
              className="border-nxe-border hover:bg-nxe-primary/10"
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => {
                // Handle export functionality
              }}
              className="bg-nxe-primary hover:bg-nxe-primary/90"
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Config
            </Button>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 lg:w-fit bg-nxe-card">
            <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
            <TabsTrigger value="system" data-testid="tab-system">System</TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
            <TabsTrigger value="maintenance" data-testid="tab-maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Platform Configuration */}
              <Card className="bg-nxe-card border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Platform Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-400">Platform Name</Label>
                    <Input
                      placeholder="Enter platform name"
                      defaultValue={getConfigValue('platform_name')}
                      onBlur={(e) => handleConfigUpdate('platform_name', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-platform-name"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Platform Description</Label>
                    <Textarea
                      placeholder="Enter platform description"
                      defaultValue={getConfigValue('platform_description')}
                      onBlur={(e) => handleConfigUpdate('platform_description', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="textarea-platform-description"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Support Email</Label>
                    <Input
                      type="email"
                      placeholder="support@platform.com"
                      defaultValue={getConfigValue('support_email')}
                      onBlur={(e) => handleConfigUpdate('support_email', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-support-email"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Business Settings */}
              <Card className="bg-nxe-card border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Business Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-400">Commission Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      defaultValue={getConfigValue('commission_rate')}
                      onBlur={(e) => handleConfigUpdate('commission_rate', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-commission-rate"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Minimum Withdrawal</Label>
                    <Input
                      type="number"
                      min="0"
                      defaultValue={getConfigValue('min_withdrawal')}
                      onBlur={(e) => handleConfigUpdate('min_withdrawal', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-min-withdrawal"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Maximum Transaction</Label>
                    <Input
                      type="number"
                      min="0"
                      defaultValue={getConfigValue('max_transaction')}
                      onBlur={(e) => handleConfigUpdate('max_transaction', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-max-transaction"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Feature Toggles */}
            <Card className="bg-nxe-card border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white">Feature Toggles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { key: 'user_registration_enabled', label: 'User Registration', icon: Users },
                    { key: 'payment_enabled', label: 'Payment Processing', icon: CreditCard },
                    { key: 'ai_chat_enabled', label: 'AI Chat Support', icon: MessageSquare },
                    { key: 'file_upload_enabled', label: 'File Uploads', icon: Upload },
                    { key: 'notifications_enabled', label: 'Push Notifications', icon: Bell },
                    { key: 'analytics_enabled', label: 'Analytics Tracking', icon: BarChart3 },
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5 text-nxe-accent" />
                        <span className="text-white">{label}</span>
                      </div>
                      <Switch
                        checked={getConfigValue(key) === 'true'}
                        onCheckedChange={(checked) => handleConfigUpdate(key, checked.toString())}
                        data-testid={`switch-${key}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Status Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Status */}
              <Card className="bg-nxe-card border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Uptime</span>
                        <Clock className="h-4 w-4 text-green-400" />
                      </div>
                      <p className="text-white font-medium">{systemStatus?.uptime || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Connections</span>
                        <Wifi className="h-4 w-4 text-blue-400" />
                      </div>
                      <p className="text-white font-medium">{systemStatus?.activeConnections || 0}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center">
                        <Database className="h-4 w-4 mr-2" />
                        Database
                      </span>
                      <Badge 
                        variant={systemStatus?.databaseStatus === 'healthy' ? 'default' : 'destructive'}
                        className={getStatusColor(systemStatus?.databaseStatus || '')}
                      >
                        {systemStatus?.databaseStatus || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center">
                        <Server className="h-4 w-4 mr-2" />
                        Redis
                      </span>
                      <Badge 
                        variant={systemStatus?.redisStatus === 'connected' ? 'default' : 'secondary'}
                        className={getStatusColor(systemStatus?.redisStatus || '')}
                      >
                        {systemStatus?.redisStatus || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resource Usage */}
              <Card className="bg-nxe-card border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Cpu className="h-5 w-5 mr-2" />
                    Resource Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-400 flex items-center">
                          <Cpu className="h-4 w-4 mr-2" />
                          CPU Usage
                        </span>
                        <span className={`font-medium ${getUsageColor(systemStatus?.cpuUsage || 0)}`}>
                          {systemStatus?.cpuUsage || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-nxe-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${systemStatus?.cpuUsage || 0}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-400 flex items-center">
                          <MemoryStick className="h-4 w-4 mr-2" />
                          Memory Usage
                        </span>
                        <span className={`font-medium ${getUsageColor(systemStatus?.memoryUsage || 0)}`}>
                          {systemStatus?.memoryUsage || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-nxe-accent h-2 rounded-full transition-all duration-300"
                          style={{ width: `${systemStatus?.memoryUsage || 0}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-400 flex items-center">
                          <HardDrive className="h-4 w-4 mr-2" />
                          Disk Usage
                        </span>
                        <span className={`font-medium ${getUsageColor(systemStatus?.diskUsage || 0)}`}>
                          {systemStatus?.diskUsage || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${systemStatus?.diskUsage || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Actions */}
            <Card className="bg-nxe-card border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white">System Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => clearCacheMutation.mutate()}
                    disabled={clearCacheMutation.isPending}
                    className="border-nxe-border hover:bg-nxe-primary/10"
                    data-testid="button-clear-cache"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear Cache
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="border-nxe-border hover:bg-orange-500/10"
                        data-testid="button-restart-services"
                      >
                        <Power className="h-4 w-4 mr-2" />
                        Restart Services
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-nxe-card border-nxe-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Restart Services</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                          This will restart all platform services. Users may experience temporary downtime.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-nxe-border">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => restartServiceMutation.mutate('all')}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          Restart All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button
                    variant="outline"
                    onClick={() => {
                      // Handle database optimization
                    }}
                    className="border-nxe-border hover:bg-blue-500/10"
                    data-testid="button-optimize-db"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Optimize DB
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      // Handle log cleanup
                    }}
                    className="border-nxe-border hover:bg-green-500/10"
                    data-testid="button-cleanup-logs"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Cleanup Logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Email Settings */}
              <Card className="bg-nxe-card border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Mail className="h-5 w-5 mr-2" />
                    Email Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-400">SMTP Server</Label>
                    <Input
                      placeholder="smtp.gmail.com"
                      defaultValue={getConfigValue('smtp_server')}
                      onBlur={(e) => handleConfigUpdate('smtp_server', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-smtp-server"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">SMTP Port</Label>
                    <Input
                      type="number"
                      placeholder="587"
                      defaultValue={getConfigValue('smtp_port')}
                      onBlur={(e) => handleConfigUpdate('smtp_port', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-smtp-port"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">SMTP Username</Label>
                    <Input
                      placeholder="your-email@gmail.com"
                      defaultValue={getConfigValue('smtp_username')}
                      onBlur={(e) => handleConfigUpdate('smtp_username', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-smtp-username"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">SMTP Password</Label>
                    <div className="relative">
                      <Input
                        type={showPasswordField ? "text" : "password"}
                        placeholder="••••••••"
                        defaultValue={getConfigValue('smtp_password')}
                        onBlur={(e) => handleConfigUpdate('smtp_password', e.target.value)}
                        className="bg-nxe-card border-nxe-border text-white pr-10"
                        data-testid="input-smtp-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswordField(!showPasswordField)}
                      >
                        {showPasswordField ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Push Notification Settings */}
              <Card className="bg-nxe-card border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Smartphone className="h-5 w-5 mr-2" />
                    Push Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-400">VAPID Public Key</Label>
                    <Textarea
                      placeholder="Your VAPID public key"
                      defaultValue={getConfigValue('vapid_public_key')}
                      onBlur={(e) => handleConfigUpdate('vapid_public_key', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="textarea-vapid-public"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">VAPID Private Key</Label>
                    <Textarea
                      placeholder="Your VAPID private key"
                      defaultValue={getConfigValue('vapid_private_key')}
                      onBlur={(e) => handleConfigUpdate('vapid_private_key', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="textarea-vapid-private"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-400">Enable Push Notifications</Label>
                    <Switch
                      checked={getConfigValue('push_notifications_enabled') === 'true'}
                      onCheckedChange={(checked) => handleConfigUpdate('push_notifications_enabled', checked.toString())}
                      data-testid="switch-push-notifications"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notification Templates */}
            <Card className="bg-nxe-card border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white">Notification Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notificationTemplates?.map((template) => (
                    <div key={template.id} className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-medium">{template.name}</h4>
                        <Switch
                          checked={template.isActive}
                          onCheckedChange={(checked) => {
                            // Handle template toggle
                          }}
                        />
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{template.type}</p>
                      <p className="text-gray-300 text-xs line-clamp-2">{template.template}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-6">
            <Card className="bg-nxe-card border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Wrench className="h-5 w-5 mr-2" />
                  Maintenance Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div>
                    <h3 className="text-white font-medium">Enable Maintenance Mode</h3>
                    <p className="text-gray-400 text-sm">Temporarily disable platform access for maintenance</p>
                  </div>
                  <Switch
                    checked={maintenanceStatus?.isEnabled || false}
                    onCheckedChange={(checked) => {
                      toggleMaintenanceMutation.mutate({ isEnabled: checked });
                    }}
                    data-testid="switch-maintenance-mode"
                  />
                </div>

                {maintenanceStatus?.isEnabled && (
                  <div className="space-y-4 p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                    <div>
                      <Label className="text-gray-400">Maintenance Message</Label>
                      <Textarea
                        placeholder="Enter maintenance message for users"
                        value={maintenanceStatus.message}
                        onChange={(e) => {
                          // Handle maintenance message update
                        }}
                        className="bg-nxe-card border-nxe-border text-white"
                        data-testid="textarea-maintenance-message"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-400">Start Time</Label>
                        <Input
                          type="datetime-local"
                          value={maintenanceStatus.startTime}
                          onChange={(e) => {
                            // Handle start time update
                          }}
                          className="bg-nxe-card border-nxe-border text-white"
                          data-testid="input-maintenance-start"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">End Time</Label>
                        <Input
                          type="datetime-local"
                          value={maintenanceStatus.endTime}
                          onChange={(e) => {
                            // Handle end time update
                          }}
                          className="bg-nxe-card border-nxe-border text-white"
                          data-testid="input-maintenance-end"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-400">Affected Services</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {['Payments', 'Chat', 'File Upload', 'Notifications', 'Analytics', 'API'].map((service) => (
                          <div key={service} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={service}
                              checked={maintenanceStatus.affectedServices?.includes(service)}
                              onChange={(e) => {
                                // Handle affected services update
                              }}
                              className="rounded border-gray-600"
                            />
                            <label htmlFor={service} className="text-white text-sm">{service}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Backup & Recovery */}
            <Card className="bg-nxe-card border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Backup & Recovery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Handle database backup
                    }}
                    className="border-nxe-border hover:bg-green-500/10"
                    data-testid="button-backup-db"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Backup Database
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Handle file backup
                    }}
                    className="border-nxe-border hover:bg-blue-500/10"
                    data-testid="button-backup-files"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Backup Files
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      // Handle config export
                    }}
                    className="border-nxe-border hover:bg-purple-500/10"
                    data-testid="button-export-config"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Export Config
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="border-red-500 text-red-400 hover:bg-red-500/10"
                        data-testid="button-restore-backup"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Restore Backup
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-nxe-card border-nxe-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Restore Backup</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                          This will restore the platform to a previous backup. All current data will be lost.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-nxe-border">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            // Handle backup restoration
                          }}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Restore
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Authentication Settings */}
              <Card className="bg-nxe-card border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Lock className="h-5 w-5 mr-2" />
                    Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-400">Two-Factor Authentication</Label>
                      <Switch
                        checked={getConfigValue('2fa_enabled') === 'true'}
                        onCheckedChange={(checked) => handleConfigUpdate('2fa_enabled', checked.toString())}
                        data-testid="switch-2fa"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-400">Email Verification Required</Label>
                      <Switch
                        checked={getConfigValue('email_verification_required') === 'true'}
                        onCheckedChange={(checked) => handleConfigUpdate('email_verification_required', checked.toString())}
                        data-testid="switch-email-verification"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-400">Phone Verification Required</Label>
                      <Switch
                        checked={getConfigValue('phone_verification_required') === 'true'}
                        onCheckedChange={(checked) => handleConfigUpdate('phone_verification_required', checked.toString())}
                        data-testid="switch-phone-verification"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-gray-400">Session Timeout (minutes)</Label>
                    <Input
                      type="number"
                      min="5"
                      max="1440"
                      defaultValue={getConfigValue('session_timeout')}
                      onBlur={(e) => handleConfigUpdate('session_timeout', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-session-timeout"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Security Policies */}
              <Card className="bg-nxe-card border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Security Policies
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-400">Maximum Login Attempts</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      defaultValue={getConfigValue('max_login_attempts')}
                      onBlur={(e) => handleConfigUpdate('max_login_attempts', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-max-login-attempts"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Account Lockout Duration (minutes)</Label>
                    <Input
                      type="number"
                      min="5"
                      max="1440"
                      defaultValue={getConfigValue('lockout_duration')}
                      onBlur={(e) => handleConfigUpdate('lockout_duration', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-lockout-duration"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Password Minimum Length</Label>
                    <Input
                      type="number"
                      min="6"
                      max="128"
                      defaultValue={getConfigValue('password_min_length')}
                      onBlur={(e) => handleConfigUpdate('password_min_length', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-password-min-length"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-400">Require Strong Passwords</Label>
                    <Switch
                      checked={getConfigValue('strong_passwords_required') === 'true'}
                      onCheckedChange={(checked) => handleConfigUpdate('strong_passwords_required', checked.toString())}
                      data-testid="switch-strong-passwords"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* API Security */}
            <Card className="bg-nxe-card border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  API Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Rate Limit (requests/minute)</Label>
                    <Input
                      type="number"
                      min="10"
                      max="1000"
                      defaultValue={getConfigValue('api_rate_limit')}
                      onBlur={(e) => handleConfigUpdate('api_rate_limit', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-api-rate-limit"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">API Key Expiry (days)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      defaultValue={getConfigValue('api_key_expiry')}
                      onBlur={(e) => handleConfigUpdate('api_key_expiry', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-api-key-expiry"
                    />
                  </div>
                </div>
                
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-400">Enable CORS</Label>
                    <Switch
                      checked={getConfigValue('cors_enabled') === 'true'}
                      onCheckedChange={(checked) => handleConfigUpdate('cors_enabled', checked.toString())}
                      data-testid="switch-cors"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-400">Require HTTPS</Label>
                    <Switch
                      checked={getConfigValue('https_required') === 'true'}
                      onCheckedChange={(checked) => handleConfigUpdate('https_required', checked.toString())}
                      data-testid="switch-https"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Caching Settings */}
              <Card className="bg-nxe-card border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Caching
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-400">Enable Redis Cache</Label>
                      <Switch
                        checked={getConfigValue('redis_cache_enabled') === 'true'}
                        onCheckedChange={(checked) => handleConfigUpdate('redis_cache_enabled', checked.toString())}
                        data-testid="switch-redis-cache"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-400">Enable File Cache</Label>
                      <Switch
                        checked={getConfigValue('file_cache_enabled') === 'true'}
                        onCheckedChange={(checked) => handleConfigUpdate('file_cache_enabled', checked.toString())}
                        data-testid="switch-file-cache"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-gray-400">Cache TTL (seconds)</Label>
                    <Input
                      type="number"
                      min="60"
                      max="86400"
                      defaultValue={getConfigValue('cache_ttl')}
                      onBlur={(e) => handleConfigUpdate('cache_ttl', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-cache-ttl"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* File Upload Settings */}
              <Card className="bg-nxe-card border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    File Uploads
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-400">Max File Size (MB)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      defaultValue={getConfigValue('max_file_size')}
                      onBlur={(e) => handleConfigUpdate('max_file_size', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-max-file-size"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Allowed File Types</Label>
                    <Input
                      placeholder="jpg,png,gif,pdf,doc"
                      defaultValue={getConfigValue('allowed_file_types')}
                      onBlur={(e) => handleConfigUpdate('allowed_file_types', e.target.value)}
                      className="bg-nxe-card border-nxe-border text-white"
                      data-testid="input-allowed-file-types"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-400">Enable Image Compression</Label>
                    <Switch
                      checked={getConfigValue('image_compression_enabled') === 'true'}
                      onCheckedChange={(checked) => handleConfigUpdate('image_compression_enabled', checked.toString())}
                      data-testid="switch-image-compression"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Database Optimization */}
            <Card className="bg-nxe-card border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Database Optimization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Handle analyze tables
                    }}
                    className="border-nxe-border hover:bg-blue-500/10"
                    data-testid="button-analyze-tables"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analyze Tables
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Handle rebuild indexes
                    }}
                    className="border-nxe-border hover:bg-green-500/10"
                    data-testid="button-rebuild-indexes"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Rebuild Indexes
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      // Handle vacuum database
                    }}
                    className="border-nxe-border hover:bg-purple-500/10"
                    data-testid="button-vacuum-db"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Vacuum Database
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      // Handle update statistics
                    }}
                    className="border-nxe-border hover:bg-orange-500/10"
                    data-testid="button-update-stats"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Update Statistics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}