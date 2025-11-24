// IndexedDB Abstraction Layer for Offline Support
// Version 3: Compression, eviction policies, metadata table, version tracking

import { logger } from './logger';

const DB_NAME = 'nxe-marketplace-offline';
const DB_VERSION = 3;

// Store names
export const STORES = {
  MESSAGES: 'messages',
  PRODUCTS: 'products',
  TRANSACTIONS: 'transactions',
  WALLET: 'wallet',
  SYNC_QUEUE: 'sync_queue',
  METADATA: 'metadata', // v3: Conflict tracking metadata
  VERSIONS: 'versions', // v3: Sync state management
} as const;

// IndexedDB Schema Types
export interface OfflineMessage {
  id: number | string;
  chatId: number;
  senderId: number;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'audio' | 'video';
  metadata?: Record<string, any>;
  status: 'sent' | 'delivered' | 'read' | 'pending';
  tempId?: string;
  createdAt: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSyncAttempt?: string;
  lastSynced?: string;
  dirtyFields?: string[];
  conflictVersion?: number;
  compressed?: boolean; // v3: Indicates if content is compressed
  accessCount?: number; // v3: For LRU eviction
  lastAccessed?: string; // v3: For LRU eviction
  size?: number; // v3: Estimated size in bytes
}

export interface OfflineProduct {
  id: number;
  title: string;
  description: string;
  price: string;
  category: string;
  thumbnail?: string;
  sellerId: number;
  stock: number;
  status: string;
  createdAt: string;
  lastFetched: string;
  syncStatus: 'synced' | 'stale';
  lastSynced?: string;
  dirtyFields?: string[];
  compressed?: boolean; // v3: Indicates if description is compressed
  accessCount?: number; // v3: For LRU eviction
  lastAccessed?: string; // v3: For LRU eviction
  size?: number; // v3: Estimated size in bytes
}

export interface OfflineTransaction {
  id: number | string;
  buyerId: number;
  sellerId: number;
  productId: number;
  amount: string;
  status: 'pending' | 'active' | 'completed' | 'disputed' | 'cancelled';
  tempId?: string;
  createdAt: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSyncAttempt?: string;
  lastSynced?: string;
  dirtyFields?: string[];
  conflictVersion?: number;
  accessCount?: number; // v3: For LRU eviction
  lastAccessed?: string; // v3: For LRU eviction
  size?: number; // v3: Estimated size in bytes
}

export interface OfflineWallet {
  userId: number;
  balance: string;
  lastUpdated: string;
  syncStatus: 'synced' | 'stale';
  lastSynced?: string;
  dirtyFields?: string[];
  pendingTransactions: Array<{
    type: 'credit' | 'debit';
    amount: string;
    timestamp: string;
  }>;
  accessCount?: number; // v3: For LRU eviction
  lastAccessed?: string; // v3: For LRU eviction
}

export interface SyncQueueItem {
  id: string;
  type: 'message' | 'transaction' | 'wallet' | 'product' | 'generic';
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data: any;
  tempId?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  lastAttempt?: string;
  nextRetry?: string;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  error?: string;
  priority: number;
  batchId?: string;
  connectionQuality?: 'offline' | 'slow-2g' | '2g' | '3g' | '4g';
}

// v3: Metadata for conflict tracking
export interface ConflictMetadata {
  id: string;
  storeType: string;
  itemId: string | number;
  localVersion: number;
  serverVersion?: number;
  conflictData?: any;
  resolvedAt?: string;
  resolution?: 'server-wins' | 'client-wins' | 'manual' | 'merged';
  createdAt: string;
}

// v3: Version tracking for sync state
export interface VersionInfo {
  id: string; // e.g., 'messages_123' or 'products_456'
  storeType: string;
  itemId: string | number;
  version: number;
  lastSynced: string;
  checksum?: string; // Optional data integrity check
}

export interface ConnectionQualityMetadata {
  type: 'offline' | 'slow-2g' | '2g' | '3g' | '4g';
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  timestamp: string;
}

export interface StoreSizeInfo {
  storeName: string;
  itemCount: number;
  estimatedSize: number;
}

export interface CleanupPolicy {
  enabled: boolean;
  daysToKeep: number;
  maxItemsPerStore?: number;
  maxTotalSize?: number;
  preservePending?: boolean;
}

