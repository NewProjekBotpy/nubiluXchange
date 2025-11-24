// Offline-aware React Query integration
// Provides hooks for offline queries and mutations with IndexedDB caching

import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  QueryKey,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import { offlineDB, STORES, OfflineMessage, OfflineProduct, OfflineWallet, generateTempId } from './offline-db';
import { syncQueue } from './sync-queue';
import { apiRequest } from './queryClient';
import { logger } from './logger';

// Offline-aware query that falls back to IndexedDB when offline
export function useOfflineQuery<TData = any>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'> & {
    cacheStore?: string;
    cacheKey?: string | number;
    offlineFallback?: () => Promise<TData>;
  }
) {
  const isOnline = navigator.onLine;

  return useQuery<TData>({
    queryKey,
    queryFn: async () => {
      try {
        // Try network first
        const data = await queryFn();
        
        // Cache to IndexedDB for offline use
        if (options?.cacheStore && options?.cacheKey) {
          await offlineDB.put(options.cacheStore, {
            id: options.cacheKey,
            ...data,
            lastFetched: new Date().toISOString(),
            syncStatus: 'synced',
          });
        }
        
        return data;
      } catch (error) {
        // If offline and we have a fallback, use it
        if (!isOnline && options?.offlineFallback) {
          logger.info('Using offline fallback', { component: 'useOfflineQuery', operation: 'queryFn', queryKey });
          return options.offlineFallback();
        }
        
        // Try cached version as last resort
        if (options?.cacheStore && options?.cacheKey) {
          const cached = await offlineDB.get(options.cacheStore, options.cacheKey);
          if (cached) {
            logger.info('Using cached data', { component: 'useOfflineQuery', operation: 'queryFn', cacheStore: options.cacheStore, cacheKey: options.cacheKey });
            return cached as TData;
          }
        }
        
        throw error;
      }
    },
    ...options,
  });
}

// Offline-aware messages query
export function useOfflineMessages(chatId: number) {
  return useOfflineQuery(
    [`/api/chats/${chatId}/messages`],
    async () => {
      const response = await apiRequest(`/api/chats/${chatId}/messages`);
      
      // Cache messages to IndexedDB
      if (response && Array.isArray(response)) {
        for (const message of response) {
          await offlineDB.put(STORES.MESSAGES, {
            ...message,
            syncStatus: 'synced' as const,
          });
        }
      }
      
      return response;
    },
    {
      offlineFallback: async () => {
        // Get cached messages from IndexedDB
        const messages = await offlineDB.getMessagesByChat(chatId);
        return messages;
      },
      staleTime: 30000, // 30 seconds
    }
  );
}

// Offline-aware products query
export function useOfflineProducts() {
  return useOfflineQuery(
    ['/api/products'],
    async () => {
      const response = await apiRequest('/api/products');
      
      // Cache products to IndexedDB
      if (response && Array.isArray(response)) {
        for (const product of response) {
          await offlineDB.put(STORES.PRODUCTS, {
            ...product,
            lastFetched: new Date().toISOString(),
            syncStatus: 'synced' as const,
          });
        }
      }
      
      return response;
    },
    {
      offlineFallback: async () => {
        // Get cached products from IndexedDB
        const products = await offlineDB.getAll<OfflineProduct>(STORES.PRODUCTS);
        return products;
      },
      staleTime: 300000, // 5 minutes
    }
  );
}

// Offline-aware wallet query
export function useOfflineWallet(userId: number) {
  return useOfflineQuery(
    [`/api/wallet/${userId}`],
    async () => {
      const response = await apiRequest(`/api/wallet/${userId}`);
      
      // Cache wallet balance to IndexedDB
      if (response) {
        await offlineDB.updateWalletBalance(userId, response.balance, 'synced');
      }
      
      return response;
    },
    {
      offlineFallback: async () => {
        // Get cached wallet from IndexedDB
        const wallet = await offlineDB.getWalletBalance(userId);
        return wallet || { balance: '0', lastUpdated: new Date().toISOString() };
      },
      staleTime: 60000, // 1 minute
    }
  );
}

