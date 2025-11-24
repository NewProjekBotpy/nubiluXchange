import { useState, useEffect } from 'react';
import { logError } from '@/lib/logger';
import { useOffline } from '@/contexts/OfflineContext';
import { offlineDB } from '@/lib/offline-db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Database, Trash2, Download, RefreshCw, HardDrive, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StorageInfo {
  total: number;
  used: number;
  percentage: number;
  byStore: Record<string, number>;
}

export function OfflineStoragePanel() {
  const { stats, lastCleanupTime, performCleanup } = useOffline();
  const { toast } = useToast();
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    total: 0,
    used: 0,
    percentage: 0,
    byStore: {},
  });
  const [isClearing, setIsClearing] = useState(false);
  const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(true);
  const [offlineModeEnabled, setOfflineModeEnabled] = useState(true);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      const totalSize = await offlineDB.getTotalSize();
      const stores = ['messages', 'products', 'transactions', 'wallet'];
      const byStore: Record<string, number> = {};

      for (const store of stores) {
        try {
          const size = await offlineDB.getStoreSize(store);
          byStore[store] = size;
        } catch (error) {
          byStore[store] = 0;
        }
      }

      // Estimate quota (5MB default, actual quota may vary)
      const quota = 5 * 1024 * 1024; // 5MB
      const percentage = (totalSize / quota) * 100;

      setStorageInfo({
        total: quota,
        used: totalSize,
        percentage,
        byStore,
      });
    } catch (error) {
      logError('[OfflineStoragePanel] Failed to load storage info', error as Error);
    }
  };

  const handleClearStorage = async () => {
    if (!confirm('Hapus semua data offline? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    setIsClearing(true);
    try {
      await offlineDB.clearAll();
      await loadStorageInfo();
      
      toast({
        title: '✅ Storage Dibersihkan',
        description: 'Semua data offline telah dihapus',
        duration: 3000,
      });
    } catch (error) {
      logError('[OfflineStoragePanel] Failed to clear storage', error as Error);
      toast({
        title: '⚠️ Error',
        description: 'Gagal membersihkan storage',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleCleanup = async () => {
    setIsClearing(true);
    try {
      await performCleanup();
      await loadStorageInfo();
      
      toast({
        title: '✅ Cleanup Selesai',
        description: 'Data lama telah dibersihkan',
        duration: 3000,
      });
    } catch (error) {
      logError('[OfflineStoragePanel] Cleanup failed', error as Error);
      toast({
        title: '⚠️ Error',
        description: 'Gagal melakukan cleanup',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        stats,
        storageInfo,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `offline-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: '✅ Data Diekspor',
        description: 'Data offline telah diunduh',
        duration: 3000,
      });
    } catch (error) {
      logError('[OfflineStoragePanel] Export failed', error as Error);
      toast({
        title: '⚠️ Error',
        description: 'Gagal mengekspor data',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStoreColor = (store: string): string => {
    const colors: Record<string, string> = {
      messages: 'bg-blue-500',
      products: 'bg-green-500',
      transactions: 'bg-purple-500',
      wallet: 'bg-orange-500',
    };
    return colors[store] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6" data-testid="offline-storage-panel">
      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-storage-title">
            <HardDrive className="h-5 w-5" />
            Penggunaan Storage
          </CardTitle>
          <CardDescription data-testid="text-storage-description">
            Kelola penyimpanan offline Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span data-testid="text-storage-used">{formatBytes(storageInfo.used)}</span>
              <span data-testid="text-storage-total">dari {formatBytes(storageInfo.total)}</span>
            </div>
            <Progress value={storageInfo.percentage} data-testid="progress-storage" />
            <p className="text-xs text-muted-foreground" data-testid="text-storage-percentage">
              {Math.round(storageInfo.percentage)}% terpakai
            </p>
          </div>

          {storageInfo.percentage > 80 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-900" data-testid="alert-storage-warning">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-600 dark:text-yellow-500">
                <p className="font-semibold">Storage hampir penuh</p>
                <p className="text-xs">Lakukan cleanup untuk membebaskan ruang</p>
              </div>
            </div>
          )}

          {/* Storage by Store */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold" data-testid="text-breakdown-title">Breakdown per Store</h4>
            <div className="space-y-2">
              {Object.entries(storageInfo.byStore).map(([store, size]) => (
                <div key={store} className="flex items-center justify-between" data-testid={`storage-item-${store}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStoreColor(store)}`} />
                    <span className="text-sm capitalize" data-testid={`text-store-name-${store}`}>{store}</span>
                  </div>
                  <span className="text-sm text-muted-foreground" data-testid={`text-store-size-${store}`}>
                    {formatBytes(size)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-analytics-title">
            <Database className="h-5 w-5" />
            Analitik Sinkronisasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center" data-testid="analytics-total">
              <div className="text-2xl font-bold" data-testid="text-analytics-total-value">{stats.total}</div>
              <div className="text-xs text-muted-foreground" data-testid="text-analytics-total-label">Total Item</div>
            </div>
            <div className="text-center" data-testid="analytics-completed">
              <div className="text-2xl font-bold text-green-500" data-testid="text-analytics-completed-value">{stats.completed}</div>
              <div className="text-xs text-muted-foreground" data-testid="text-analytics-completed-label">Selesai</div>
            </div>
            <div className="text-center" data-testid="analytics-failed">
              <div className="text-2xl font-bold text-red-500" data-testid="text-analytics-failed-value">{stats.failed}</div>
              <div className="text-xs text-muted-foreground" data-testid="text-analytics-failed-label">Gagal</div>
            </div>
            <div className="text-center" data-testid="analytics-success-rate">
              <div className="text-2xl font-bold text-blue-500" data-testid="text-analytics-success-rate-value">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </div>
              <div className="text-xs text-muted-foreground" data-testid="text-analytics-success-rate-label">Success Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-settings-title">Pengaturan Offline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between" data-testid="setting-offline-mode">
            <div className="space-y-0.5">
              <Label htmlFor="offline-mode" data-testid="label-offline-mode">Mode Offline</Label>
              <p className="text-xs text-muted-foreground" data-testid="text-offline-mode-description">
                Aktifkan penyimpanan data offline
              </p>
            </div>
            <Switch
              id="offline-mode"
              checked={offlineModeEnabled}
              onCheckedChange={setOfflineModeEnabled}
              data-testid="switch-offline-mode"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between" data-testid="setting-auto-cleanup">
            <div className="space-y-0.5">
              <Label htmlFor="auto-cleanup" data-testid="label-auto-cleanup">Auto Cleanup</Label>
              <p className="text-xs text-muted-foreground" data-testid="text-auto-cleanup-description">
                Bersihkan data lama secara otomatis
              </p>
            </div>
            <Switch
              id="auto-cleanup"
              checked={autoCleanupEnabled}
              onCheckedChange={setAutoCleanupEnabled}
              data-testid="switch-auto-cleanup"
            />
          </div>

          {lastCleanupTime && (
            <p className="text-xs text-muted-foreground" data-testid="text-last-cleanup">
              Cleanup terakhir: {new Date(lastCleanupTime).toLocaleString('id-ID')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-actions-title">Tindakan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={handleCleanup}
            disabled={isClearing}
            variant="outline"
            className="w-full"
            data-testid="button-cleanup"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isClearing ? 'animate-spin' : ''}`} />
            Bersihkan Data Lama
          </Button>

          <Button
            onClick={handleExportData}
            variant="outline"
            className="w-full"
            data-testid="button-export"
          >
            <Download className="h-4 w-4 mr-2" />
            Ekspor Data
          </Button>

          <Button
            onClick={handleClearStorage}
            disabled={isClearing}
            variant="destructive"
            className="w-full"
            data-testid="button-clear-all"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Hapus Semua Data Offline
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