// v3: Eviction policies per store
export interface EvictionPolicy {
  type: 'lru' | 'size-based' | 'time-based';
  maxItems?: number;
  maxSize?: number; // bytes
  maxAge?: number; // days
}

export const DEFAULT_EVICTION_POLICIES: Record<string, EvictionPolicy> = {
  [STORES.MESSAGES]: { type: 'lru', maxItems: 1000, maxSize: 5 * 1024 * 1024 }, // 5MB
  [STORES.PRODUCTS]: { type: 'lru', maxItems: 500, maxSize: 10 * 1024 * 1024 }, // 10MB
  [STORES.TRANSACTIONS]: { type: 'time-based', maxAge: 90 }, // 90 days
  [STORES.WALLET]: { type: 'lru', maxItems: 10 },
  [STORES.SYNC_QUEUE]: { type: 'time-based', maxAge: 7 }, // 7 days
};

// Simple compression utilities (LZ-based)
class CompressionUtils {
  // Compress string using simple dictionary-based compression
  static compress(str: string): string {
    if (!str || str.length < 100) return str; // Don't compress small strings
    
    const dict: Map<string, number> = new Map();
    let dictSize = 256;
    let result = '';
    let w = '';
    
    for (let i = 0; i < str.length; i++) {
      const c = str.charAt(i);
      const wc = w + c;
      
      if (dict.has(wc)) {
        w = wc;
      } else {
        result += String.fromCharCode(dict.get(w) || w.charCodeAt(0));
        dict.set(wc, dictSize++);
        w = c;
      }
    }
    
    if (w) {
      result += String.fromCharCode(dict.get(w) || w.charCodeAt(0));
    }
    
    // Only return compressed if it's actually smaller
    return result.length < str.length ? result : str;
  }
  
  // Decompress string
  static decompress(compressed: string): string {
    if (!compressed) return compressed;
    
    const dict: Map<number, string> = new Map();
    let dictSize = 256;
    let w = String.fromCharCode(compressed.charCodeAt(0));
    let result = w;
    
    for (let i = 1; i < compressed.length; i++) {
      const k = compressed.charCodeAt(i);
      let entry: string;
      
      if (dict.has(k)) {
        entry = dict.get(k)!;
      } else if (k === dictSize) {
        entry = w + w.charAt(0);
      } else {
        return compressed; // Decompression failed, return original
      }
      
      result += entry;
      dict.set(dictSize++, w + entry.charAt(0));
      w = entry;
    }
    
    return result;
  }
  
  // Estimate size of an object
  static estimateSize(obj: any): number {
    const str = JSON.stringify(obj);
    return new Blob([str]).size;
  }
}

