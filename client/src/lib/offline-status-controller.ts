// Enhanced Offline Status Controller
// Network quality detection, bandwidth estimation, connection monitoring, and conflict resolution

import { syncQueue, SyncQueueItem } from './sync-queue';
import { offlineDB } from './offline-db';
import { logger } from './logger';

export type ConnectionQuality = 'offline' | 'slow-2g' | '2g' | '3g' | '4g';
export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'wimax' | 'other' | 'unknown';

export interface NetworkStatus {
  isOnline: boolean;
  quality: ConnectionQuality;
  type: ConnectionType;
  effectiveType?: string;
  downlink?: number; // Mbps
  rtt?: number; // ms (round-trip time)
  saveData?: boolean;
  timestamp: string;
}

export interface BandwidthEstimate {
  downlink: number; // Mbps
  rtt: number; // ms
  quality: ConnectionQuality;
  timestamp: string;
}

export interface ConflictResolutionStrategy {
  strategy: 'server-wins' | 'client-wins' | 'manual';
  notifyUser: boolean;
}

type NetworkStatusListener = (status: NetworkStatus) => void;

class OfflineStatusController {
  private listeners: Set<NetworkStatusListener> = new Set();
  private currentStatus: NetworkStatus;
  private estimationHistory: BandwidthEstimate[] = [];
  private maxHistorySize = 10;
  private updateInterval: NodeJS.Timeout | null = null;
  
  // Conflict resolution properties
  private conflictStrategy: ConflictResolutionStrategy = {
    strategy: 'server-wins',
    notifyUser: true,
  };
  private conflictHandlers: Map<string, (item: SyncQueueItem, serverData: any) => Promise<any>> = new Map();

  constructor() {
    this.currentStatus = this.getCurrentNetworkStatus();
    this.setupListeners();
  }

  // Initialize the controller
  init() {
    logger.info('Initializing', { component: 'OfflineStatusController', operation: 'init' });
    
    // Set up conflict resolution in sync queue
    syncQueue['config'].onConflict = this.handleConflict.bind(this);
    
    // Set up success handler
    syncQueue['config'].onSuccess = this.handleSyncSuccess.bind(this);
    
    // Set up error handler
    syncQueue['config'].onError = this.handleSyncError.bind(this);
    
    logger.info('Initialized with strategy', { component: 'OfflineStatusController', operation: 'init', strategy: this.conflictStrategy.strategy });
  }

  // Get current network status
  private getCurrentNetworkStatus(): NetworkStatus {
    const isOnline = navigator.onLine;
    const quality = this.detectQuality();
    const type = this.detectConnectionType();
    
    // @ts-ignore - Network Information API
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    return {
      isOnline,
      quality,
      type,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
      timestamp: new Date().toISOString(),
    };
  }

  // Detect connection quality
  private detectQuality(): ConnectionQuality {
    if (!navigator.onLine) {
      return 'offline';
    }

    // @ts-ignore - Network Information API
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (!connection) {
      return '4g'; // Assume good connection if API not available
    }

    const effectiveType = connection.effectiveType;
    
    if (effectiveType === 'slow-2g') return 'slow-2g';
    if (effectiveType === '2g') return '2g';
    if (effectiveType === '3g') return '3g';
    if (effectiveType === '4g') return '4g';

    // Fallback based on downlink speed
    const downlink = connection.downlink;
    if (downlink < 0.05) return 'slow-2g';
    if (downlink < 0.25) return '2g';
    if (downlink < 2) return '3g';
    return '4g';
  }

