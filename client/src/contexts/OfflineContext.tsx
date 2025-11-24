// Offline Context for managing offline state and sync status
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { syncQueue, QueueStats } from '@/lib/sync-queue';
import { offlineStatusController, ConnectionQuality, NetworkStatus } from '@/lib/offline-status-controller';
import { conflictResolution } from '@/lib/conflict-resolution';
import { logger } from '@/lib/logger';

interface EnhancedQueueStats extends QueueStats {
  byType: Record<string, number>;
  byPriority: Record<number, number>;
  progressPercentage: number;
}

interface OfflineContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  stats: EnhancedQueueStats;
  queueStats: QueueStats; // Deprecated, use stats
  lastSyncTime: Date | null;
  lastCleanupTime: Date | null;
  syncError: string | null;
  connectionQuality: ConnectionQuality;
  networkStatus: NetworkStatus | null;
  bandwidthTier: string;
  pendingConflicts: number;
  forceSyncNow: () => Promise<void>;
  retryFailedSync: () => Promise<void>;
  clearFailedItems: () => Promise<void>;
  performCleanup: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    pending: 0,
    processing: 0,
    failed: 0,
    completed: 0,
    total: 0,
    synced: 0,
    syncing: 0,
  });
  const [enhancedStats, setEnhancedStats] = useState<EnhancedQueueStats>({
    pending: 0,
    processing: 0,
    failed: 0,
    completed: 0,
    total: 0,
    synced: 0,
    syncing: 0,
    byType: {},
    byPriority: {},
    progressPercentage: 0,
  });
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastCleanupTime, setLastCleanupTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('4g');
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [bandwidthTier, setBandwidthTier] = useState<string>('high');
  const [pendingConflicts, setPendingConflicts] = useState(0);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      logger.info('Network online', { component: 'OfflineContext', operation: 'handleOnline' });
      setIsOnline(true);
      setSyncError(null);
      
      // Trigger sync when coming online
      syncQueue.processQueue();
    };

    const handleOffline = () => {
      logger.info('Network offline', { component: 'OfflineContext', operation: 'handleOffline' });
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = syncQueue.subscribe(async (stats) => {
      setQueueStats(stats);
      
      // Build enhanced stats with type and priority breakdown
      const items = await syncQueue.getAllItems();
      const byType: Record<string, number> = {};
      const byPriority: Record<number, number> = {};
      
      items.forEach(item => {
        byType[item.type] = (byType[item.type] || 0) + 1;
        byPriority[item.priority] = (byPriority[item.priority] || 0) + 1;
      });
      
      const progressPercentage = stats.total > 0 
        ? ((stats.completed + stats.failed) / stats.total) * 100 
        : 0;
      
      setEnhancedStats({
        ...stats,
        byType,
        byPriority,
        progressPercentage,
      });
      
      // Update syncing status
      const syncing = stats.processing > 0 || stats.pending > 0;
      setIsSyncing(syncing);
      
      // Update last sync time when queue is empty
      if (stats.total === 0 || (stats.pending === 0 && stats.processing === 0)) {
        setLastSyncTime(new Date());
        setSyncError(null);
      }
      
      // Update sync error if there are failed items
      if (stats.failed > 0) {
        setSyncError(`${stats.failed} item(s) failed to sync`);
      }
    });

    // Load initial stats
    syncQueue.getStats().then(setQueueStats);

    return unsubscribe;
  }, []);

  // Subscribe to network status changes
  useEffect(() => {
    const unsubscribe = offlineStatusController.subscribe((status) => {
      setNetworkStatus(status);
      setConnectionQuality(status.quality);
      
      // Set bandwidth tier based on quality
      const tier = status.quality === '4g' ? 'high' :
                   status.quality === '3g' ? 'medium' :
                   status.quality === '2g' ? 'low' : 'very-low';
      setBandwidthTier(tier);
    });

    return unsubscribe;
  }, []);

  // Subscribe to conflict updates
  useEffect(() => {
    const updateConflicts = () => {
      const conflicts = conflictResolution.getPendingConflicts();
      setPendingConflicts(conflicts.length);
    };

    updateConflicts();
    
    // Poll for conflict updates every 5 seconds
    const interval = setInterval(updateConflicts, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Listen to service worker messages
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        const { type } = event.data;

        if (type === 'SYNC_SUCCESS') {
          logger.info('Sync success', { component: 'OfflineContext', operation: 'serviceWorkerMessage' });
          setLastSyncTime(new Date());
          setSyncError(null);
        } else if (type === 'SYNC_QUEUED') {
          logger.info('Request queued', { component: 'OfflineContext', operation: 'serviceWorkerMessage' });
        } else if (type === 'SYNC_COMPLETE') {
          logger.info('Sync complete', { component: 'OfflineContext', operation: 'serviceWorkerMessage', remaining: event.data.remaining });
          setIsSyncing(false);
          setLastSyncTime(new Date());
          
          if (event.data.remaining > 0) {
            setSyncError(`${event.data.remaining} item(s) remain in queue`);
          } else {
            setSyncError(null);
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  // Force sync now
  const forceSyncNow = async () => {
    logger.info('Forcing sync now', { component: 'OfflineContext', operation: 'forceSyncNow' });
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      await syncQueue.processQueue();
      
      // Also notify service worker to process its queue
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SYNC_NOW' });
      }
      
      setLastSyncTime(new Date());
    } catch (error: any) {
      logger.error('Sync error', error, { component: 'OfflineContext', operation: 'forceSyncNow' });
      setSyncError(error.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  // Retry failed sync
  const retryFailedSync = async () => {
    logger.info('Retrying failed items', { component: 'OfflineContext', operation: 'retryFailedSync' });
    setSyncError(null);
    await syncQueue.retryFailed();
  };

  // Clear failed items
  const clearFailedItems = async () => {
    logger.info('Clearing failed items', { component: 'OfflineContext', operation: 'clearFailedItems' });
    setSyncError(null);
    await syncQueue.clearFailed();
  };

  // Perform cleanup
  const performCleanup = async () => {
    logger.info('Performing cleanup', { component: 'OfflineContext', operation: 'performCleanup' });
    try {
      const { offlineDB } = await import('@/lib/offline-db');
      await offlineDB.cleanupOldData(30);
      setLastCleanupTime(new Date());
    } catch (error) {
      logger.error('Cleanup failed', error, { component: 'OfflineContext', operation: 'performCleanup' });
    }
  };

  const value: OfflineContextValue = {
    isOnline,
    isSyncing,
    stats: enhancedStats,
    queueStats, // Keep for backward compatibility
    lastSyncTime,
    lastCleanupTime,
    syncError,
    connectionQuality,
    networkStatus,
    bandwidthTier,
    pendingConflicts,
    forceSyncNow,
    retryFailedSync,
    clearFailedItems,
    performCleanup,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

// Hook to use offline context
export function useOffline() {
  const context = useContext(OfflineContext);
  
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  
  return context;
}

// Hook for offline-aware queries
export function useOfflineAwareQuery<T>(
  queryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>,
  deps: any[] = []
) {
  const { isOnline } = useOffline();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let result: T;
        
        if (isOnline) {
          // Online: try network first
          try {
            result = await queryFn();
          } catch (networkError) {
            // Network failed, use fallback
            logger.warn('Network failed, using fallback', { component: 'useOfflineAwareQuery', operation: 'fetchData' });
            result = await fallbackFn();
          }
        } else {
          // Offline: use fallback
          result = await fallbackFn();
        }

        if (!cancelled) {
          setData(result);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [isOnline, ...deps]);

  return { data, isLoading, error };
}
