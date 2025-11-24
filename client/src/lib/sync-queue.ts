// Sync Queue Manager for Offline Mutations
// Version 3.0: Adaptive prioritization, partial-batch recovery, telemetry

import { offlineDB, generateQueueId, SyncQueueItem, STORES } from './offline-db';
import { apiRequest } from './queryClient';
import { logger } from './logger';

// Re-export SyncQueueItem for use in other modules
export type { SyncQueueItem };

export interface SyncQueueConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onSuccess?: (item: SyncQueueItem, response: any) => void;
  onError?: (item: SyncQueueItem, error: Error) => void;
  onConflict?: (item: SyncQueueItem, serverData: any) => Promise<any>;
  onProgress?: (progress: SyncProgress) => void;
  onMetrics?: (metrics: SyncMetrics) => void;
  onTelemetry?: (event: TelemetryEvent) => void;
  enableBatching?: boolean;
  batchSize?: number;
  batchDelayMs?: number;
  enableAdaptivePriority?: boolean;
}

export interface QueueStats {
  pending: number;
  processing: number;
  failed: number;
  completed: number;
  total: number;
  synced: number;
  syncing: number;
  byType?: Record<string, number>;
  byPriority?: Record<number, number>;
}

export interface SyncProgress {
  itemId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  total?: number;
  current?: number;
}

export interface SyncMetrics {
  totalSynced: number;
  totalFailed: number;
  avgSyncTime: number;
  successRate: number;
  connectionQuality?: string;
  timestamp: string;
}

export interface TelemetryEvent {
  type: 'sync_start' | 'sync_complete' | 'sync_error' | 'batch_start' | 'batch_complete' | 'conflict_detected' | 'priority_adjusted';
  itemId?: string;
  duration?: number;
  error?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface UserContext {
  currentPage?: string;
  lastActivity?: string;
  userRole?: string;
}

export const PRIORITY_LANES = {
  CRITICAL: 1,
  HIGH: 3,
  STANDARD: 5,
  LOW: 7,
  BULK: 10,
} as const;

// Data importance weights for adaptive prioritization
const DATA_IMPORTANCE_WEIGHTS: Record<string, number> = {
  transaction: 1, // Highest importance
  wallet: 1,
  message: 3,
  product: 5,
  generic: 7,
};

class SyncQueueManager {
  private config: Required<SyncQueueConfig>;
  private isProcessing: boolean = false;
  private processInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(stats: QueueStats) => void> = new Set();
  private isInitialized: boolean = false;
  private batchTimer: NodeJS.Timeout | null = null;
  private metrics: { synced: number[]; failed: number[]; syncTimes: number[] } = {
    synced: [],
    failed: [],
    syncTimes: []
  };
  private userContext: UserContext = {};

  constructor(config: SyncQueueConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries || 3,
      baseDelay: config.baseDelay || 1000,
      maxDelay: config.maxDelay || 30000,
      onSuccess: config.onSuccess || (() => {}),
      onError: config.onError || (() => {}),
      onConflict: config.onConflict || this.defaultConflictHandler.bind(this),
      onProgress: config.onProgress || (() => {}),
      onMetrics: config.onMetrics || (() => {}),
      onTelemetry: config.onTelemetry || (() => {}),
      enableBatching: config.enableBatching ?? true,
      batchSize: config.batchSize || 10,
      batchDelayMs: config.batchDelayMs || 2000,
      enableAdaptivePriority: config.enableAdaptivePriority ?? true,
    };
  }

  async init(): Promise<void> {
    if (this.isInitialized) {
      logger.info('Already initialized', { component: 'SyncQueue', operation: 'init' });
      return;
    }

    logger.info('Initializing', { component: 'SyncQueue', operation: 'init' });
    
    await offlineDB.init();
    
    this.isInitialized = true;
    logger.info('Initialized successfully', { component: 'SyncQueue', operation: 'init' });
  }

  startAutoProcessing(intervalMs: number = 30000): void {
    this.startProcessing(intervalMs);
  }

  // Update user context for adaptive prioritization
  setUserContext(context: UserContext): void {
    this.userContext = { ...this.userContext, ...context };
    logger.debug('User context updated', { component: 'SyncQueue', operation: 'setUserContext', context: this.userContext });
  }

