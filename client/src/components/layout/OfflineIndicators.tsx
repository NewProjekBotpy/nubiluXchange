// Enhanced Offline UI Indicators Component
// Shows offline banner, sync status, bandwidth quality, and queue manager

import { useOffline } from '@/contexts/OfflineContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  WifiOff, 
  Wifi, 
  CloudOff,
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  X,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
  List
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { QueueManager } from '@/components/offline/QueueManager';
import { ConflictResolver } from '@/components/offline/ConflictResolver';

export function OfflineBanner() {
  const { isOnline, isSyncing, queueStats, syncError, forceSyncNow } = useOffline();
  const [isVisible, setIsVisible] = useState(!isOnline);
  const [isDismissed, setIsDismissed] = useState(false);

  // Show banner when offline or syncing with pending items
  useEffect(() => {
    if (!isOnline || queueStats.pending > 0 || queueStats.failed > 0) {
      setIsVisible(true);
      setIsDismissed(false);
    } else if (isOnline && queueStats.pending === 0 && queueStats.failed === 0) {
      // Auto-hide after coming online and queue is empty
      setTimeout(() => setIsVisible(false), 3000);
    }
  }, [isOnline, queueStats]);

  if (!isVisible || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  const getBannerConfig = () => {
    if (!isOnline) {
      return {
        icon: <WifiOff className="h-4 w-4" data-testid="icon-offline" />,
        title: 'Anda Sedang Offline',
        description: 'Beberapa fitur mungkin tidak tersedia. Perubahan akan disinkronkan saat online kembali.',
        variant: 'destructive' as const,
        showSync: false,
      };
    }

    if (syncError) {
      return {
        icon: <AlertCircle className="h-4 w-4" data-testid="icon-sync-error" />,
        title: 'Error Sinkronisasi',
        description: syncError,
        variant: 'destructive' as const,
        showSync: true,
      };
    }

    if (isSyncing || queueStats.pending > 0) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin" data-testid="icon-syncing" />,
        title: 'Menyinkronkan...',
        description: `${queueStats.pending} item menunggu untuk disinkronkan`,
        variant: 'default' as const,
        showSync: false,
      };
    }

    if (isOnline && queueStats.pending === 0 && queueStats.failed === 0) {
      return {
        icon: <CheckCircle2 className="h-4 w-4" data-testid="icon-synced" />,
        title: 'Tersinkronisasi',
        description: 'Semua perubahan telah disinkronkan',
        variant: 'default' as const,
        showSync: false,
      };
    }

    return {
      icon: <Wifi className="h-4 w-4" data-testid="icon-online" />,
      title: 'Online',
      description: 'Terhubung ke internet',
      variant: 'default' as const,
      showSync: false,
    };
  };

  const config = getBannerConfig();

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 px-4 pt-4"
      data-testid="offline-banner"
    >
      <Alert 
        variant={config.variant}
        className="shadow-lg border-2 relative"
      >
        <div className="flex items-center gap-3">
          {config.icon}
          <div className="flex-1">
            <h4 className="font-semibold text-sm" data-testid="banner-title">
              {config.title}
            </h4>
            <AlertDescription className="text-xs mt-1" data-testid="banner-description">
              {config.description}
            </AlertDescription>
          </div>
          
          {config.showSync && (
            <Button
              size="sm"
              variant="outline"
              onClick={forceSyncNow}
              disabled={isSyncing}
              data-testid="button-retry-sync"
            >
              <RefreshCw className={cn(
                "h-3 w-3 mr-1",
                isSyncing && "animate-spin"
              )} />
              Coba Lagi
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            data-testid="button-dismiss-banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {queueStats.failed > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground" data-testid="text-failed-count">
              {queueStats.failed} item gagal disinkronkan
            </p>
          </div>
        )}
      </Alert>
    </div>
  );
}

export function SyncStatusBadge() {
  const { isOnline, isSyncing, queueStats } = useOffline();

  const getPendingCount = () => {
    return queueStats.pending + queueStats.processing;
  };

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: <CloudOff className="h-3 w-3" />,
        label: 'Offline',
        variant: 'secondary' as const,
        count: getPendingCount(),
      };
    }

    if (isSyncing || getPendingCount() > 0) {
      return {
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        label: 'Syncing',
        variant: 'default' as const,
        count: getPendingCount(),
      };
    }

    if (queueStats.failed > 0) {
      return {
        icon: <AlertCircle className="h-3 w-3" />,
        label: 'Error',
        variant: 'destructive' as const,
        count: queueStats.failed,
      };
    }

    return null;
  };

  const config = getStatusConfig();

  if (!config) {
    return null;
  }

  return (
    <Badge 
      variant={config.variant} 
      className="gap-1.5 px-2 py-1"
      data-testid="badge-sync-status"
    >
      {config.icon}
      <span className="text-xs" data-testid="text-sync-label">
        {config.label}
      </span>
      {config.count > 0 && (
        <span 
          className="ml-1 bg-background/20 rounded-full px-1.5 text-xs font-semibold"
          data-testid="text-queue-count"
        >
          {config.count}
        </span>
      )}
    </Badge>
  );
}