/**
 * Offline-aware mutation hook that enqueues requests when offline
 * 
 * @param url - The API endpoint URL
 * @param method - HTTP method (POST, PUT, PATCH, DELETE)
 * @param options - Mutation options including optimistic updates and callbacks
 * 
 * @example
 * ```tsx
 * const mutation = useOfflineMutation('/api/messages', 'POST', {
 *   optimisticUpdate: (data) => {
 *     queryClient.setQueryData(['messages'], old => [...old, data]);
 *   },
 *   onSuccess: () => {
 *     queryClient.invalidateQueries(['messages']);
 *   },
 *   queuePriority: 1 // High priority
 * });
 * 
 * mutation.mutate({ content: 'Hello' });
 * ```
 */
export function useOfflineMutation<TData = any, TVariables = any>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'> & {
    optimisticUpdate?: (variables: TVariables) => void;
    onSyncSuccess?: (data: TData) => void;
    queuePriority?: number; // Lower number = higher priority (1 = critical, 5 = standard, 10 = bulk)
    type?: 'message' | 'transaction' | 'wallet' | 'product' | 'generic'; // Queue type for reconciliation
  }
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      try {
        // If online, try network first
        if (navigator.onLine) {
          const data = await apiRequest(url, {
            method: method,
            body: variables as any,
          });
          
          // Call onSyncSuccess if provided
          if (options?.onSyncSuccess) {
            options.onSyncSuccess(data);
          }
          
          return data;
        } else {
          throw new Error('Offline');
        }
      } catch (error) {
        // If offline or network failed, enqueue to sync queue
        logger.info('Offline or network error, enqueueing to sync queue', { component: 'useOfflineMutation', operation: 'mutationFn', url, method });
        
        // Generate temp ID for optimistic updates
        const tempId = generateTempId();
        
        // Apply optimistic update before enqueueing
        if (options?.optimisticUpdate) {
          try {
            options.optimisticUpdate(variables);
          } catch (updateError) {
            logger.error('Optimistic update failed', updateError, { component: 'useOfflineMutation', operation: 'mutationFn' });
          }
        }
        
        // Serialize body data
        const serializedBody = variables;
        
        // Enqueue to sync queue with proper metadata
        const queueItem = await syncQueue.enqueue(
          options?.type || 'generic', // Use provided type or default to 'generic'
          method,
          url,
          serializedBody,
          { 
            tempId,
            priority: options?.queuePriority || 5, // Default to standard priority
          }
        );
        
        // Trigger sync processing if online (for edge cases)
        if (navigator.onLine) {
          syncQueue.processQueue().catch(err => {
            logger.error('Failed to trigger sync', err, { component: 'useOfflineMutation', operation: 'mutationFn' });
          });
        }
        
        // Return optimistic response with tempId
        return {
          tempId,
          queued: true,
          queueId: queueItem,
          ...variables,
        } as TData;
      }
    },
    onSuccess: (data, variables, context) => {
      // Call user-provided onSuccess
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      // Call user-provided onError
      if (options?.onError) {
        options.onError(error, variables, context);
      }
    },
  });
}

// Offline-aware message mutation
export function useOfflineSendMessage(chatId: number) {
  const queryClient = useQueryClient();

  return useOfflineMutation<any, { content: string; messageType?: string }>(
    `/api/chats/${chatId}/messages`,
    'POST',
    {
      type: 'message', // Ensure message-specific reconciliation
      optimisticUpdate: (variables) => {
        // Add optimistic message to cache
        const tempId = generateTempId();
        const optimisticMessage: OfflineMessage = {
          id: tempId,
          chatId,
          senderId: 0, // Will be set by server
          content: variables.content,
          messageType: (variables.messageType as any) || 'text',
          status: 'pending',
          tempId,
          createdAt: new Date().toISOString(),
          syncStatus: 'pending',
        };
        
        // Update React Query cache
        queryClient.setQueryData(
          [`/api/chats/${chatId}/messages`],
          (old: any) => {
            if (!old) return [optimisticMessage];
            return [...old, optimisticMessage];
          }
        );
        
        // Save to IndexedDB (fire and forget to avoid blocking UI)
        offlineDB.put(STORES.MESSAGES, optimisticMessage).catch(err => {
          logger.error('Failed to save optimistic message to IndexedDB', err, { component: 'useOfflineSendMessage', operation: 'optimisticUpdate' });
        });
      },
      onSuccess: (data) => {
        // Invalidate messages query
        queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
      },
      queuePriority: 1, // Messages are high priority
    }
  );
}

