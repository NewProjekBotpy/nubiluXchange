// IndexedDB Integration Tests
// Tests real IndexedDB behavior with happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OfflineDB, STORES, generateTempId } from '../offline-db';
import type { OfflineMessage, OfflineProduct, OfflineTransaction } from '../offline-db';

// Helper function to delete test database
async function deleteTestDB(dbName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      console.warn('Database deletion blocked');
      setTimeout(() => resolve(), 100);
    };
  });
}

describe('OfflineDB Integration Tests', () => {
  let testDB: OfflineDB;
  const TEST_DB_NAME = 'nxe-marketplace-offline';

  beforeEach(async () => {
    // Clean up any existing database
    try {
      await deleteTestDB(TEST_DB_NAME);
    } catch (err) {
      // Ignore errors during cleanup
    }
    testDB = new OfflineDB();
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await deleteTestDB(TEST_DB_NAME);
    } catch (err) {
      // Ignore errors during cleanup
    }
  });

  describe('Fresh Installation (v0→v3)', () => {
    it('should create all required stores on fresh install', async () => {
      const db = await testDB.init();
      
      // Verify all v1-v2 stores exist
      expect(db.objectStoreNames.contains(STORES.MESSAGES)).toBe(true);
      expect(db.objectStoreNames.contains(STORES.PRODUCTS)).toBe(true);
      expect(db.objectStoreNames.contains(STORES.TRANSACTIONS)).toBe(true);
      expect(db.objectStoreNames.contains(STORES.WALLET)).toBe(true);
      expect(db.objectStoreNames.contains(STORES.SYNC_QUEUE)).toBe(true);
      
      // Verify v3 stores exist
      expect(db.objectStoreNames.contains(STORES.METADATA)).toBe(true);
      expect(db.objectStoreNames.contains(STORES.VERSIONS)).toBe(true);
    });

    it('should create all v1 indexes on fresh install', async () => {
      const db = await testDB.init();
      
      const transaction = db.transaction([STORES.MESSAGES], 'readonly');
      const messagesStore = transaction.objectStore(STORES.MESSAGES);
      
      // Verify v1 indexes exist
      expect(messagesStore.indexNames.contains('chatId')).toBe(true);
      expect(messagesStore.indexNames.contains('syncStatus')).toBe(true);
      expect(messagesStore.indexNames.contains('tempId')).toBe(true);
      expect(messagesStore.indexNames.contains('createdAt')).toBe(true);
    });

    it('should create all v2 indexes on fresh install (CRITICAL FIX)', async () => {
      const db = await testDB.init();
      
      // Test messages store
      const msgTransaction = db.transaction([STORES.MESSAGES], 'readonly');
      const messagesStore = msgTransaction.objectStore(STORES.MESSAGES);
      expect(messagesStore.indexNames.contains('lastSynced')).toBe(true);
      
      // Test products store
      const prodTransaction = db.transaction([STORES.PRODUCTS], 'readonly');
      const productsStore = prodTransaction.objectStore(STORES.PRODUCTS);
      expect(productsStore.indexNames.contains('lastSynced')).toBe(true);
      
      // Test transactions store
      const txnTransaction = db.transaction([STORES.TRANSACTIONS], 'readonly');
      const transactionsStore = txnTransaction.objectStore(STORES.TRANSACTIONS);
      expect(transactionsStore.indexNames.contains('lastSynced')).toBe(true);
    });

    it('should allow querying by lastSynced index on fresh install', async () => {
      await testDB.init();
      
      // Add a message with lastSynced
      const testMessage: OfflineMessage = {
        id: 1,
        chatId: 1,
        senderId: 1,
        content: 'Test message',
        messageType: 'text',
        status: 'sent',
        createdAt: new Date().toISOString(),
        syncStatus: 'synced',
        lastSynced: new Date().toISOString(),
      };
      
      await testDB.put(STORES.MESSAGES, testMessage);
      
      // Query by lastSynced index
      const results = await testDB.getAllByIndex<OfflineMessage>(
        STORES.MESSAGES,
        'lastSynced',
        testMessage.lastSynced!
      );
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
      expect(results[0].lastSynced).toBe(testMessage.lastSynced);
    });
  });

  describe('Database v3 Features', () => {
    it('should have v3 stores (METADATA and VERSIONS) available', async () => {
      // Verify v3 stores exist in current schema
      // Note: Actual migration testing would require downgrading to v2 first,
      // which is not supported in the test environment
      
      const db = await testDB.init();
      
      // Verify v3 stores exist
      expect(db.objectStoreNames.contains(STORES.METADATA)).toBe(true);
      expect(db.objectStoreNames.contains(STORES.VERSIONS)).toBe(true);
      
      // Also verify v2 indexes still exist (they should be added regardless of upgrade path)
      const transaction = db.transaction([STORES.MESSAGES, STORES.PRODUCTS, STORES.TRANSACTIONS], 'readonly');
      
      const messagesStore = transaction.objectStore(STORES.MESSAGES);
      expect(messagesStore.indexNames.contains('lastSynced')).toBe(true);
      
      const productsStore = transaction.objectStore(STORES.PRODUCTS);
      expect(productsStore.indexNames.contains('lastSynced')).toBe(true);
      
      const transactionsStore = transaction.objectStore(STORES.TRANSACTIONS);
      expect(transactionsStore.indexNames.contains('lastSynced')).toBe(true);
    });
  });

  describe('CRUD Operations', () => {
    it('should support adding and retrieving messages', async () => {
      await testDB.init();
      
      const testMessage: OfflineMessage = {
        id: 1001,
        chatId: 1,
        senderId: 1,
        content: 'Test message',
        messageType: 'text',
        status: 'sent',
        createdAt: new Date().toISOString(),
        syncStatus: 'synced',
        lastSynced: new Date().toISOString(),
      };
      
      await testDB.put(STORES.MESSAGES, testMessage);
      const retrieved = await testDB.get<OfflineMessage>(STORES.MESSAGES, 1001);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('Test message');
      expect(retrieved?.lastSynced).toBe(testMessage.lastSynced);
    });

    it('should support updating messages with put', async () => {
      await testDB.init();
      
      const message: OfflineMessage = {
        id: 1002,
        chatId: 1,
        senderId: 1,
        content: 'Original',
        messageType: 'text',
        status: 'sent',
        createdAt: new Date().toISOString(),
        syncStatus: 'pending',
      };
      
      await testDB.put(STORES.MESSAGES, message);
      
      // Update with lastSynced
      const updated = { ...message, content: 'Updated', lastSynced: new Date().toISOString(), syncStatus: 'synced' as const };
      await testDB.put(STORES.MESSAGES, updated);
      
      const retrieved = await testDB.get<OfflineMessage>(STORES.MESSAGES, 1002);
      expect(retrieved?.content).toBe('Updated');
      expect(retrieved?.lastSynced).toBeDefined();
      expect(retrieved?.syncStatus).toBe('synced');
    });

    it('should support querying by indexes', async () => {
      await testDB.init();
      
      const message1: OfflineMessage = {
        id: 1003,
        chatId: 10,
        senderId: 1,
        content: 'Message 1',
        messageType: 'text',
        status: 'sent',
        createdAt: new Date().toISOString(),
        syncStatus: 'synced',
        lastSynced: new Date().toISOString(),
      };
      
      const message2: OfflineMessage = {
        id: 1004,
        chatId: 10,
        senderId: 2,
        content: 'Message 2',
        messageType: 'text',
        status: 'sent',
        createdAt: new Date().toISOString(),
        syncStatus: 'synced',
        lastSynced: new Date().toISOString(),
      };
      
      await testDB.put(STORES.MESSAGES, message1);
      await testDB.put(STORES.MESSAGES, message2);
      
      const chatMessages = await testDB.getMessagesByChat(10);
      expect(chatMessages).toHaveLength(2);
    });

    it('should support deleting records', async () => {
      await testDB.init();
      
      const message: OfflineMessage = {
        id: 1005,
        chatId: 1,
        senderId: 1,
        content: 'To be deleted',
        messageType: 'text',
        status: 'sent',
        createdAt: new Date().toISOString(),
        syncStatus: 'synced',
      };
      
      await testDB.put(STORES.MESSAGES, message);
      await testDB.delete(STORES.MESSAGES, 1005);
      
      const retrieved = await testDB.get<OfflineMessage>(STORES.MESSAGES, 1005);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Index Queries with lastSynced', () => {
    it('should query products by lastSynced index', async () => {
      await testDB.init();
      
      const syncTime = new Date().toISOString();
      const product: OfflineProduct = {
        id: 1,
        title: 'Test Product',
        description: 'Description',
        price: '100',
        category: 'electronics',
        sellerId: 1,
        stock: 10,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastFetched: new Date().toISOString(),
        syncStatus: 'synced',
        lastSynced: syncTime,
      };
      
      await testDB.add(STORES.PRODUCTS, product);
      
      const results = await testDB.getAllByIndex<OfflineProduct>(
        STORES.PRODUCTS,
        'lastSynced',
        syncTime
      );
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    it('should query transactions by lastSynced index', async () => {
      await testDB.init();
      
      const syncTime = new Date().toISOString();
      const transaction: OfflineTransaction = {
        id: 1,
        buyerId: 1,
        sellerId: 2,
        productId: 1,
        amount: '100',
        status: 'completed',
        createdAt: new Date().toISOString(),
        syncStatus: 'synced',
        lastSynced: syncTime,
      };
      
      await testDB.add(STORES.TRANSACTIONS, transaction);
      
      const results = await testDB.getAllByIndex<OfflineTransaction>(
        STORES.TRANSACTIONS,
        'lastSynced',
        syncTime
      );
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve message conflicts by tempId', async () => {
      await testDB.init();
      
      const tempId = generateTempId();
      const tempMessage: OfflineMessage = {
        id: tempId,
        chatId: 1,
        senderId: 1,
        content: 'Temp message',
        messageType: 'text',
        status: 'pending',
        tempId,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending',
      };
      
      await testDB.add(STORES.MESSAGES, tempMessage);
      
      // Resolve conflict - replace temp with server ID
      await testDB.resolveMessageConflict(tempId, 123);
      
      // Temp should be gone
      const temp = await testDB.get<OfflineMessage>(STORES.MESSAGES, tempId);
      expect(temp).toBeUndefined();
      
      // Server message should exist
      const server = await testDB.get<OfflineMessage>(STORES.MESSAGES, 123);
      expect(server).toBeDefined();
      expect(server?.content).toBe('Temp message');
      expect(server?.syncStatus).toBe('synced');
    });
  });

  describe('Specialized Methods', () => {
    it('should get pending messages', async () => {
      await testDB.init();
      
      const pending: OfflineMessage = {
        id: 2001,
        chatId: 20,
        senderId: 1,
        content: 'Pending',
        messageType: 'text',
        status: 'pending',
        createdAt: new Date().toISOString(),
        syncStatus: 'pending',
      };
      
      const synced: OfflineMessage = {
        id: 2002,
        chatId: 20,
        senderId: 1,
        content: 'Synced',
        messageType: 'text',
        status: 'sent',
        createdAt: new Date().toISOString(),
        syncStatus: 'synced',
      };
      
      await testDB.put(STORES.MESSAGES, pending);
      await testDB.put(STORES.MESSAGES, synced);
      
      const pendingMessages = await testDB.getPendingMessages();
      expect(pendingMessages.length).toBeGreaterThanOrEqual(1);
      expect(pendingMessages.some(m => m.content === 'Pending')).toBe(true);
    });

    it('should get products by category', async () => {
      await testDB.init();
      
      const product1: OfflineProduct = {
        id: 3001,
        title: 'Phone',
        description: 'A phone',
        price: '500',
        category: 'electronics-test',
        sellerId: 1,
        stock: 5,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastFetched: new Date().toISOString(),
        syncStatus: 'synced',
      };
      
      const product2: OfflineProduct = {
        id: 3002,
        title: 'Shirt',
        description: 'A shirt',
        price: '50',
        category: 'clothing-test',
        sellerId: 1,
        stock: 10,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastFetched: new Date().toISOString(),
        syncStatus: 'synced',
      };
      
      await testDB.put(STORES.PRODUCTS, product1);
      await testDB.put(STORES.PRODUCTS, product2);
      
      const electronics = await testDB.getProductsByCategory('electronics-test');
      expect(electronics).toHaveLength(1);
      expect(electronics[0].title).toBe('Phone');
    });
  });

  describe('Database Version', () => {
    it('should initialize with version 3 (with v3 features)', async () => {
      const db = await testDB.init();
      expect(db.version).toBe(3);
      
      // Verify v3 stores exist
      expect(db.objectStoreNames.contains(STORES.METADATA)).toBe(true);
      expect(db.objectStoreNames.contains(STORES.VERSIONS)).toBe(true);
    });
  });
});