// Database initialization with versioned migrations
class OfflineDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.runMigrations(db, event.oldVersion, event);
      };
    });

    return this.initPromise;
  }

  private runMigrations(db: IDBDatabase, oldVersion: number, event: IDBVersionChangeEvent) {
    logger.info('Running migrations', { component: 'OfflineDB', operation: 'runMigrations', fromVersion: oldVersion, toVersion: DB_VERSION });

    // Migration v0 -> v1: Initial schema
    if (oldVersion < 1) {
      // Messages store
      if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
        const messagesStore = db.createObjectStore(STORES.MESSAGES, {
          keyPath: 'id',
        });
        messagesStore.createIndex('chatId', 'chatId', { unique: false });
        messagesStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        messagesStore.createIndex('tempId', 'tempId', { unique: true });
        messagesStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Products store
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productsStore = db.createObjectStore(STORES.PRODUCTS, {
          keyPath: 'id',
        });
        productsStore.createIndex('category', 'category', { unique: false });
        productsStore.createIndex('sellerId', 'sellerId', { unique: false });
        productsStore.createIndex('lastFetched', 'lastFetched', { unique: false });
        productsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Transactions store
      if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
        const transactionsStore = db.createObjectStore(STORES.TRANSACTIONS, {
          keyPath: 'id',
        });
        transactionsStore.createIndex('buyerId', 'buyerId', { unique: false });
        transactionsStore.createIndex('sellerId', 'sellerId', { unique: false });
        transactionsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        transactionsStore.createIndex('tempId', 'tempId', { unique: true });
      }

      // Wallet store
      if (!db.objectStoreNames.contains(STORES.WALLET)) {
        db.createObjectStore(STORES.WALLET, {
          keyPath: 'userId',
        });
      }

      // Sync queue store
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncQueueStore = db.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: 'id',
        });
        syncQueueStore.createIndex('status', 'status', { unique: false });
        syncQueueStore.createIndex('priority', 'priority', { unique: false });
        syncQueueStore.createIndex('nextRetry', 'nextRetry', { unique: false });
        syncQueueStore.createIndex('type', 'type', { unique: false });
      }
    }

    // Migration v1 -> v2: Add lastSynced and dirtyFields indexes
    if (oldVersion < 2) {
      logger.info('Adding v2 indexes', { component: 'OfflineDB', operation: 'runMigrations', version: 2 });
      
      const transaction = (event.target as IDBOpenDBRequest).transaction;
      if (!transaction) {
        throw new Error('No transaction available for migration');
      }
      
      // Add lastSynced index to messages
      if (db.objectStoreNames.contains(STORES.MESSAGES)) {
        const messagesStore = transaction.objectStore(STORES.MESSAGES);
        if (!messagesStore.indexNames.contains('lastSynced')) {
          messagesStore.createIndex('lastSynced', 'lastSynced', { unique: false });
        }
      }
      
      // Add lastSynced index to products
      if (db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productsStore = transaction.objectStore(STORES.PRODUCTS);
        if (!productsStore.indexNames.contains('lastSynced')) {
          productsStore.createIndex('lastSynced', 'lastSynced', { unique: false });
        }
      }
      
      // Add lastSynced index to transactions
      if (db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
        const transactionsStore = transaction.objectStore(STORES.TRANSACTIONS);
        if (!transactionsStore.indexNames.contains('lastSynced')) {
          transactionsStore.createIndex('lastSynced', 'lastSynced', { unique: false });
        }
      }
    }

    // Migration v2 -> v3: Add compression, eviction, metadata, and version tracking
    if (oldVersion < 3) {
      logger.info('Adding v3 features', { component: 'OfflineDB', operation: 'runMigrations', version: 3 });
      
      const transaction = (event.target as IDBOpenDBRequest).transaction;
      if (!transaction) {
        throw new Error('No transaction available for migration');
      }

      // Add LRU tracking indexes to existing stores
      const storesWithLRU = [STORES.MESSAGES, STORES.PRODUCTS, STORES.TRANSACTIONS, STORES.WALLET];
      
      for (const storeName of storesWithLRU) {
        if (db.objectStoreNames.contains(storeName)) {
          const store = transaction.objectStore(storeName);
          
          // Add lastAccessed index for LRU eviction
          if (!store.indexNames.contains('lastAccessed')) {
            store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          }
          
          // Add accessCount index for access tracking
          if (!store.indexNames.contains('accessCount')) {
            store.createIndex('accessCount', 'accessCount', { unique: false });
          }
        }
      }

      // Create Metadata store for conflict tracking
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        const metadataStore = db.createObjectStore(STORES.METADATA, {
          keyPath: 'id',
        });
        metadataStore.createIndex('storeType', 'storeType', { unique: false });
        metadataStore.createIndex('itemId', 'itemId', { unique: false });
        metadataStore.createIndex('createdAt', 'createdAt', { unique: false });
        metadataStore.createIndex('resolution', 'resolution', { unique: false });
        logger.info('Created metadata store', { component: 'OfflineDB', operation: 'runMigrations' });
      }

      // Create Versions store for sync state management
      if (!db.objectStoreNames.contains(STORES.VERSIONS)) {
        const versionsStore = db.createObjectStore(STORES.VERSIONS, {
          keyPath: 'id',
        });
        versionsStore.createIndex('storeType', 'storeType', { unique: false });
        versionsStore.createIndex('itemId', 'itemId', { unique: false });
        versionsStore.createIndex('lastSynced', 'lastSynced', { unique: false });
        logger.info('Created versions store', { component: 'OfflineDB', operation: 'runMigrations' });
      }

      logger.info('v3 features added successfully', { component: 'OfflineDB', operation: 'runMigrations' });
    }
  }

  // Generic CRUD operations with compression and LRU tracking
  async add<T>(storeName: string, data: T): Promise<void> {
    const db = await this.init();
    const enrichedData = this.enrichWithMetadata(storeName, data);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(enrichedData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, data: T): Promise<void> {
    const db = await this.init();
    const enrichedData = this.enrichWithMetadata(storeName, data);
    
    // Apply compression if applicable
    const compressedData = await this.maybeCompress(storeName, enrichedData);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(compressedData);

      request.onsuccess = async () => {
        // Check eviction policy after insertion
        await this.enforceEvictionPolicy(storeName);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = async () => {
        const result = request.result;
        
        if (result) {
          // Update LRU metadata
          await this.updateAccessMetadata(storeName, result);
          
          // Decompress if needed
          const decompressed = this.maybeDecompress(storeName, result);
          resolve(decompressed as T);
        } else {
          resolve(undefined);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result.map((item: any) => 
          this.maybeDecompress(storeName, item)
        );
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Enrich data with metadata for LRU and size tracking
  private enrichWithMetadata<T>(storeName: string, data: T): T {
    const now = new Date().toISOString();
    const enriched: any = { ...data };
    
    // Add LRU metadata if not exists
    if (!enriched.lastAccessed) {
      enriched.lastAccessed = now;
    }
    if (!enriched.accessCount) {
      enriched.accessCount = 0;
    }
    
    // Estimate size if not exists
    if (!enriched.size) {
      enriched.size = CompressionUtils.estimateSize(data);
    }
    
    return enriched;
  }

  // Update access metadata for LRU tracking
  private async updateAccessMetadata(storeName: string, item: any): Promise<void> {
    if (!item.id) return;
    
    const db = await this.init();
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      item.lastAccessed = now;
      item.accessCount = (item.accessCount || 0) + 1;
      
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Compression for large payloads
  private async maybeCompress<T>(storeName: string, data: T): Promise<T> {
    const compressibleStores = [STORES.MESSAGES, STORES.PRODUCTS];
    if (!compressibleStores.includes(storeName as any)) {
      return data;
    }

    const item: any = { ...data };
    
    // Compress message content
    if (storeName === STORES.MESSAGES && item.content && item.content.length > 100) {
      item.content = CompressionUtils.compress(item.content);
      item.compressed = true;
    }
    
    // Compress product description
    if (storeName === STORES.PRODUCTS && item.description && item.description.length > 200) {
      item.description = CompressionUtils.compress(item.description);
      item.compressed = true;
    }
    
    return item;
  }

  // Decompression for large payloads
  private maybeDecompress<T>(storeName: string, data: T): T {
    const item: any = { ...data };
    
    if (!item.compressed) {
      return item;
    }
    
    // Decompress message content
    if (storeName === STORES.MESSAGES && item.content) {
      item.content = CompressionUtils.decompress(item.content);
      delete item.compressed;
    }
    
    // Decompress product description
    if (storeName === STORES.PRODUCTS && item.description) {
      item.description = CompressionUtils.decompress(item.description);
      delete item.compressed;
    }
    
    return item;
  }

  // Enforce eviction policy for a store
  private async enforceEvictionPolicy(storeName: string): Promise<void> {
    const policy = DEFAULT_EVICTION_POLICIES[storeName];
    if (!policy) return;

    const db = await this.init();
    
    if (policy.type === 'lru' && policy.maxItems) {
      await this.enforceLRUEviction(storeName, policy.maxItems);
    } else if (policy.type === 'size-based' && policy.maxSize) {
      await this.enforceSizeBasedEviction(storeName, policy.maxSize);
    } else if (policy.type === 'time-based' && policy.maxAge) {
      await this.enforceTimeBasedEviction(storeName, policy.maxAge);
    }
  }

  // LRU eviction
  private async enforceLRUEviction(storeName: string, maxItems: number): Promise<void> {
    const db = await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        
        if (count <= maxItems) {
          resolve();
          return;
        }
        
        // Get items sorted by lastAccessed (oldest first)
        const itemsToRemove = count - maxItems;
        const allRequest = store.index('lastAccessed').openCursor();
        let removed = 0;
        
        allRequest.onsuccess = (event: any) => {
          const cursor = event.target.result;
          
          if (cursor && removed < itemsToRemove) {
            const item = cursor.value;
            
            // Don't evict pending items
            if (item.syncStatus !== 'pending') {
              cursor.delete();
              removed++;
            }
            
            cursor.continue();
          } else {
            resolve();
          }
        };
        
        allRequest.onerror = () => reject(allRequest.error);
      };
      
      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  // Size-based eviction
  private async enforceSizeBasedEviction(storeName: string, maxSize: number): Promise<void> {
    const items = await this.getAll<any>(storeName);
    const totalSize = items.reduce((sum, item) => sum + (item.size || 0), 0);
    
    if (totalSize <= maxSize) return;
    
    // Sort by lastAccessed (oldest first)
    items.sort((a, b) => {
      const aTime = a.lastAccessed || '0';
      const bTime = b.lastAccessed || '0';
      return aTime.localeCompare(bTime);
    });
    
    let currentSize = totalSize;
    for (const item of items) {
      if (currentSize <= maxSize) break;
      
      // Don't evict pending items
      if (item.syncStatus === 'pending') continue;
      
      await this.delete(storeName, item.id || item.userId);
      currentSize -= (item.size || 0);
    }
  }

  // Time-based eviction
  private async enforceTimeBasedEviction(storeName: string, maxAgeDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    const cutoffTimestamp = cutoffDate.toISOString();
    
    const items = await this.getAll<any>(storeName);
    
    for (const item of items) {
      const timestamp = item.createdAt || item.lastUpdated || item.lastFetched;
      
      if (timestamp && timestamp < cutoffTimestamp && item.syncStatus !== 'pending') {
        await this.delete(storeName, item.id || item.userId);
      }
    }
  }

  // Index-based queries
  async getAllByIndex<T>(
    storeName: string,
    indexName: string,
    query: IDBValidKey | IDBKeyRange
  ): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(query);

      request.onsuccess = () => {
        const results = request.result.map((item: any) => 
          this.maybeDecompress(storeName, item)
        );
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex<T>(
    storeName: string,
    indexName: string,
    query: IDBValidKey
  ): Promise<T | undefined> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.get(query);

      request.onsuccess = () => {
        const result = request.result 
          ? this.maybeDecompress(storeName, request.result)
          : undefined;
        resolve(result as T);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Batch operations
  async bulkPut<T>(storeName: string, items: T[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      let completed = 0;
      const total = items.length;

      items.forEach(async (item) => {
        const enriched = this.enrichWithMetadata(storeName, item);
        const compressed = await this.maybeCompress(storeName, enriched);
        const request = store.put(compressed);
        
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });

      if (total === 0) resolve();
    });
  }

  // Specialized methods for messages
  async getMessagesByChat(chatId: number): Promise<OfflineMessage[]> {
    return this.getAllByIndex<OfflineMessage>(
      STORES.MESSAGES,
      'chatId',
      chatId
    );
  }

  async getPendingMessages(): Promise<OfflineMessage[]> {
    return this.getAllByIndex<OfflineMessage>(
      STORES.MESSAGES,
      'syncStatus',
      'pending'
    );
  }

  async getMessageByTempId(tempId: string): Promise<OfflineMessage | undefined> {
    return this.getByIndex<OfflineMessage>(
      STORES.MESSAGES,
      'tempId',
      tempId
    );
  }

  // Specialized methods for products
  async getProductsByCategory(category: string): Promise<OfflineProduct[]> {
    return this.getAllByIndex<OfflineProduct>(
      STORES.PRODUCTS,
      'category',
      category
    );
  }

  async getStaleProducts(): Promise<OfflineProduct[]> {
    return this.getAllByIndex<OfflineProduct>(
      STORES.PRODUCTS,
      'syncStatus',
      'stale'
    );
  }

  // Specialized methods for sync queue
  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const items = await this.getAllByIndex<SyncQueueItem>(
      STORES.SYNC_QUEUE,
      'status',
      'pending'
    );
    return items.sort((a, b) => a.priority - b.priority);
  }

  async getNextSyncItem(): Promise<SyncQueueItem | undefined> {
    const items = await this.getPendingSyncItems();
    return items[0];
  }

  // Wallet operations
  async getWalletBalance(userId: number): Promise<OfflineWallet | undefined> {
    return this.get<OfflineWallet>(STORES.WALLET, userId);
  }

  async updateWalletBalance(
    userId: number,
    balance: string,
    syncStatus: 'synced' | 'stale' = 'synced'
  ): Promise<void> {
    const wallet: OfflineWallet = {
      userId,
      balance,
      lastUpdated: new Date().toISOString(),
      syncStatus,
      pendingTransactions: [],
    };
    await this.put(STORES.WALLET, wallet);
  }

  // Conflict resolution helpers
  async resolveMessageConflict(
    tempId: string,
    serverId: number
  ): Promise<void> {
    const message = await this.getMessageByTempId(tempId);
    if (message) {
      await this.delete(STORES.MESSAGES, message.id);
      await this.put(STORES.MESSAGES, {
        ...message,
        id: serverId,
        syncStatus: 'synced' as const,
      });
    }
  }

  // v3: Conflict metadata operations
  async saveConflictMetadata(metadata: ConflictMetadata): Promise<void> {
    await this.put(STORES.METADATA, metadata);
  }

  async getConflictMetadata(id: string): Promise<ConflictMetadata | undefined> {
    return this.get<ConflictMetadata>(STORES.METADATA, id);
  }

  async getUnresolvedConflicts(): Promise<ConflictMetadata[]> {
    const all = await this.getAll<ConflictMetadata>(STORES.METADATA);
    return all.filter(m => !m.resolvedAt);
  }

  // v3: Version tracking operations
  async saveVersion(version: VersionInfo): Promise<void> {
    await this.put(STORES.VERSIONS, version);
  }

  async getVersion(id: string): Promise<VersionInfo | undefined> {
    return this.get<VersionInfo>(STORES.VERSIONS, id);
  }

  async updateItemVersion(storeType: string, itemId: string | number, version: number): Promise<void> {
    const id = `${storeType}_${itemId}`;
    const versionInfo: VersionInfo = {
      id,
      storeType,
      itemId,
      version,
      lastSynced: new Date().toISOString(),
    };
    await this.saveVersion(versionInfo);
  }

  // Batch read operations with chunking
  async bulkGet<T>(storeName: string, keys: IDBValidKey[], chunkSize: number = 50): Promise<(T | undefined)[]> {
    const results: (T | undefined)[] = [];
    
    for (let i = 0; i < keys.length; i += chunkSize) {
      const chunk = keys.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(key => this.get<T>(storeName, key))
      );
      results.push(...chunkResults);
    }
    
    return results;
  }

  // Batch delete operations with chunking
  async bulkDelete(storeName: string, keys: IDBValidKey[], chunkSize: number = 50): Promise<void> {
    const db = await this.init();
    
    for (let i = 0; i < keys.length; i += chunkSize) {
      const chunk = keys.slice(i, i + chunkSize);
      
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        let completed = 0;
        const total = chunk.length;
        
        chunk.forEach((key) => {
          const request = store.delete(key);
          request.onsuccess = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
        
        if (total === 0) resolve();
      });
    }
  }

  // Get store size metrics
  async getStoreSize(storeName: string): Promise<StoreSizeInfo> {
    const items = await this.getAll(storeName);
    const itemCount = items.length;
    
    const serialized = JSON.stringify(items);
    const estimatedSize = new Blob([serialized]).size;
    
    return {
      storeName,
      itemCount,
      estimatedSize,
    };
  }

  // Get total size across all stores
  async getTotalSize(): Promise<{ stores: StoreSizeInfo[], totalSize: number, totalItems: number }> {
    const storeNames = Object.values(STORES);
    const storeSizes = await Promise.all(
      storeNames.map(name => this.getStoreSize(name))
    );
    
    const totalSize = storeSizes.reduce((sum, info) => sum + info.estimatedSize, 0);
    const totalItems = storeSizes.reduce((sum, info) => sum + info.itemCount, 0);
    
    return {
      stores: storeSizes,
      totalSize,
      totalItems,
    };
  }

  // Connection quality metadata
  async saveConnectionQuality(metadata: ConnectionQualityMetadata): Promise<void> {
    const METADATA_STORE = 'connection_quality';
    
    const db = await this.init();
    if (!db.objectStoreNames.contains(METADATA_STORE)) {
      logger.warn('Connection quality store not found, skipping save', { component: 'OfflineDB', operation: 'saveConnectionQuality' });
      return;
    }
    
    await this.put(METADATA_STORE, {
      id: 'latest',
      ...metadata,
    });
  }

  async getConnectionQuality(): Promise<ConnectionQualityMetadata | undefined> {
    const METADATA_STORE = 'connection_quality';
    
    const db = await this.init();
    if (!db.objectStoreNames.contains(METADATA_STORE)) {
      return undefined;
    }
    
    return this.get<ConnectionQualityMetadata>(METADATA_STORE, 'latest');
  }

  // Enhanced cleanup with configurable policies
  async cleanupWithPolicy(policy: CleanupPolicy): Promise<{ deletedItems: number, freedSpace: number }> {
    if (!policy.enabled) {
      return { deletedItems: 0, freedSpace: 0 };
    }

    let totalDeleted = 0;
    let totalFreed = 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.daysToKeep);
    const cutoffTimestamp = cutoffDate.toISOString();

    // Clean messages
    const messages = await this.getAll<OfflineMessage>(STORES.MESSAGES);
    const messagesToDelete = messages.filter(msg => {
      if (policy.preservePending && msg.syncStatus === 'pending') return false;
      return msg.syncStatus === 'synced' && msg.createdAt < cutoffTimestamp;
    });
    
    if (messagesToDelete.length > 0) {
      const messageSize = new Blob([JSON.stringify(messagesToDelete)]).size;
      await this.bulkDelete(STORES.MESSAGES, messagesToDelete.map(m => m.id));
      totalDeleted += messagesToDelete.length;
      totalFreed += messageSize;
    }

    // Clean products
    const products = await this.getAll<OfflineProduct>(STORES.PRODUCTS);
    const productsToDelete = products.filter(p => p.lastFetched < cutoffTimestamp);
    
    if (productsToDelete.length > 0) {
      const productSize = new Blob([JSON.stringify(productsToDelete)]).size;
      await this.bulkDelete(STORES.PRODUCTS, productsToDelete.map(p => p.id));
      totalDeleted += productsToDelete.length;
      totalFreed += productSize;
    }

    // Clean completed sync queue items
    const queueItems = await this.getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
    const queueToDelete = queueItems.filter(item => 
      item.status === 'completed' && item.createdAt < cutoffTimestamp
    );
    
    if (queueToDelete.length > 0) {
      const queueSize = new Blob([JSON.stringify(queueToDelete)]).size;
      await this.bulkDelete(STORES.SYNC_QUEUE, queueToDelete.map(q => q.id));
      totalDeleted += queueToDelete.length;
      totalFreed += queueSize;
    }

    // Enforce max items per store if specified
    if (policy.maxItemsPerStore) {
      for (const storeName of Object.values(STORES)) {
        const items = await this.getAll(storeName);
        if (items.length > policy.maxItemsPerStore) {
          const sorted = items.sort((a: any, b: any) => {
            const aTime = a.createdAt || a.lastFetched || a.lastUpdated || '0';
            const bTime = b.createdAt || b.lastFetched || b.lastUpdated || '0';
            return aTime.localeCompare(bTime);
          });
          
          const toDelete = sorted.slice(0, items.length - policy.maxItemsPerStore);
          const keys = toDelete.map((item: any) => item.id || item.userId);
          await this.bulkDelete(storeName, keys);
          totalDeleted += toDelete.length;
        }
      }
    }

    return { deletedItems: totalDeleted, freedSpace: totalFreed };
  }

  // Cleanup operations (legacy, kept for backward compatibility)
  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    await this.cleanupWithPolicy({
      enabled: true,
      daysToKeep,
      preservePending: true,
    });
  }

  // Automated cleanup job - runs periodically
  async runAutomatedCleanup(): Promise<{ deletedItems: number, freedSpace: number }> {
    logger.info('Running automated cleanup', { component: 'OfflineDB', operation: 'runAutomatedCleanup' });
    
    const result = await this.cleanupWithPolicy({
      enabled: true,
      daysToKeep: 30,
      maxItemsPerStore: 1000,
      maxTotalSize: 50 * 1024 * 1024, // 50MB
      preservePending: true,
    });
    
    logger.info('Cleanup complete', { component: 'OfflineDB', operation: 'runAutomatedCleanup', deletedItems: result.deletedItems, freedSpace: result.freedSpace });
    
    return result;
  }
}

// Singleton instance
export const offlineDB = new OfflineDB();

// Utility functions
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateQueueId(): string {
  return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Export for testing and debugging
export { OfflineDB, CompressionUtils };
