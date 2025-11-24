import { useEffect, useState } from 'react';
import { syncQueue, QueueStats } from '@/lib/sync-queue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  WifiOff, 
  Wifi, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function OfflineSyncStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    pending: 0,
    processing: 0,
    failed: 0,
    completed: 0,
    total: 0,
    synced: 0,
    syncing: 0,
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Subscribe to online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to queue updates
    const unsubscribe = syncQueue.subscribe((stats) => {
      setQueueStats(stats);
    });

    // Get initial stats
    syncQueue.getStats().then(setQueueStats);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const handleRetryFailed = async () => {
    setIsRetrying(true);
    try {
      await syncQueue.retryFailed();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleClearFailed = async () => {
    await syncQueue.clearFailed();
  };

  const handleManualSync = async () => {
    if (isOnline) {
      await syncQueue.processQueue();
    }
  };

  // Don't show if nothing to display
  if (isOnline && queueStats.total === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 md:right-4 md:left-auto z-50 max-w-sm" data-testid="offline-sync-status">
      <Card className="bg-nxe-surface border-nxe-accent shadow-lg">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="p-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-5 w-5 text-green-500" data-testid="icon-online" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" data-testid="icon-offline" />
                )}
                <span className="text-sm font-medium text-white">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {queueStats.total > 0 && (
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    data-testid="button-toggle-sync-details"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>

            {/* Status Badges */}
            {queueStats.total > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {queueStats.pending > 0 && (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500" data-testid="badge-pending">
                    <Clock className="h-3 w-3 mr-1" />
                    {queueStats.pending} pending
                  </Badge>
                )}
                {queueStats.processing > 0 && (
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-500" data-testid="badge-processing">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    {queueStats.processing} syncing
                  </Badge>
                )}
                {queueStats.failed > 0 && (
                  <Badge variant="secondary" className="bg-red-500/20 text-red-500" data-testid="badge-failed">
                    <XCircle className="h-3 w-3 mr-1" />
                    {queueStats.failed} failed
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Expanded Content */}
          <CollapsibleContent>
            <div className="border-t border-nxe-accent p-3 space-y-3">
              {/* Offline Message */}
              {!isOnline && (
                <div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-500">
                    <p className="font-medium">Anda sedang offline</p>
                    <p className="text-xs mt-1">
                      Perubahan akan disinkronkan saat koneksi kembali
                    </p>
                  </div>
                </div>
              )}

              {/* Failed Items */}
              {queueStats.failed > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-red-400">
                    {queueStats.failed} item gagal disinkronkan
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={handleRetryFailed}
                      disabled={isRetrying || !isOnline}
                      data-testid="button-retry-failed"
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
                      Coba Lagi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearFailed}
                      data-testid="button-clear-failed"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Hapus
                    </Button>
                  </div>
                </div>
              )}

              {/* Manual Sync */}
              {isOnline && queueStats.pending > 0 && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleManualSync}
                  data-testid="button-manual-sync"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sinkronkan Sekarang
                </Button>
              )}

              {/* Success Message */}
              {isOnline && queueStats.total === 0 && (
                <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-md">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <p className="text-sm text-green-500">Semua data tersinkronkan</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