export function SyncToastNotifications() {
  const { isOnline, queueStats, syncError, lastSyncTime } = useOffline();
  const { toast } = useToast();
  const [prevOnline, setPrevOnline] = useState(isOnline);
  const [prevQueueCount, setPrevQueueCount] = useState(queueStats.pending);

  // Listen for conflict events
  useEffect(() => {
    const handleConflict = (event: CustomEvent) => {
      const { item, resolution, message } = event.detail;
      toast({
        title: '⚠️ Konflik Data',
        description: message,
        variant: 'default',
        duration: 5000,
      });
    };

    window.addEventListener('offline:conflict' as any, handleConflict);
    
    return () => {
      window.removeEventListener('offline:conflict' as any, handleConflict);
    };
  }, [toast]);

  // Toast when going offline
  useEffect(() => {
    if (prevOnline && !isOnline) {
      toast({
        title: '📡 Mode Offline',
        description: 'Anda sedang offline. Perubahan akan disinkronkan saat online kembali.',
        variant: 'default',
        duration: 5000,
      });
    }
    setPrevOnline(isOnline);
  }, [isOnline, prevOnline, toast]);

  // Toast when coming online
  useEffect(() => {
    if (!prevOnline && isOnline) {
      toast({
        title: '✅ Kembali Online',
        description: 'Terhubung kembali. Menyinkronkan perubahan...',
        variant: 'default',
        duration: 3000,
      });
    }
  }, [isOnline, prevOnline, toast]);

  // Toast when sync completes
  useEffect(() => {
    if (
      isOnline &&
      prevQueueCount > 0 &&
      queueStats.pending === 0 &&
      queueStats.failed === 0
    ) {
      toast({
        title: '🎉 Sinkronisasi Selesai',
        description: 'Semua perubahan telah disinkronkan',
        variant: 'default',
        duration: 3000,
      });
    }
    setPrevQueueCount(queueStats.pending);
  }, [queueStats.pending, queueStats.failed, prevQueueCount, isOnline, toast]);

  // Toast for sync errors
  useEffect(() => {
    if (syncError && queueStats.failed > 0) {
      toast({
        title: '⚠️ Error Sinkronisasi',
        description: syncError,
        variant: 'destructive',
        duration: 5000,
      });
    }
  }, [syncError, queueStats.failed, toast]);

  return null; // This component only shows toasts
}

// Bandwidth Quality Badge
export function BandwidthBadge() {
  const { connectionQuality, networkStatus } = useOffline();

  const getBandwidthConfig = () => {
    switch (connectionQuality) {
      case '4g':
        return {
          icon: <SignalHigh className="h-3 w-3" />,
          label: '4G',
          variant: 'default' as const,
          color: 'text-green-500',
        };
      case '3g':
        return {
          icon: <SignalMedium className="h-3 w-3" />,
          label: '3G',
          variant: 'secondary' as const,
          color: 'text-yellow-500',
        };
      case '2g':
      case 'slow-2g':
        return {
          icon: <SignalLow className="h-3 w-3" />,
          label: connectionQuality === 'slow-2g' ? 'Slow' : '2G',
          variant: 'outline' as const,
          color: 'text-orange-500',
        };
      case 'offline':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          label: 'Offline',
          variant: 'destructive' as const,
          color: 'text-red-500',
        };
      default:
        return null;
    }
  };

  const config = getBandwidthConfig();
  if (!config) return null;

  return (
    <Badge
      variant={config.variant}
      className="gap-1.5 px-2 py-1"
      data-testid="badge-bandwidth-quality"
    >
      <span className={config.color}>{config.icon}</span>
      <span className="text-xs" data-testid="text-bandwidth-label">
        {config.label}
      </span>
    </Badge>
  );
}

// Enhanced Sync Status with Progress
export function EnhancedSyncStatus() {
  const { stats, isSyncing } = useOffline();
  const [showQueueManager, setShowQueueManager] = useState(false);
  const [showConflictResolver, setShowConflictResolver] = useState(false);

  const progress = stats.progressPercentage || 0;
  const hasPending = stats.pending > 0 || stats.processing > 0;
  const hasFailed = stats.failed > 0;

  if (!hasPending && !hasFailed && !isSyncing) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 md:right-4 md:left-auto z-40" data-testid="enhanced-sync-status">
        <Alert className="shadow-lg max-w-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-semibold text-sm" data-testid="text-sync-status">
                  Sinkronisasi
                </span>
              </div>
              <Button
                onClick={() => setShowQueueManager(true)}
                variant="ghost"
                size="sm"
                data-testid="button-open-queue-manager"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {progress > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span data-testid="text-progress-details">
                    {stats.completed + stats.failed} / {stats.total}
                  </span>
                  <span data-testid="text-progress-percentage">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1" data-testid="progress-sync" />
              </div>
            )}

            <div className="flex gap-2 text-xs">
              {stats.pending > 0 && (
                <Badge variant="secondary" data-testid="badge-pending-count">
                  {stats.pending} menunggu
                </Badge>
              )}
              {stats.failed > 0 && (
                <Badge variant="destructive" data-testid="badge-failed-count">
                  {stats.failed} gagal
                </Badge>
              )}
            </div>
          </div>
        </Alert>
      </div>

      <Dialog open={showQueueManager} onOpenChange={setShowQueueManager}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <QueueManager />
        </DialogContent>
      </Dialog>

      <ConflictResolver 
        open={showConflictResolver} 
        onClose={() => setShowConflictResolver(false)} 
      />
    </>
  );
}

export function OfflineIndicators() {
  return (
    <>
      <OfflineBanner />
      <EnhancedSyncStatus />
      <SyncToastNotifications />
    </>
  );
}

export default OfflineIndicators;