// Query persistence helpers
export async function persistQueryData<TData = any>(
  queryKey: QueryKey,
  data: TData,
  store: string
): Promise<void> {
  try {
    const cacheKey = JSON.stringify(queryKey);
    await offlineDB.put(store, {
      id: cacheKey,
      data,
      queryKey,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error persisting query data', error, { component: 'offline-query', operation: 'persistQueryData', store });
  }
}

export async function getPersistedQueryData<TData = any>(
  queryKey: QueryKey,
  store: string
): Promise<TData | null> {
  try {
    const cacheKey = JSON.stringify(queryKey);
    const cached = await offlineDB.get(store, cacheKey);
    return cached ? (cached as any).data : null;
  } catch (error) {
    logger.error('Error getting persisted query data', error, { component: 'offline-query', operation: 'getPersistedQueryData', store });
    return null;
  }
}

// Auto-invalidate queries on sync success
export function setupSyncInvalidation(queryClient: ReturnType<typeof useQueryClient>) {
  if (typeof window === 'undefined') return;

  // Helper to invalidate only offline-synced queries
  const invalidateOfflineQueries = () => {
    // Only invalidate queries that are actually synced offline
    // Exclude admin queries which have their own polling mechanism
    const offlineQueryPrefixes = [
      '/api/chats/',
      '/api/products',
      '/api/wallet/',
      '/api/status',
      '/api/notifications'
    ];

    offlineQueryPrefixes.forEach(prefix => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
          return typeof key === 'string' && key.startsWith(prefix);
        }
      });
    });
  };

  // Listen for sync success events
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_SUCCESS') {
        logger.info('Sync success, invalidating offline queries only', { component: 'offline-query', operation: 'setupSyncInvalidation' });
        invalidateOfflineQueries();
      }
    });
  }

  // Subscribe to sync queue events
  syncQueue.subscribe((stats) => {
    // When queue is empty (all synced), invalidate only offline-related queries
    if (stats.pending === 0 && stats.processing === 0 && stats.total === 0) {
      logger.info('Queue empty, invalidating offline queries only', { component: 'offline-query', operation: 'setupSyncInvalidation' });
      invalidateOfflineQueries();
    }
  });
}

/**
 * Hydrate React Query cache from IndexedDB on app start
 * Restores offline data to provide instant access to cached content
 * 
 * @param queryClient - TanStack Query client instance
 */
