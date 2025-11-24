import { useState, useEffect } from 'react';
import { logError } from '@/lib/logger';
import { useOffline } from '@/contexts/OfflineContext';
import { syncQueue } from '@/lib/sync-queue';
import type { SyncQueueItem } from '@/lib/sync-queue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, Clock, Loader2, XCircle, RefreshCw, Trash2, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QueueStats {
  total: number;
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  byType: Record<string, number>;
  byPriority: Record<number, number>;
}

export function QueueManager() {
  const { stats, isOnline } = useOffline();
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<'all' | number>('all');
  const [selectedType, setSelectedType] = useState<'all' | string>('all');

  useEffect(() => {
    loadQueueItems();
    
    const unsubscribe = syncQueue.subscribe(() => {
      loadQueueItems();
    });

    return unsubscribe;
  }, []);

  const loadQueueItems = async () => {
    try {
      const items = await syncQueue.getAllItems();
      setQueueItems(items);
    } catch (error) {
      logError('[QueueManager] Failed to load queue items', error as Error);
    }
  };

  const handleRetryAll = async () => {
    setIsProcessing(true);
    try {
      await syncQueue.retryFailed();
      await loadQueueItems();
    } catch (error) {
      logError('[QueueManager] Retry all failed', error as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetryItem = async (itemId: string) => {
    setIsProcessing(true);
    try {
      const item = queueItems.find(i => i.id === itemId);
      if (item) {
        item.status = 'pending';
        item.retryCount = 0;
        await syncQueue['saveItem'](item);
        await syncQueue.processQueue();
        await loadQueueItems();
      }
    } catch (error) {
      logError('[QueueManager] Retry item failed', error as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearFailed = async () => {
    setIsProcessing(true);
    try {
      await syncQueue.clearFailed();
      await loadQueueItems();
    } catch (error) {
      logError('[QueueManager] Clear failed', error as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrioritizeItem = async (itemId: string) => {
    setIsProcessing(true);
    try {
      const item = queueItems.find(i => i.id === itemId);
      if (item) {
        item.priority = 1; // Critical priority
        await syncQueue['saveItem'](item);
        await loadQueueItems();
      }
    } catch (error) {
      logError('[QueueManager] Prioritize failed', error as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setIsProcessing(true);
    try {
      await syncQueue['deleteItem'](itemId);
      await loadQueueItems();
    } catch (error) {
      logError('[QueueManager] Delete item failed', error as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateETA = (item: SyncQueueItem): string => {
    const now = Date.now();
    const created = new Date(item.timestamp).getTime();
    const age = now - created;
    
    if (item.status === 'synced') return 'Selesai';
    if (item.status === 'failed') return 'Gagal';
    if (item.status === 'syncing') return 'Sinkronisasi...';
    
    const estimatedTime = item.priority * 10000; // 10s per priority level
    const eta = Math.max(0, estimatedTime - age);
    
    if (eta < 1000) return '< 1 detik';
    if (eta < 60000) return `${Math.ceil(eta / 1000)} detik`;
    if (eta < 3600000) return `${Math.ceil(eta / 60000)} menit`;
    return `${Math.ceil(eta / 3600000)} jam`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle2 className="h-4 w-4 text-green-500" data-testid="icon-status-synced" />;
      case 'syncing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" data-testid="icon-status-syncing" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" data-testid="icon-status-failed" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-yellow-500" data-testid="icon-status-pending" />;
    }
  };

  const getPriorityLabel = (priority: number) => {
    if (priority === 1) return 'Kritis';
    if (priority <= 5) return 'Standar';
    return 'Bulk';
  };

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'destructive';
    if (priority <= 5) return 'default';
    return 'secondary';
  };

  const filteredItems = queueItems.filter(item => {
    if (selectedPriority !== 'all' && item.priority !== selectedPriority) return false;
    if (selectedType !== 'all' && item.type !== selectedType) return false;
    return true;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    const key = item.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, SyncQueueItem[]>);

  const totalProgress = stats.total > 0 ? (stats.synced / stats.total) * 100 : 0;

  return (
    <div className="space-y-4" data-testid="queue-manager">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-queue-title">Antrean Sinkronisasi</h2>
          <p className="text-sm text-muted-foreground" data-testid="text-queue-subtitle">
            Kelola item yang menunggu untuk disinkronkan
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRetryAll}
            disabled={isProcessing || stats.failed === 0}
            variant="outline"
            size="sm"
            data-testid="button-retry-all"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Coba Ulang Semua
          </Button>
          <Button
            onClick={handleClearFailed}
            disabled={isProcessing || stats.failed === 0}
            variant="outline"
            size="sm"
            data-testid="button-clear-failed"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Hapus Gagal
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle data-testid="text-stats-title">Statistik Antrean</CardTitle>
          <CardDescription data-testid="text-stats-description">
            Ringkasan item dalam antrean sinkronisasi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center" data-testid="stat-total">
              <div className="text-2xl font-bold" data-testid="text-stat-total-value">{stats.total}</div>
              <div className="text-xs text-muted-foreground" data-testid="text-stat-total-label">Total</div>
            </div>
            <div className="text-center" data-testid="stat-pending">
              <div className="text-2xl font-bold text-yellow-500" data-testid="text-stat-pending-value">{stats.pending}</div>
              <div className="text-xs text-muted-foreground" data-testid="text-stat-pending-label">Menunggu</div>
            </div>
            <div className="text-center" data-testid="stat-syncing">
              <div className="text-2xl font-bold text-blue-500" data-testid="text-stat-syncing-value">{stats.syncing}</div>
              <div className="text-xs text-muted-foreground" data-testid="text-stat-syncing-label">Sinkronisasi</div>
            </div>
            <div className="text-center" data-testid="stat-synced">
              <div className="text-2xl font-bold text-green-500" data-testid="text-stat-synced-value">{stats.synced}</div>
              <div className="text-xs text-muted-foreground" data-testid="text-stat-synced-label">Selesai</div>
            </div>
            <div className="text-center" data-testid="stat-failed">
              <div className="text-2xl font-bold text-red-500" data-testid="text-stat-failed-value">{stats.failed}</div>
              <div className="text-xs text-muted-foreground" data-testid="text-stat-failed-label">Gagal</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span data-testid="text-progress-label">Progres</span>
              <span data-testid="text-progress-value">{Math.round(totalProgress)}%</span>
            </div>
            <Progress value={totalProgress} data-testid="progress-total" />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
          data-testid="select-filter-type"
        >
          <option value="all">Semua Tipe</option>
          {Object.keys(stats.byType || {}).map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
          data-testid="select-filter-priority"
        >
          <option value="all">Semua Prioritas</option>
          <option value="1">Kritis</option>
          <option value="5">Standar</option>
          <option value="10">Bulk</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle data-testid="text-items-title">Item Antrean ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {Object.keys(groupedItems).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-empty-queue">
                Tidak ada item dalam antrean
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedItems).map(([type, items]) => (
                  <div key={type} className="space-y-2" data-testid={`group-${type}`}>
                    <h3 className="font-semibold text-sm uppercase text-muted-foreground" data-testid={`text-group-title-${type}`}>
                      {type} ({items.length})
                    </h3>
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border",
                          item.status === 'failed' && "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
                        )}
                        data-testid={`queue-item-${item.id}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {getStatusIcon(item.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate" data-testid={`text-item-type-${item.id}`}>
                                {item.type}
                              </p>
                              <Badge
                                variant={getPriorityColor(item.priority) as any}
                                className="text-xs"
                                data-testid={`badge-priority-${item.id}`}
                              >
                                {getPriorityLabel(item.priority)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground" data-testid={`text-item-eta-${item.id}`}>
                              ETA: {calculateETA(item)}
                            </p>
                            {item.error && (
                              <p className="text-xs text-red-500 mt-1" data-testid={`text-item-error-${item.id}`}>
                                <AlertCircle className="h-3 w-3 inline mr-1" />
                                {item.error}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {item.status === 'failed' && (
                            <Button
                              onClick={() => handleRetryItem(item.id)}
                              disabled={isProcessing}
                              variant="ghost"
                              size="sm"
                              data-testid={`button-retry-${item.id}`}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          {item.priority !== 1 && item.status === 'pending' && (
                            <Button
                              onClick={() => handlePrioritizeItem(item.id)}
                              disabled={isProcessing}
                              variant="ghost"
                              size="sm"
                              data-testid={`button-prioritize-${item.id}`}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={isProcessing}
                            variant="ghost"
                            size="sm"
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {!isOnline && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950" data-testid="card-offline-warning">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-600 dark:text-yellow-500" data-testid="text-offline-warning">
                Anda sedang offline. Sinkronisasi akan dilanjutkan saat koneksi kembali.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