  // Calculate adaptive priority based on data importance, user context, and network quality
  private calculateAdaptivePriority(
    type: SyncQueueItem['type'],
    basePriority?: number
  ): number {
    if (!this.config.enableAdaptivePriority) {
      return basePriority || PRIORITY_LANES.STANDARD;
    }

    // Start with data importance
    const importanceWeight = DATA_IMPORTANCE_WEIGHTS[type] || PRIORITY_LANES.STANDARD;
    
    // Adjust based on network quality
    const connectionQuality = this.getConnectionQuality();
    let networkMultiplier = 1;
    
    if (connectionQuality === 'slow-2g' || connectionQuality === '2g') {
      // Prioritize critical items even more on slow connections
      networkMultiplier = type === 'transaction' || type === 'wallet' ? 0.5 : 1.5;
    }
    
    // Adjust based on user context
    let contextMultiplier = 1;
    if (this.userContext.currentPage) {
      // If user is on a page related to this data type, increase priority
      if (
        (this.userContext.currentPage.includes('chat') && type === 'message') ||
        (this.userContext.currentPage.includes('wallet') && type === 'wallet') ||
        (this.userContext.currentPage.includes('transaction') && type === 'transaction')
      ) {
        contextMultiplier = 0.7; // Lower number = higher priority
      }
    }
    
    const adaptivePriority = Math.round(importanceWeight * networkMultiplier * contextMultiplier);
    
    // Clamp to valid range
    return Math.max(1, Math.min(10, adaptivePriority));
  }

  async enqueue(
    type: SyncQueueItem['type'],
    method: SyncQueueItem['method'],
    url: string,
    data: any,
    options: {
      tempId?: string;
      priority?: number;
      maxRetries?: number;
    } = {}
  ): Promise<string> {
    const queueId = generateQueueId();
    
    // Calculate adaptive priority if not explicitly set
    const priority = options.priority || this.calculateAdaptivePriority(type, options.priority);
    
    const item: SyncQueueItem = {
      id: queueId,
      type,
      method,
      url,
      data,
      tempId: options.tempId,
      retryCount: 0,
      maxRetries: options.maxRetries || this.config.maxRetries,
      createdAt: new Date().toISOString(),
      status: 'pending',
      priority,
      connectionQuality: this.getConnectionQuality(),
    };

    // Check for duplicates
    if (item.tempId) {
      const duplicate = await this.findDuplicateByTempId(item.tempId);
      if (duplicate) {
        logger.info('Duplicate detected, skipping', { component: 'SyncQueue', operation: 'enqueue', tempId: item.tempId });
        return duplicate.id;
      }
    }

    await offlineDB.put(STORES.SYNC_QUEUE, item);
    logger.info('Item enqueued with priority', { component: 'SyncQueue', operation: 'enqueue', priority, queueId, type });
    
    // Emit telemetry
    this.emitTelemetry({
      type: 'sync_start',
      itemId: queueId,
      metadata: { type, method, priority },
      timestamp: new Date().toISOString(),
    });
    
    this.notifyListeners();
    
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return queueId;
  }

  private async findDuplicateByTempId(tempId: string): Promise<SyncQueueItem | undefined> {
    const allItems = await offlineDB.getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
    return allItems.find(
      (item) => 
        item.tempId === tempId && 
        (item.status === 'pending' || item.status === 'processing')
    );
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      logger.debug('Already processing', { component: 'SyncQueue', operation: 'processQueue' });
      return;
    }

    logger.info('Starting queue processing', { component: 'SyncQueue', operation: 'processQueue' });
    this.isProcessing = true;

    try {
      let item = await this.getNextItem();
      
      while (item) {
        try {
          await this.processItem(item);
        } catch (error) {
          logger.error('Error processing item', error, { component: 'SyncQueue', operation: 'processQueue' });
        }
        
        item = await this.getNextItem();
      }
    } finally {
      this.isProcessing = false;
      logger.info('Queue processing complete', { component: 'SyncQueue', operation: 'processQueue' });
    }