export async function hydrateFromIndexedDB(
  queryClient: ReturnType<typeof useQueryClient>
): Promise<void> {
  try {
    logger.info('Starting hydration from IndexedDB', { component: 'offline-query', operation: 'hydrateFromIndexedDB' });
    
    const now = new Date().toISOString();
    const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
    
    // 1. Hydrate Products
    try {
      const products = await offlineDB.getAll<OfflineProduct>(STORES.PRODUCTS);
      if (products.length > 0) {
        // Filter out stale products (older than threshold)
        const freshProducts = products.filter(p => {
          if (!p.lastFetched) return true;
          const age = new Date(now).getTime() - new Date(p.lastFetched).getTime();
          return age < STALE_THRESHOLD_MS;
        });
        
        if (freshProducts.length > 0) {
          queryClient.setQueryData(['/api/products'], freshProducts);
          logger.info('Hydrated products', { component: 'offline-query', operation: 'hydrateFromIndexedDB', count: freshProducts.length });
        } else {
          logger.info('Skipped products (all stale)', { component: 'offline-query', operation: 'hydrateFromIndexedDB' });
        }
      }
    } catch (error) {
      logger.error('Failed to hydrate products', error, { component: 'offline-query', operation: 'hydrateFromIndexedDB' });
    }
    
    // 2. Hydrate Messages by Chat
    try {
      const messages = await offlineDB.getAll<OfflineMessage>(STORES.MESSAGES);
      if (messages.length > 0) {
        // Group messages by chat ID
        const messagesByChat = messages.reduce((acc, msg) => {
          if (!acc[msg.chatId]) acc[msg.chatId] = [];
          acc[msg.chatId].push(msg);
          return acc;
        }, {} as Record<number, OfflineMessage[]>);
        
        // Set query data for each chat with proper cache keys
        let hydratedChats = 0;
        Object.entries(messagesByChat).forEach(([chatId, chatMessages]) => {
          // Filter out very old messages (keep recent ones)
          const recentMessages = chatMessages.filter(msg => {
            if (!msg.createdAt) return true;
            const age = new Date(now).getTime() - new Date(msg.createdAt).getTime();
            return age < STALE_THRESHOLD_MS;
          });
          
          if (recentMessages.length > 0) {
            // Sort by creation date
            recentMessages.sort((a, b) => 
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            
            // Use correct cache key format: ['/api/chats/{chatId}/messages']
            queryClient.setQueryData([`/api/chats/${chatId}/messages`], recentMessages);
            hydratedChats++;
          }
        });
        
        logger.info('Hydrated messages', { component: 'offline-query', operation: 'hydrateFromIndexedDB', chatCount: hydratedChats, messageCount: messages.length });
      }
    } catch (error) {
      logger.error('Failed to hydrate messages', error, { component: 'offline-query', operation: 'hydrateFromIndexedDB' });
    }
    
    // 3. Hydrate Wallet Balance
    try {
      const walletData = await offlineDB.getAll<OfflineWallet>(STORES.WALLET);
      if (walletData.length > 0) {
        let hydratedWallets = 0;
        
        walletData.forEach((wallet) => {
          // Check if data is not too stale
          if (wallet.lastUpdated) {
            const age = new Date(now).getTime() - new Date(wallet.lastUpdated).getTime();
            if (age > STALE_THRESHOLD_MS) {
              logger.debug('Skipped wallet (stale)', { component: 'offline-query', operation: 'hydrateFromIndexedDB', userId: wallet.userId });
              return;
            }
          }
          
          // Use correct cache key format: ['/api/wallet'] 
          // Note: The wallet endpoint should return user's own wallet, not requiring userId in URL
          queryClient.setQueryData(['/api/wallet'], {
            balance: wallet.balance,
            lastUpdated: wallet.lastUpdated,
            syncStatus: wallet.syncStatus,
          });
          
          hydratedWallets++;
        });
        
        if (hydratedWallets > 0) {
          logger.info('Hydrated wallets', { component: 'offline-query', operation: 'hydrateFromIndexedDB', count: hydratedWallets });
        }
      }
    } catch (error) {
      logger.error('Failed to hydrate wallet', error, { component: 'offline-query', operation: 'hydrateFromIndexedDB' });
    }
    
    // 4. Hydrate Transactions (existing implementation)
    try {
      const transactions = await offlineDB.getAll(STORES.TRANSACTIONS);
      if (transactions.length > 0) {
        // Only include synced transactions
        const syncedTransactions = transactions.filter((t: any) => t.syncStatus === 'synced');
        
        // Filter out stale transactions
        const freshTransactions = syncedTransactions.filter((t: any) => {
          if (!t.createdAt) return true;
          const age = new Date(now).getTime() - new Date(t.createdAt).getTime();
          return age < STALE_THRESHOLD_MS;
        });
        
        if (freshTransactions.length > 0) {
          queryClient.setQueryData(['/api/transactions'], freshTransactions);
          logger.info('Hydrated transactions', { component: 'offline-query', operation: 'hydrateFromIndexedDB', count: freshTransactions.length });
        }
      }
    } catch (error) {
      logger.error('Failed to hydrate transactions', error, { component: 'offline-query', operation: 'hydrateFromIndexedDB' });
    }
    
    logger.info('Hydration complete', { component: 'offline-query', operation: 'hydrateFromIndexedDB' });
  } catch (error) {
    logger.error('Critical hydration error', error, { component: 'offline-query', operation: 'hydrateFromIndexedDB' });
  }
}

// Export types for convenience
export type { OfflineMessage, OfflineProduct } from './offline-db';
