import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Server,
  Database,
  HardDrive,
  FileText,
  Trash2,
  RefreshCw,
  Activity,
  Check,
  AlertTriangle,
  Zap,
  Archive,
  Settings,
  ShieldCheck
} from "lucide-react";

interface MaintenanceTabProps {
  hasAdminAccess: boolean;
}

export default function MaintenanceTab({ hasAdminAccess }: MaintenanceTabProps) {
  const { toast } = useToast();
  const [logRetentionDays, setLogRetentionDays] = useState(30);

  // Queries
  const { data: systemHealth, isLoading: healthLoading, isError: healthError, refetch: refetchHealth } = useQuery<any>({
    queryKey: ['/api/admin/maintenance/system/health'],
    enabled: hasAdminAccess,
    refetchInterval: false,
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: cacheStats, isLoading: cacheLoading, isError: cacheError } = useQuery<any>({
    queryKey: ['/api/admin/maintenance/cache/stats'],
    enabled: hasAdminAccess,
    refetchInterval: false,
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: dbStats, isLoading: dbLoading, isError: dbError } = useQuery<any>({
    queryKey: ['/api/admin/maintenance/database/stats'],
    enabled: hasAdminAccess,
    refetchInterval: false,
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: logStats, isLoading: logLoading, isError: logError } = useQuery<any>({
    queryKey: ['/api/admin/maintenance/logs/stats'],
    enabled: hasAdminAccess
  });

  const { data: storageStats, isLoading: storageLoading, isError: storageError } = useQuery<any>({
    queryKey: ['/api/admin/maintenance/storage/stats'],
    enabled: hasAdminAccess
  });

  const { data: backupStatus, isLoading: backupLoading, isError: backupError } = useQuery<any>({
    queryKey: ['/api/admin/backup/status'],
    enabled: hasAdminAccess,
    refetchInterval: false,
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Mutations
  const clearCacheMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/maintenance/cache/clear', { method: 'POST' }),
    onSuccess: (data: any) => {
      toast({
        title: "Cache Cleared",
        description: `${data.data.entriesCleared} cache entries have been deleted`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/maintenance/cache/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Clear Cache",
        description: error?.message || "An error occurred while clearing cache",
        variant: "destructive"
      });
    }
  });

  const cleanupCacheMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/maintenance/cache/cleanup', { method: 'POST' }),
    onSuccess: (data: any) => {
      toast({
        title: "Cache Cleanup Completed",
        description: `${data.data.expiredEntriesRemoved} expired entries have been deleted`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/maintenance/cache/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Cleanup Cache",
        description: error?.message || "An error occurred during cache cleanup",
        variant: "destructive"
      });
    }
  });

  const optimizeDbMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/maintenance/database/optimize', { method: 'POST' }),
    onSuccess: () => {
      toast({
        title: "Database Optimization Completed",
        description: "Database has been successfully optimized"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/maintenance/database/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Optimize Database",
        description: error?.message || "An error occurred during database optimization",
        variant: "destructive"
      });
    }
  });

  const cleanupLogsMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/maintenance/logs/cleanup', { 
      method: 'POST', 
      body: { retentionDays: logRetentionDays }
    }),
    onSuccess: (data: any) => {
      toast({
        title: "Log Cleanup Completed",
        description: `${data.data.filesDeleted} log files have been deleted (${data.data.spaceFreedMB} MB)`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/maintenance/logs/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Cleanup Logs",
        description: error?.message || "An error occurred during log cleanup",
        variant: "destructive"
      });
    }
  });

  const createBackupMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/backup/create', { method: 'POST' }),
    onSuccess: (data: any) => {
      toast({
        title: "Backup Created",
        description: `Backup successfully created (${data.data.size} MB)`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/backup/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Backup",
        description: error?.message || "An error occurred while creating backup",
        variant: "destructive"
      });
    }
  });

  const getHealthBadge = (status?: string) => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500">Operational</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500">Degraded</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500">Error</Badge>;
      case 'warning':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500">Warning</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500">Unknown</Badge>;
    }
  };

  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert className="max-w-md bg-red-900/20 border-red-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You do not have access to system maintenance features
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card className="bg-nxe-dark border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Activity className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <CardTitle className="text-white">System Status</CardTitle>
                <CardDescription>Overall system health</CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchHealth()}
              data-testid="button-refresh-health"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {healthLoading && (
            <div className="space-y-4">
              <div className="animate-pulse">
                <div className="h-20 bg-gray-800/50 rounded-lg mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-24 bg-gray-800/30 rounded-lg"></div>
                  <div className="h-24 bg-gray-800/30 rounded-lg"></div>
                  <div className="h-24 bg-gray-800/30 rounded-lg"></div>
                  <div className="h-24 bg-gray-800/30 rounded-lg"></div>
                </div>
              </div>
            </div>
          )}
          {healthError && (
            <Alert className="bg-red-900/20 border-red-500">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertTitle className="text-red-400">Error</AlertTitle>
              <AlertDescription className="text-red-400">
                Failed to load system health status. Please try again.
              </AlertDescription>
            </Alert>
          )}
          {!healthLoading && !healthError && systemHealth?.data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ShieldCheck className={`h-6 w-6 ${systemHealth.data.overall.healthy ? 'text-green-400' : 'text-red-400'}`} />
                  <div>
                    <div className="font-medium text-white">Overall Status</div>
                    <div className="text-sm text-gray-400">
                      Last checked: {new Date(systemHealth.data.overall.checkedAt).toLocaleString('en-US')}
                    </div>
                  </div>
                </div>
                {getHealthBadge(systemHealth.data.overall.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Database Health */}
                <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-blue-400" />
                      <span className="text-white font-medium">Database</span>
                    </div>
                    {getHealthBadge(systemHealth.data.components.database.status)}
                  </div>
                  <div className="text-sm text-gray-400">
                    {systemHealth.data.components.database.details?.userCount} registered users
                  </div>
                </div>

                {/* Cache Health */}
                <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      <span className="text-white font-medium">Cache</span>
                    </div>
                    {getHealthBadge(systemHealth.data.components.cache.status)}
                  </div>
                  <div className="text-sm text-gray-400">
                    {systemHealth.data.components.cache.details?.entries} entries 
                    ({systemHealth.data.components.cache.details?.utilizationPercent}% used)
                  </div>
                </div>

                {/* Logs Health */}
                <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-400" />
                      <span className="text-white font-medium">Logs</span>
                    </div>
                    {getHealthBadge(systemHealth.data.components.logs.status)}
                  </div>
                  <div className="text-sm text-gray-400">
                    {systemHealth.data.components.logs.details?.fileCount} log files
                  </div>
                </div>

                {/* Storage Health */}
                <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-green-400" />
                      <span className="text-white font-medium">Storage</span>
                    </div>
                    {getHealthBadge(systemHealth.data.components.storage.status)}
                  </div>
                  <div className="text-sm text-gray-400">
                    Storage system active
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cache Management */}
      <Card className="bg-nxe-dark border-gray-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Zap className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <CardTitle className="text-white">Cache Management</CardTitle>
              <CardDescription>Manage system cache for optimal performance</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {cacheLoading && (
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="h-20 bg-gray-800/30 rounded-lg"></div>
                <div className="h-20 bg-gray-800/30 rounded-lg"></div>
                <div className="h-20 bg-gray-800/30 rounded-lg"></div>
                <div className="h-20 bg-gray-800/30 rounded-lg"></div>
              </div>
            </div>
          )}
          {cacheError && (
            <Alert className="bg-red-900/20 border-red-500">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertTitle className="text-red-400">Error</AlertTitle>
              <AlertDescription className="text-red-400">
                Failed to load cache statistics. Please try again.
              </AlertDescription>
            </Alert>
          )}
          {!cacheLoading && !cacheError && cacheStats?.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-sm text-gray-400">Total Entries</div>
                  <div className="text-2xl font-bold text-white">{cacheStats.data.totalEntries}</div>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-sm text-gray-400">Valid</div>
                  <div className="text-2xl font-bold text-green-400">{cacheStats.data.validEntries}</div>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-sm text-gray-400">Expired</div>
                  <div className="text-2xl font-bold text-orange-400">{cacheStats.data.expiredEntries}</div>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-sm text-gray-400">Hit Ratio</div>
                  <div className="text-2xl font-bold text-blue-400">{cacheStats.data.hitRatio}%</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => cleanupCacheMutation.mutate()}
                  disabled={cleanupCacheMutation.isPending}
                  data-testid="button-cleanup-cache"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {cleanupCacheMutation.isPending ? 'Cleaning...' : 'Clean Expired'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => clearCacheMutation.mutate()}
                  disabled={clearCacheMutation.isPending}
                  data-testid="button-clear-cache"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {clearCacheMutation.isPending ? 'Clearing...' : 'Clear All Cache'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database Maintenance */}
      <Card className="bg-nxe-dark border-gray-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Database className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-white">Database Maintenance</CardTitle>
              <CardDescription>Database optimization and statistics</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dbLoading && (
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="h-20 bg-gray-800/30 rounded-lg"></div>
                <div className="h-20 bg-gray-800/30 rounded-lg"></div>
                <div className="h-20 bg-gray-800/30 rounded-lg"></div>
                <div className="h-20 bg-gray-800/30 rounded-lg"></div>
                <div className="h-20 bg-gray-800/30 rounded-lg"></div>
              </div>
            </div>
          )}
          {dbError && (
            <Alert className="bg-red-900/20 border-red-500">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertTitle className="text-red-400">Error</AlertTitle>
              <AlertDescription className="text-red-400">
                Failed to load database statistics. Please try again.
              </AlertDescription>
            </Alert>
          )}
          {!dbLoading && !dbError && dbStats?.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-sm text-gray-400">Users</div>
                  <div className="text-2xl font-bold text-white">{dbStats.data.tables.users.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-sm text-gray-400">Products</div>
                  <div className="text-2xl font-bold text-white">{dbStats.data.tables.products.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-sm text-gray-400">Transactions</div>
                  <div className="text-2xl font-bold text-white">{dbStats.data.tables.transactions.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-sm text-gray-400">Chats</div>
                  <div className="text-2xl font-bold text-white">{dbStats.data.tables.chats.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-sm text-gray-400">Messages</div>
                  <div className="text-2xl font-bold text-white">{dbStats.data.tables.messages.toLocaleString()}</div>
                </div>
              </div>

              <div className="p-4 bg-gray-800/30 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Database Size</div>
                <div className="text-xl font-bold text-white">{dbStats.data.database.size}</div>
              </div>

              <Button
                variant="outline"
                onClick={() => optimizeDbMutation.mutate()}
                disabled={optimizeDbMutation.isPending}
                data-testid="button-optimize-db"
              >
                <Settings className="h-4 w-4 mr-2" />
                {optimizeDbMutation.isPending ? 'Optimizing...' : 'Optimize Database'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup Management */}
      <Card className="bg-nxe-dark border-gray-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Archive className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-white">Backup Management</CardTitle>
              <CardDescription>Create and manage system backups</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {backupLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="h-20 bg-gray-800/30 rounded-lg"></div>
                <div className="h-20 bg-gray-800/30 rounded-lg"></div>
                <div className="h-20 bg-gray-800/30 rounded-lg"></div>
              </div>
            </div>
          ) : backupError ? (
            <Alert className="bg-red-900/20 border-red-500">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertTitle className="text-red-400">Error</AlertTitle>
              <AlertDescription className="text-red-400">
                Failed to load backup status. Please try again.
              </AlertDescription>
            </Alert>
          ) : backupStatus?.data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-sm text-gray-400">Status</div>
                  <div className="text-lg font-bold text-white">
                    {backupStatus.data.health.enabled ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500">Active</Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500">Inactive</Badge>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-sm text-gray-400">Total Backups</div>
                  <div className="text-2xl font-bold text-white">{backupStatus.data.health.backupCount}</div>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-sm text-gray-400">Total Size</div>
                  <div className="text-2xl font-bold text-white">{backupStatus.data.health.totalSizeMB} MB</div>
                </div>
              </div>

              {backupStatus.data.health.lastBackup && (
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-sm text-gray-400">Last Backup</div>
                  <div className="text-white">
                    {new Date(backupStatus.data.health.lastBackup).toLocaleString('en-US')}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => createBackupMutation.mutate()}
                disabled={createBackupMutation.isPending}
                data-testid="button-create-backup"
              >
                <Archive className="h-4 w-4 mr-2" />
                {createBackupMutation.isPending ? 'Creating Backup...' : 'Create Manual Backup'}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Log Management */}
      <Card className="bg-nxe-dark border-gray-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <FileText className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-white">Log Management</CardTitle>
              <CardDescription>Manage system log files</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logLoading && (
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="h-20 bg-gray-800/30 rounded-lg"></div>
                <div className="h-20 bg-gray-800/30 rounded-lg"></div>
              </div>
            </div>
          )}
          {logError && (
            <Alert className="bg-red-900/20 border-red-500">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertTitle className="text-red-400">Error</AlertTitle>
              <AlertDescription className="text-red-400">
                Failed to load log statistics. Please try again.
              </AlertDescription>
            </Alert>
          )}
          {!logLoading && !logError && logStats?.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-sm text-gray-400">Total Log Files</div>
                  <div className="text-2xl font-bold text-white">{logStats.data.fileCount}</div>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-sm text-gray-400">Total Size</div>
                  <div className="text-2xl font-bold text-white">{logStats.data.totalSizeMB} MB</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-sm text-gray-400 mb-2 block">Retention (days)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={logRetentionDays}
                    onChange={(e) => setLogRetentionDays(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    data-testid="input-log-retention"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={() => cleanupLogsMutation.mutate()}
                  disabled={cleanupLogsMutation.isPending}
                  className="mt-6"
                  data-testid="button-cleanup-logs"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {cleanupLogsMutation.isPending ? 'Cleaning...' : 'Clean Old Logs'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Management */}
      <Card className="bg-nxe-dark border-gray-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <HardDrive className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-white">Storage Statistics</CardTitle>
              <CardDescription>Storage usage information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {storageLoading && (
            <div className="animate-pulse">
              <div className="grid grid-cols-2 gap-4">
                <div className="h-20 bg-gray-800/30 rounded-lg"></div>
                <div className="h-20 bg-gray-800/30 rounded-lg"></div>
              </div>
            </div>
          )}
          {storageError && (
            <Alert className="bg-red-900/20 border-red-500">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertTitle className="text-red-400">Error</AlertTitle>
              <AlertDescription className="text-red-400">
                Failed to load storage statistics. Please try again.
              </AlertDescription>
            </Alert>
          )}
          {!storageLoading && !storageError && storageStats?.data && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-800/30 rounded-lg">
                <div className="text-sm text-gray-400">Uploaded Files</div>
                <div className="text-2xl font-bold text-white">{storageStats.data.uploadedFiles}</div>
              </div>
              <div className="p-3 bg-gray-800/30 rounded-lg">
                <div className="text-sm text-gray-400">Total Size</div>
                <div className="text-2xl font-bold text-white">{storageStats.data.totalSizeMB} MB</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