  // Detect connection type
  private detectConnectionType(): ConnectionType {
    // @ts-ignore - Network Information API
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (!connection || !connection.type) {
      return 'unknown';
    }

    switch (connection.type) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
        return 'cellular';
      case 'ethernet':
        return 'ethernet';
      case 'bluetooth':
        return 'bluetooth';
      case 'wimax':
        return 'wimax';
      case 'other':
        return 'other';
      default:
        return 'unknown';
    }
  }

  // Estimate bandwidth using performance timing
  async estimateBandwidth(): Promise<BandwidthEstimate> {
    // @ts-ignore - Network Information API
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection && connection.downlink && connection.rtt) {
      const estimate: BandwidthEstimate = {
        downlink: connection.downlink,
        rtt: connection.rtt,
        quality: this.detectQuality(),
        timestamp: new Date().toISOString(),
      };
      
      this.addToHistory(estimate);
      return estimate;
    }

    // Fallback: Measure with a small fetch request
    try {
      const startTime = performance.now();
      await fetch('/manifest.json', { 
        method: 'HEAD',
        cache: 'no-store',
      });
      const endTime = performance.now();
      const rtt = endTime - startTime;
      
      // Rough estimation based on RTT
      let downlink = 10;
      if (rtt > 1000) downlink = 0.1;
      else if (rtt > 500) downlink = 0.5;
      else if (rtt > 200) downlink = 2;
      else if (rtt > 100) downlink = 5;
      else downlink = 10;
      
      const estimate: BandwidthEstimate = {
        downlink,
        rtt,
        quality: this.detectQuality(),
        timestamp: new Date().toISOString(),
      };
      
      this.addToHistory(estimate);
      return estimate;
    } catch (error) {
      const estimate: BandwidthEstimate = {
        downlink: 1,
        rtt: 500,
        quality: '2g',
        timestamp: new Date().toISOString(),
      };
      
      this.addToHistory(estimate);
      return estimate;
    }
  }

  // Add estimate to history
  private addToHistory(estimate: BandwidthEstimate): void {
    this.estimationHistory.push(estimate);
    
    if (this.estimationHistory.length > this.maxHistorySize) {
      this.estimationHistory.shift();
    }
  }

  // Get average bandwidth from history
  getAverageBandwidth(): BandwidthEstimate | null {
    if (this.estimationHistory.length === 0) {
      return null;
    }

    const avgDownlink = this.estimationHistory.reduce((sum, e) => sum + e.downlink, 0) / this.estimationHistory.length;
    const avgRtt = this.estimationHistory.reduce((sum, e) => sum + e.rtt, 0) / this.estimationHistory.length;
    
    let quality: ConnectionQuality = '4g';
    if (avgDownlink < 0.05) quality = 'slow-2g';
    else if (avgDownlink < 0.25) quality = '2g';
    else if (avgDownlink < 2) quality = '3g';
    
    return {
      downlink: avgDownlink,
      rtt: avgRtt,
      quality,
      timestamp: new Date().toISOString(),
    };
  }

  // Setup event listeners
  private setupListeners(): void {
    window.addEventListener('online', () => this.handleStatusChange());
    window.addEventListener('offline', () => this.handleStatusChange());

    // @ts-ignore - Network Information API
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', () => this.handleStatusChange());
    }

    this.startPeriodicUpdates();
  }

  // Handle status change
  private handleStatusChange(): void {
    const previousStatus = this.currentStatus;
    this.currentStatus = this.getCurrentNetworkStatus();
    
    // Only log and notify if there's an actual change
    const hasChanged = 
      previousStatus.quality !== this.currentStatus.quality ||
      previousStatus.isOnline !== this.currentStatus.isOnline ||
      previousStatus.type !== this.currentStatus.type;
    
    if (hasChanged) {
      logger.info('Status changed', {
        component: 'OfflineStatusController',
        operation: 'handleStatusChange',
        from: previousStatus.quality,
        to: this.currentStatus.quality,
        isOnline: this.currentStatus.isOnline,
      });
      
      this.notifyListeners();
      
      if (this.currentStatus.isOnline) {
        this.estimateBandwidth();
      }
    }
  }

  // Start periodic status updates
  private startPeriodicUpdates(intervalMs: number = 30000): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.handleStatusChange();
    }, intervalMs);
  }

  // Stop periodic updates
  stopPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Get current status
  getStatus(): NetworkStatus {
    return this.currentStatus;
  }

  // Subscribe to status changes
  subscribe(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentStatus);
      } catch (error) {
        logger.error('Error in listener', error, { component: 'OfflineStatusController', operation: 'notifyListeners' });
      }
    });
  }

  // Check if connection is good enough for operation
  isConnectionGoodFor(operation: 'critical' | 'standard' | 'bulk'): boolean {
    const quality = this.currentStatus.quality;
    
    if (!this.currentStatus.isOnline) {
      return false;
    }

    switch (operation) {
      case 'critical':
        return quality !== 'offline' && quality !== 'slow-2g';
      case 'standard':
        return quality === '3g' || quality === '4g';
      case 'bulk':
        return quality === '4g';
      default:
        return false;
    }
  }

  // Get recommended batch size based on connection quality
  getRecommendedBatchSize(): number {
    const quality = this.currentStatus.quality;
    
    switch (quality) {
      case 'offline':
      case 'slow-2g':
        return 1;
      case '2g':
        return 3;
      case '3g':
        return 10;
      case '4g':
        return 25;
      default:
        return 10;
    }
  }

  // Get recommended retry delay based on connection quality
  getRecommendedRetryDelay(baseDelay: number = 1000): number {
    const quality = this.currentStatus.quality;
    
    const multipliers: Record<ConnectionQuality, number> = {
      'offline': 10,
      'slow-2g': 5,
      '2g': 3,
      '3g': 1.5,
      '4g': 1,
    };
    
    return baseDelay * multipliers[quality];
  }

  // Conflict resolution methods
  setConflictStrategy(strategy: ConflictResolutionStrategy) {
    this.conflictStrategy = strategy;
    logger.info('Conflict strategy updated', { component: 'OfflineStatusController', operation: 'setConflictStrategy', strategy });
  }

  registerConflictHandler(
    type: string,
    handler: (item: SyncQueueItem, serverData: any) => Promise<any>
  ) {
    this.conflictHandlers.set(type, handler);
  }

  private async handleConflict(item: SyncQueueItem, serverData: any): Promise<any> {
    const customHandler = this.conflictHandlers.get(item.type);
    if (customHandler) {
      return customHandler(item, serverData);
    }

    switch (this.conflictStrategy.strategy) {
      case 'server-wins':
        if (this.conflictStrategy.notifyUser) {
          this.notifyConflict(item, 'server-wins');
        }
        return null;

      case 'client-wins':
        if (this.conflictStrategy.notifyUser) {
          this.notifyConflict(item, 'client-wins');
        }
        return item.data;

      case 'manual':
        if (this.conflictStrategy.notifyUser) {
          this.notifyConflict(item, 'manual');
        }
        return null;

      default:
        return null;
    }
  }

  private handleSyncSuccess(item: SyncQueueItem, response: any) {
    window.dispatchEvent(new CustomEvent('offline:sync-success', {
      detail: { item, response }
    }));
    
    this.updateLastSynced(item, response);
  }

  private handleSyncError(item: SyncQueueItem, error: Error) {
    window.dispatchEvent(new CustomEvent('offline:sync-error', {
      detail: { item, error }
    }));
  }

  private notifyConflict(item: SyncQueueItem, resolution: string) {
    const messages = {
      'server-wins': 'Konflik terdeteksi. Perubahan server digunakan.',
      'client-wins': 'Konflik terdeteksi. Perubahan lokal dipertahankan.',
      'manual': 'Konflik terdeteksi. Resolusi manual diperlukan.',
    };

    window.dispatchEvent(new CustomEvent('offline:conflict', {
      detail: {
        item,
        resolution,
        message: messages[resolution as keyof typeof messages] || 'Konflik terdeteksi',
      }
    }));
  }

  private async updateLastSynced(item: SyncQueueItem, response: any) {
    const now = new Date().toISOString();
    
    try {
      switch (item.type) {
        case 'message':
          if (response?.id) {
            const message = await offlineDB.get('messages', response.id);
            if (message) {
              await offlineDB.put('messages', {
                ...message,
                lastSynced: now,
                syncStatus: 'synced' as const,
              });
            }
          }
          break;

        case 'product':
          if (response?.id) {
            const product = await offlineDB.get('products', response.id);
            if (product) {
              await offlineDB.put('products', {
                ...product,
                lastSynced: now,
                syncStatus: 'synced' as const,
              });
            }
          }
          break;

        case 'transaction':
          if (response?.id) {
            const transaction = await offlineDB.get('transactions', response.id);
            if (transaction) {
              await offlineDB.put('transactions', {
                ...transaction,
                lastSynced: now,
                syncStatus: 'synced' as const,
              });
            }
          }
          break;

        case 'wallet':
          if (item.data?.userId) {
            const wallet = await offlineDB.get('wallet', item.data.userId);
            if (wallet) {
              await offlineDB.put('wallet', {
                ...wallet,
                lastSynced: now,
                syncStatus: 'synced' as const,
              });
            }
          }
          break;
      }
    } catch (error) {
      logger.error('Failed to update lastSynced', error, { component: 'OfflineStatusController', operation: 'handleSyncSuccess' });
    }
  }

  // Sync queue methods
  async getStats() {
    return syncQueue.getStats();
  }

  async forceSyncNow() {
    await syncQueue.processQueue();
  }

  async retryFailed() {
    await syncQueue.retryFailed();
  }

  async clearFailed() {
    await syncQueue.clearFailed();
  }

  subscribeToQueue(listener: (stats: any) => void) {
    return syncQueue.subscribe(listener);
  }

  // Cleanup
  destroy(): void {
    this.stopPeriodicUpdates();
    this.listeners.clear();
    this.estimationHistory = [];
  }
}

// Singleton instance
export const offlineStatusController = new OfflineStatusController();

// Initialize on module load
if (typeof window !== 'undefined') {
  offlineStatusController.init();
}

export default offlineStatusController;