    this.notifyListeners();
  }

  private async getNextItem(): Promise<SyncQueueItem | undefined> {
    const items = await offlineDB.getPendingSyncItems();
    
    if (items.length === 0) {
      return undefined;
    }

    // Filter items ready for retry
    const readyItems = items.filter((item) => {
      if (!item.nextRetry) return true;
      return new Date(item.nextRetry) <= new Date();
    });

    if (readyItems.length === 0) {
      const earliestItem = items.reduce((earliest, item) => {
        if (!item.nextRetry) return earliest;
        if (!earliest || !earliest.nextRetry) return item;
        return new Date(item.nextRetry) < new Date(earliest.nextRetry) ? item : earliest;
      });

      if (earliestItem?.nextRetry) {
        const delay = new Date(earliestItem.nextRetry).getTime() - Date.now();
        if (delay > 0) {
          logger.debug('Scheduling next check', { component: 'SyncQueue', operation: 'getNextItem', delay });
          setTimeout(() => this.processQueue(), delay);
        }
      }

      return undefined;
    }

    return readyItems[0];
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    logger.info('Processing item', { component: 'SyncQueue', operation: 'processItem', itemId: item.id, url: item.url, type: item.type });
    const startTime = Date.now();

    item.status = 'processing';
    item.lastAttempt = new Date().toISOString();
    const connectionQuality = this.getConnectionQuality();
    item.connectionQuality = connectionQuality;
    await offlineDB.put(STORES.SYNC_QUEUE, item);
    
    this.notifyListeners();
    this.emitProgress({ itemId: item.id, status: 'processing', progress: 50 });

    try {
      const response = await apiRequest(item.url, {
        method: item.method,
        body: item.data,
      });

      const syncTime = Date.now() - startTime;
      logger.info('Item synced successfully', { component: 'SyncQueue', operation: 'processItem', itemId: item.id, syncTime, type: item.type });

      this.metrics.synced.push(Date.now());
      this.metrics.syncTimes.push(syncTime);

      await this.handleSuccess(item, response);
      await offlineDB.delete(STORES.SYNC_QUEUE, item.id);
      
      this.emitProgress({ itemId: item.id, status: 'completed', progress: 100 });
      this.config.onSuccess(item, response);
      
      // Emit telemetry
      this.emitTelemetry({
        type: 'sync_complete',
        itemId: item.id,
        duration: syncTime,
        timestamp: new Date().toISOString(),
      });
      
      this.emitMetrics();
    } catch (error: any) {
      logger.error('Item sync failed', error, { component: 'SyncQueue', operation: 'processItem', itemId: item.id });
      this.metrics.failed.push(Date.now());
      
      // Emit telemetry
      this.emitTelemetry({
        type: 'sync_error',
        itemId: item.id,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      
      // Handle conflict (409)
      if (error.message?.includes('409') || error.message?.includes('conflict')) {
        await this.handleConflict(item, error);
        return;
      }

      item.retryCount++;

      if (item.retryCount >= item.maxRetries) {
        logger.error('Max retries reached for item', null, { component: 'SyncQueue', operation: 'processItem', itemId: item.id, retryCount: item.retryCount });
        item.status = 'failed';
        item.error = error.message || 'Max retries reached';
        await offlineDB.put(STORES.SYNC_QUEUE, item);
        this.emitProgress({ itemId: item.id, status: 'failed', progress: 0 });
        this.config.onError(item, error);
        this.emitMetrics();
      } else {
        const delay = this.getAdaptiveRetryDelay(item.retryCount, connectionQuality);
        item.nextRetry = new Date(Date.now() + delay).toISOString();
        item.status = 'pending';
        item.error = error.message;
        await offlineDB.put(STORES.SYNC_QUEUE, item);
        
        logger.info('Retry scheduled', { component: 'SyncQueue', operation: 'processItem', itemId: item.id, delay, connectionQuality, retryCount: item.retryCount });
        this.emitProgress({ itemId: item.id, status: 'queued', progress: 0 });
      }
    }

    this.notifyListeners();
  }

  private calculateBackoff(retryCount: number): number {
    const delay = this.config.baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000;
    return Math.min(delay + jitter, this.config.maxDelay);
  }

  private getConnectionQuality(): 'offline' | 'slow-2g' | '2g' | '3g' | '4g' {
    if (!navigator.onLine) return 'offline';
    
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (!connection) return '4g';
    
    const effectiveType = connection.effectiveType;
    if (effectiveType === 'slow-2g') return 'slow-2g';
    if (effectiveType === '2g') return '2g';
    if (effectiveType === '3g') return '3g';
    return '4g';
  }

  private getAdaptiveRetryDelay(retryCount: number, connectionQuality: string): number {
    const baseDelay = this.calculateBackoff(retryCount);
    
    const multipliers: Record<string, number> = {
      'offline': 10,
      'slow-2g': 5,
      '2g': 3,
      '3g': 1.5,
      '4g': 1,
    };
    
    const multiplier = multipliers[connectionQuality] || 1;
    return Math.min(baseDelay * multiplier, this.config.maxDelay);
  }

  // Process batch with partial recovery (don't fail entire batch if one item fails)
  async processBatchWithPartialRecovery(items: SyncQueueItem[]): Promise<void> {
    if (!this.config.enableBatching || items.length === 0) return;
    
    const batchGroups = new Map<string, SyncQueueItem[]>();
    
    items.forEach(item => {
      if (item.method === 'POST') {
        const key = `${item.type}_${item.url}`;
        if (!batchGroups.has(key)) {
          batchGroups.set(key, []);
        }
        batchGroups.get(key)!.push(item);
      }
    });
    
    for (const [key, groupItems] of Array.from(batchGroups.entries())) {
      if (groupItems.length >= 2) {
        logger.info('Batching items', { component: 'SyncQueue', operation: 'processBatch', itemCount: groupItems.length, key });
        await this.processBatchGroupWithPartialRecovery(groupItems);
      }
    }
  }

  // Partial-batch recovery: Process batch items individually if batch fails
  private async processBatchGroupWithPartialRecovery(items: SyncQueueItem[]): Promise<void> {
    const batchId = `batch_${Date.now()}`;
    const startTime = Date.now();
    
    // Mark all items as processing
    for (const item of items) {
      item.status = 'processing';
      item.batchId = batchId;
      await offlineDB.put(STORES.SYNC_QUEUE, item);
    }
    
    this.notifyListeners();
    this.emitProgress({ itemId: batchId, status: 'processing', progress: 0 });
    
    // Emit telemetry
    this.emitTelemetry({
      type: 'batch_start',
      metadata: { batchId, itemCount: items.length },
      timestamp: new Date().toISOString(),
    });
    
    try {
      // Try batch request first
      const batchData = items.map(item => item.data);
      const url = items[0].url + '/batch';
      
      const response = await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify({ items: batchData }),
      });
      
      // Batch succeeded
      const syncTime = Date.now() - startTime;
      this.metrics.synced.push(...items.map(() => Date.now()));
      this.metrics.syncTimes.push(syncTime);
      
      for (const item of items) {
        await offlineDB.delete(STORES.SYNC_QUEUE, item.id);
        this.config.onSuccess(item, response);
      }
      
      this.emitProgress({ itemId: batchId, status: 'completed', progress: 100 });
      this.emitTelemetry({
        type: 'batch_complete',
        metadata: { batchId, duration: syncTime, success: true },
        timestamp: new Date().toISOString(),
      });
      this.emitMetrics();
      
      logger.info('Batch completed', { component: 'SyncQueue', operation: 'processBatch', batchId, syncTime, itemCount: items.length });
    } catch (batchError: any) {
      logger.warn('Batch failed, falling back to individual processing', { component: 'SyncQueue', operation: 'processBatch', batchId, error: batchError.message });
      
      // Partial recovery: Process items individually
      let successCount = 0;
      let failCount = 0;
      
      for (const item of items) {
        try {
          // Reset status for individual processing
          item.status = 'pending';
          item.batchId = undefined;
          await offlineDB.put(STORES.SYNC_QUEUE, item);
          
          // Process individually
          await this.processItem(item);
          successCount++;
        } catch (itemError) {
          logger.error('Individual item failed', itemError, { component: 'SyncQueue', operation: 'processBatch', itemId: item.id });
          failCount++;
          
          // Item will be retried later by regular queue processing
          item.status = 'pending';
          await offlineDB.put(STORES.SYNC_QUEUE, item);
        }
      }
      
      const syncTime = Date.now() - startTime;
      this.emitProgress({ itemId: batchId, status: 'completed', progress: 100 });
      this.emitTelemetry({
        type: 'batch_complete',
        metadata: { 
          batchId, 
          duration: syncTime, 
          success: false, 
          partialRecovery: true,
          successCount,
          failCount
        },
        timestamp: new Date().toISOString(),
      });
      
      logger.info('Partial recovery completed', { component: 'SyncQueue', operation: 'processBatch', batchId, successCount, failCount });
    }
    
    this.notifyListeners();
  }

  private emitProgress(progress: SyncProgress): void {
    this.config.onProgress(progress);
  }

  private emitMetrics(): void {
    const now = Date.now();
    const recentSynced = this.metrics.synced.filter(t => now - t < 300000);
    const recentFailed = this.metrics.failed.filter(t => now - t < 300000);
    const recentSyncTimes = this.metrics.syncTimes.slice(-100);
    
    const totalSynced = recentSynced.length;
    const totalFailed = recentFailed.length;
    const avgSyncTime = recentSyncTimes.length > 0
      ? recentSyncTimes.reduce((a, b) => a + b, 0) / recentSyncTimes.length
      : 0;
    const successRate = totalSynced + totalFailed > 0
      ? (totalSynced / (totalSynced + totalFailed)) * 100
      : 100;
    
    const metrics: SyncMetrics = {
      totalSynced,
      totalFailed,
      avgSyncTime,
      successRate,
      connectionQuality: this.getConnectionQuality(),
      timestamp: new Date().toISOString(),
    };
    
    this.config.onMetrics(metrics);
  }

  private emitTelemetry(event: TelemetryEvent): void {
    this.config.onTelemetry(event);
  }

  private async handleSuccess(item: SyncQueueItem, response: any): Promise<void> {
    if (item.type === 'message' && item.tempId) {
      if (response.id) {
        await offlineDB.resolveMessageConflict(item.tempId, response.id);
      }
    } else if (item.type === 'transaction' && item.tempId) {
      const transaction = await offlineDB.getByIndex<any>(
        STORES.TRANSACTIONS,
        'tempId',
        item.tempId
      );
      if (transaction && transaction.id && response.id) {
        await offlineDB.delete(STORES.TRANSACTIONS, transaction.id);
        await offlineDB.put(STORES.TRANSACTIONS, {
          ...transaction,
          id: response.id,
          syncStatus: 'synced' as const,
        });
      }
    }
  }

  private async handleConflict(item: SyncQueueItem, error: any): Promise<void> {
    logger.info('Handling conflict for item', { component: 'SyncQueue', operation: 'handleConflict', itemId: item.id, type: item.type });
    
    // Emit telemetry
    this.emitTelemetry({
      type: 'conflict_detected',
      itemId: item.id,
      metadata: { type: item.type, url: item.url },
      timestamp: new Date().toISOString(),
    });
    
    // Dispatch custom event for UX to handle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sync:conflict', {
        detail: { item, error }
      }));
    }
    
    try {
      const resolvedData = await this.config.onConflict(item, error);
      
      if (resolvedData) {
        item.data = resolvedData;
        item.retryCount = 0;
        item.status = 'pending';
        item.nextRetry = new Date().toISOString();
        await offlineDB.put(STORES.SYNC_QUEUE, item);
      } else {
        item.status = 'failed';
        item.error = 'Conflict could not be resolved';
        await offlineDB.put(STORES.SYNC_QUEUE, item);
      }
    } catch (resolveError) {
      logger.error('Conflict resolution failed', resolveError, { component: 'SyncQueue', operation: 'handleConflict', itemId: item.id });
      item.status = 'failed';
      item.error = 'Conflict resolution failed';
      await offlineDB.put(STORES.SYNC_QUEUE, item);
    }

    this.notifyListeners();
  }

  private async defaultConflictHandler(
    item: SyncQueueItem,
    serverData: any
  ): Promise<any> {
    logger.info('Default conflict handler - server wins', { component: 'SyncQueue', operation: 'defaultConflictHandler', itemId: item.id });
    return null;
  }

  startProcessing(intervalMs: number = 30000): void {
    if (this.processInterval) {
      logger.debug('Processing already started', { component: 'SyncQueue', operation: 'startProcessing' });
      return;
    }

    logger.info('Starting automatic processing', { component: 'SyncQueue', operation: 'startProcessing', intervalMs });
    
    this.processQueue();

    this.processInterval = setInterval(() => {
      if (!this.isProcessing && navigator.onLine) {
        this.processQueue();
      }
    }, intervalMs);
  }

  stopProcessing(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      logger.info('Processing stopped', { component: 'SyncQueue', operation: 'stopProcessing' });
    }
  }

  async getStats(): Promise<QueueStats> {
    const allItems = await offlineDB.getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
    
    const byType: Record<string, number> = {};
    const byPriority: Record<number, number> = {};
    
    allItems.forEach(item => {
      byType[item.type] = (byType[item.type] || 0) + 1;
      byPriority[item.priority] = (byPriority[item.priority] || 0) + 1;
    });
    
    const completed = allItems.filter((i) => i.status === 'completed').length;
    const processing = allItems.filter((i) => i.status === 'processing').length;
    
    return {
      pending: allItems.filter((i) => i.status === 'pending').length,
      processing,
      failed: allItems.filter((i) => i.status === 'failed').length,
      completed,
      total: allItems.length,
      synced: completed,
      syncing: processing,
      byType,
      byPriority,
    };
  }

  async getPendingItems(): Promise<SyncQueueItem[]> {
    return offlineDB.getPendingSyncItems();
  }

  async clearCompleted(): Promise<void> {
    const allItems = await offlineDB.getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
    const completed = allItems.filter((i) => i.status === 'completed');
    
    for (const item of completed) {
      await offlineDB.delete(STORES.SYNC_QUEUE, item.id);
    }
    
    this.notifyListeners();
  }

  async clearFailed(): Promise<void> {
    const allItems = await offlineDB.getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
    const failed = allItems.filter((i) => i.status === 'failed');
    
    for (const item of failed) {
      await offlineDB.delete(STORES.SYNC_QUEUE, item.id);
    }
    
    this.notifyListeners();
  }

  async retryFailed(): Promise<void> {
    const allItems = await offlineDB.getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
    const failed = allItems.filter((i) => i.status === 'failed');
    
    for (const item of failed) {
      item.status = 'pending';
      item.retryCount = 0;
      item.nextRetry = undefined;
      item.error = undefined;
      await offlineDB.put(STORES.SYNC_QUEUE, item);
    }
    
    this.notifyListeners();
    this.processQueue();
  }

  async getAllItems(): Promise<SyncQueueItem[]> {
    return offlineDB.getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
  }

  async saveItem(item: SyncQueueItem): Promise<void> {
    await offlineDB.put(STORES.SYNC_QUEUE, item);
    this.notifyListeners();
  }

  async deleteItem(itemId: string): Promise<void> {
    await offlineDB.delete(STORES.SYNC_QUEUE, itemId);
    this.notifyListeners();
  }

  subscribe(listener: (stats: QueueStats) => void): () => void {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListeners(): Promise<void> {
    if (this.listeners.size === 0) return;
    
    const stats = await this.getStats();
    this.listeners.forEach((listener) => {
      try {
        listener(stats);
      } catch (error) {
        logger.error('Error in listener', error, { component: 'SyncQueue', operation: 'notifyListeners' });
      }
    });
  }

  /**
   * Cleanup method to properly dispose of timers and listeners
   * Call this when the sync queue is no longer needed
   */
  destroy(): void {
    logger.info('Destroying sync queue', { component: 'SyncQueue', operation: 'destroy' });
    
    // Stop processing interval
    this.stopProcessing();
    
    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    // Clear all listeners
    this.listeners.clear();
    
    // Reset processing flag
    this.isProcessing = false;
    this.isInitialized = false;
    
    logger.info('Sync queue destroyed', { component: 'SyncQueue', operation: 'destroy' });
  }
}

// Singleton instance
export const syncQueue = new SyncQueueManager();

// Auto-start processing
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    logger.info('Online - starting sync', { component: 'SyncQueue', event: 'online' });
    syncQueue.processQueue();
  });

  if (navigator.onLine) {
    syncQueue.startProcessing();
  }
}

export default syncQueue;
