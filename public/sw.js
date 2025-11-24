// Enhanced Service Worker for NXE Marketplace Offline-First PWA
// Version 3.0: Periodic sync, segmented caching, streaming preload, analytics buffering

const CACHE_VERSION = 'v3.0';
const CACHE_NAMES = {
  STATIC: `nxe-static-${CACHE_VERSION}`,
  DYNAMIC: `nxe-dynamic-${CACHE_VERSION}`,
  PRODUCTS: `nxe-products-${CACHE_VERSION}`,
  API: `nxe-api-${CACHE_VERSION}`,
  IMAGES: `nxe-images-${CACHE_VERSION}`,
  CRITICAL: `nxe-critical-${CACHE_VERSION}`, // New: Critical resources
};

// Cache segments with fine-grained invalidation
const CACHE_SEGMENTS = {
  FONTS: `${CACHE_NAMES.STATIC}-fonts`,
  ICONS: `${CACHE_NAMES.STATIC}-icons`,
  STYLES: `${CACHE_NAMES.STATIC}-styles`,
  SCRIPTS: `${CACHE_NAMES.STATIC}-scripts`,
  PRODUCT_THUMBNAILS: `${CACHE_NAMES.IMAGES}-products`,
  USER_AVATARS: `${CACHE_NAMES.IMAGES}-avatars`,
};

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Critical resources for streaming preload
const CRITICAL_RESOURCES = [
  '/manifest.json',
  '/icon-192x192.png',
];

// Background sync tags
const SYNC_TAG = 'nxe-sync-queue';
const PERIODIC_SYNC_TAG = 'nxe-periodic-sync';
const ANALYTICS_SYNC_TAG = 'nxe-analytics-sync';

// Analytics buffer
let analyticsBuffer = [];
const MAX_ANALYTICS_BUFFER = 100;

// Install event - cache static resources with streaming preload
self.addEventListener('install', (event) => {
  console.log('[SW v3.0] Installing service worker...');
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAMES.STATIC)
        .then((cache) => {
          console.log('[SW v3.0] Caching static assets');
          return cache.addAll(STATIC_ASSETS.map(url => new Request(url, {
            cache: 'reload'
          })));
        }),
      // Streaming preload for critical resources
      streamingPreloadCriticalResources(),
    ])
    .then(() => {
      console.log('[SW v3.0] Static assets and critical resources cached');
      return self.skipWaiting();
    })
    .catch((error) => {
      console.error('[SW v3.0] Cache installation failed:', error);
    })
  );
});

// Streaming preload for critical resources
async function streamingPreloadCriticalResources() {
  const cache = await caches.open(CACHE_NAMES.CRITICAL);
  
  for (const url of CRITICAL_RESOURCES) {
    try {
      const response = await fetch(url, { cache: 'reload' });
      
      if (response && response.status === 200) {
        // Stream the response to cache while reading it
        const clonedResponse = response.clone();
        cache.put(url, clonedResponse);
        
        console.log('[SW v3.0] Preloaded critical resource:', url);
      }
    } catch (error) {
      console.warn('[SW v3.0] Failed to preload critical resource:', url, error);
    }
  }
}

// Activate event - clean up old caches with fine-grained invalidation
self.addEventListener('activate', (event) => {
  console.log('[SW v3.0] Activating service worker...');
  event.waitUntil(
    Promise.all([
      cleanupOldCaches(),
      self.clients.claim(),
      registerPeriodicSync(),
    ])
  );
  console.log('[SW v3.0] Service worker activated');
});

// Clean up old caches with segmented approach
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [
    ...Object.values(CACHE_NAMES),
    ...Object.values(CACHE_SEGMENTS),
  ];
  
  const deletions = cacheNames
    .filter(cacheName => !currentCaches.includes(cacheName))
    .map(cacheName => {
      console.log('[SW v3.0] Deleting old cache:', cacheName);
      return caches.delete(cacheName);
    });
  
  return Promise.all(deletions);
}

// Register periodic background sync
async function registerPeriodicSync() {
  try {
    // Periodic sync is only available in some browsers
    if ('periodicSync' in self.registration) {
      await self.registration.periodicSync.register(PERIODIC_SYNC_TAG, {
        minInterval: 24 * 60 * 60 * 1000, // 24 hours
      });
      console.log('[SW v3.0] Periodic sync registered');
    } else {
      console.log('[SW v3.0] Periodic sync not supported');
    }
  } catch (error) {
    console.error('[SW v3.0] Periodic sync registration failed:', error);
  }
}

// Fetch event - apply caching strategies with segmented caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { url, method } = request;

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip Chrome extensions
  if (request.url.startsWith('chrome-extension:')) {
    return;
  }

  // Buffer analytics requests
  if (isAnalyticsRequest(url)) {
    event.respondWith(bufferAnalyticsRequest(request));
    return;
  }

  // Handle non-GET requests (mutations)
  if (method !== 'GET') {
    event.respondWith(handleMutationRequest(request));
    return;
  }

  // Apply strategy based on request type with segmented caching
  if (isStaticAsset(url)) {
    const segment = getStaticAssetSegment(url);
    event.respondWith(cacheFirst(request, segment));
  } else if (isProductRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.PRODUCTS));
  } else if (isAPIReadRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.API));
  } else if (isImageRequest(request)) {
    const segment = getImageSegment(url);
    event.respondWith(cacheFirst(request, segment));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(networkFirst(request, CACHE_NAMES.DYNAMIC));
  }
});

// Get static asset segment for fine-grained caching
function getStaticAssetSegment(url) {
  if (url.match(/\.(woff|woff2|ttf|eot)$/i)) return CACHE_SEGMENTS.FONTS;
  if (url.includes('/icon-')) return CACHE_SEGMENTS.ICONS;
  if (url.match(/\.css$/i)) return CACHE_SEGMENTS.STYLES;
  if (url.match(/\.js$/i)) return CACHE_SEGMENTS.SCRIPTS;
  return CACHE_NAMES.STATIC;
}

// Get image segment for fine-grained caching
function getImageSegment(url) {
  if (url.includes('/products/') || url.includes('product')) return CACHE_SEGMENTS.PRODUCT_THUMBNAILS;
  if (url.includes('/avatar') || url.includes('user')) return CACHE_SEGMENTS.USER_AVATARS;
  return CACHE_NAMES.IMAGES;
}

// Strategy 1: Cache First (for static assets and images)
async function cacheFirst(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW v3.0] Cache hit:', request.url);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW v3.0] Cache first failed:', error);
    
    if (request.destination === 'image' || isImageRequest(request)) {
      return createPlaceholderImage();
    }
    
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline.html');
      if (offlineResponse) return offlineResponse;
    }
    
    throw error;
  }
}

// Strategy 2: Stale While Revalidate (for API reads and products)
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const networkFetch = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log('[SW v3.0] Network fetch failed:', request.url, error.message);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    });

  if (cachedResponse) {
    console.log('[SW v3.0] Serving stale, revalidating:', request.url);
    return cachedResponse;
  }

  return networkFetch;
}

// Strategy 3: Network First (for dynamic content)
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW v3.0] Network first failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Handle mutation requests (POST, PUT, PATCH, DELETE)
async function handleMutationRequest(request) {
  try {
    const response = await fetch(request);
    
    notifyClients({
      type: 'SYNC_SUCCESS',
      url: request.url,
      method: request.method,
    });
    
    return response;
  } catch (error) {
    console.log('[SW v3.0] Mutation failed, queuing for background sync:', request.url);
    
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' && request.method !== 'HEAD' 
        ? await request.clone().text() 
        : null,
    };
    
    notifyClients({
      type: 'SYNC_QUEUED',
      request: requestData,
    });
    
    if ('sync' in self.registration) {
      try {
        await self.registration.sync.register(SYNC_TAG);
        console.log('[SW v3.0] Background sync registered');
      } catch (syncError) {
        console.error('[SW v3.0] Background sync registration failed:', syncError);
      }
    }
    
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'Request queued for sync when online',
      queued: true,
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('[SW v3.0] Navigation request failed, serving offline page');
    
    const cachedIndex = await caches.match('/');
    if (cachedIndex) {
      return cachedIndex;
    }
    
    const cachedResponse = await caches.match('/offline.html');
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Buffer analytics requests for later upload
async function bufferAnalyticsRequest(request) {
  try {
    const requestClone = request.clone();
    const body = await requestClone.text();
    
    // Add to buffer
    analyticsBuffer.push({
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
      timestamp: new Date().toISOString(),
    });
    
    // Limit buffer size
    if (analyticsBuffer.length > MAX_ANALYTICS_BUFFER) {
      analyticsBuffer = analyticsBuffer.slice(-MAX_ANALYTICS_BUFFER);
    }
    
    console.log('[SW v3.0] Analytics buffered, buffer size:', analyticsBuffer.length);
    
    // Try to send immediately if online
    if (navigator.onLine) {
      await flushAnalyticsBuffer();
    } else {
      // Register for background sync
      if ('sync' in self.registration) {
        await self.registration.sync.register(ANALYTICS_SYNC_TAG);
      }
    }
    
    return new Response(JSON.stringify({ success: true, buffered: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[SW v3.0] Analytics buffering failed:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Flush analytics buffer
async function flushAnalyticsBuffer() {
  if (analyticsBuffer.length === 0) return;
  
  const bufferCopy = [...analyticsBuffer];
  console.log('[SW v3.0] Flushing analytics buffer:', bufferCopy.length, 'items');
  
  try {
    for (const item of bufferCopy) {
      await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });
    }
    
    // Clear buffer on success
    analyticsBuffer = [];
    console.log('[SW v3.0] Analytics buffer flushed successfully');
  } catch (error) {
    console.error('[SW v3.0] Analytics flush failed:', error);
  }
}

// Background Sync event
self.addEventListener('sync', (event) => {
  console.log('[SW v3.0] Background sync event:', event.tag);
  
  if (event.tag === SYNC_TAG) {
    event.waitUntil(
      processBackgroundSync()
        .then(() => {
          console.log('[SW v3.0] Background sync completed');
          notifyClients({
            type: 'SYNC_COMPLETE',
            success: true,
          });
        })
        .catch((error) => {
          console.error('[SW v3.0] Background sync failed:', error);
          notifyClients({
            type: 'SYNC_FAILED',
            error: error.message,
          });
        })
    );
  } else if (event.tag === ANALYTICS_SYNC_TAG) {
    event.waitUntil(flushAnalyticsBuffer());
  }
});

// Periodic sync event - refresh data when app is idle
self.addEventListener('periodicsync', (event) => {
  console.log('[SW v3.0] Periodic sync event:', event.tag);
  
  if (event.tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(periodicDataRefresh());
  }
});

// Periodic data refresh when app is idle
async function periodicDataRefresh() {
  console.log('[SW v3.0] Starting periodic data refresh...');
  
  try {
    // Refresh critical API data
    const criticalEndpoints = [
      '/api/products?limit=20',
      '/api/user/notifications',
    ];
    
    for (const endpoint of criticalEndpoints) {
      try {
        const response = await fetch(endpoint);
        if (response && response.status === 200) {
          const cache = await caches.open(CACHE_NAMES.API);
          cache.put(endpoint, response.clone());
          console.log('[SW v3.0] Refreshed:', endpoint);
        }
      } catch (error) {
        console.warn('[SW v3.0] Failed to refresh:', endpoint, error);
      }
    }
    
    // Notify clients
    notifyClients({
      type: 'PERIODIC_REFRESH_COMPLETE',
      timestamp: new Date().toISOString(),
    });
    
    console.log('[SW v3.0] Periodic data refresh complete');
  } catch (error) {
    console.error('[SW v3.0] Periodic data refresh failed:', error);
  }
}

// Process background sync via IndexedDB with batch processing
async function processBackgroundSync() {
  try {
    const db = await openOfflineDB();
    const items = await getPendingSyncItems(db);
    
    if (items.length === 0) {
      console.log('[SW v3.0] No items to sync');
      return;
    }
    
    console.log('[SW v3.0] Processing', items.length, 'sync items');
    
    // Batch process items (max 10 at a time)
    const BATCH_SIZE = 10;
    const batches = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }
    
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    
    for (const batch of batches) {
      console.log(`[SW v3.0] Processing batch ${batches.indexOf(batch) + 1}/${batches.length} (${batch.length} items)`);
      
      // Process batch items in parallel
      const results = await Promise.allSettled(
        batch.map(item => processSyncItem(item, db))
      );
      
      results.forEach((result, index) => {
        const item = batch[index];
        processedCount++;
        
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
          console.log(`[SW v3.0] ✓ Synced item ${item.id} (${processedCount}/${items.length})`);
        } else {
          failedCount++;
          const error = result.status === 'rejected' ? result.reason : result.value.error;
          console.error(`[SW v3.0] ✗ Failed to sync item ${item.id}:`, error);
        }
      });
    }
    
    // Notify clients of completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ 
        type: 'SYNC_COMPLETE',
        processed: processedCount,
        success: successCount,
        failed: failedCount
      });
    });
    
    // Trigger sync queue processing in client
    notifyClients({
      type: 'PROCESS_SYNC_QUEUE',
    });
    
    console.log(`[SW v3.0] Background sync complete: ${successCount} succeeded, ${failedCount} failed`);
  } catch (error) {
    console.error('[SW v3.0] Background sync error:', error);
    throw error;
  }
}

// Process individual sync item
async function processSyncItem(item, db) {
  try {
    // Build request headers from stored data
    const headers = {
      'Content-Type': 'application/json',
      ...(item.headers || {}),
    };
    
    // Make the request with original method, url, headers, and body
    const response = await fetch(item.url, {
      method: item.method,
      headers: headers,
      body: item.data ? JSON.stringify(item.data) : undefined,
      credentials: 'include',
    });
    
    if (response.ok) {
      // Parse response data if available
      let data = null;
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      if (contentLength !== '0' && contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (parseError) {
          console.warn('[SW v3.0] Could not parse JSON response:', parseError);
        }
      }
      
      // Mark as completed and remove from queue
      await markSyncItemCompleted(db, item.id);
      
      // Notify clients of success
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_SUCCESS',
          itemId: item.id,
          url: item.url,
          method: item.method,
          data: data
        });
      });
      
      return { success: true, data };
    } else {
      // Handle HTTP error
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[SW v3.0] HTTP ${response.status} for item ${item.id}:`, errorText);
      
      // Mark as failed with retry logic
      await markSyncItemFailed(db, item, `HTTP ${response.status}: ${errorText}`);
      
      return { success: false, error: errorText };
    }
  } catch (error) {
    // Handle network or other errors
    console.error('[SW v3.0] Error syncing item:', error);
    
    // Mark as failed with retry logic
    await markSyncItemFailed(db, item, error.message || 'Unknown error');
    
    return { success: false, error: error.message };
  }
}

// Mark sync item as completed (remove from queue)
async function markSyncItemCompleted(db, itemId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync_queue'], 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const request = store.delete(itemId);
    
    request.onsuccess = () => {
      console.log(`[SW v3.0] Removed completed item ${itemId} from queue`);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// Mark sync item as failed with retry logic
async function markSyncItemFailed(db, item, errorMessage) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync_queue'], 'readwrite');
    const store = transaction.objectStore('sync_queue');
    
    // Increment retry count
    item.retryCount = (item.retryCount || 0) + 1;
    item.lastAttempt = new Date().toISOString();
    item.error = errorMessage;
    
    // Check if max retries reached
    const maxRetries = item.maxRetries || 3;
    if (item.retryCount >= maxRetries) {
      console.error(`[SW v3.0] Max retries (${maxRetries}) reached for item ${item.id}`);
      item.status = 'failed';
      item.nextRetry = undefined; // No more retries
    } else {
      // Calculate exponential backoff delay
      const baseDelay = 1000; // 1 second
      const delay = Math.min(baseDelay * Math.pow(2, item.retryCount), 30000); // Max 30 seconds
      const nextRetryTime = new Date(Date.now() + delay);
      
      item.status = 'pending';
      item.nextRetry = nextRetryTime.toISOString();
      
      console.log(`[SW v3.0] Retry ${item.retryCount}/${maxRetries} scheduled for ${item.id} at ${nextRetryTime.toISOString()}`);
    }
    
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// IndexedDB helper functions
async function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('nxe-marketplace-offline', 3);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getPendingSyncItems(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync_queue'], 'readonly');
    const store = transaction.objectStore('sync_queue');
    const index = store.index('status');
    const request = index.getAll('pending');
    
    request.onsuccess = () => {
      const items = request.result || [];
      items.sort((a, b) => a.priority - b.priority);
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}


// Message handler
self.addEventListener('message', (event) => {
  const { type } = event.data;
  
  console.log('[SW v3.0] Message received:', type);
  
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (type === 'CLEAR_CACHE') {
    handleClearCache(event);
  } else if (type === 'CLEAR_CACHE_SEGMENT') {
    handleClearCacheSegment(event);
  } else if (type === 'SYNC_NOW') {
    handleSyncNow(event);
  } else if (type === 'GET_CACHE_STATS') {
    handleGetCacheStats(event);
  } else if (type === 'FLUSH_ANALYTICS') {
    handleFlushAnalytics(event);
  }
});

async function handleClearCache(event) {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
    }
  } catch (error) {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ 
        type: 'CACHE_CLEAR_FAILED', 
        error: error.message 
      });
    }
  }
}

async function handleClearCacheSegment(event) {
  try {
    const { segment } = event.data;
    const segmentCache = CACHE_SEGMENTS[segment] || segment;
    
    await caches.delete(segmentCache);
    console.log('[SW v3.0] Cache segment cleared:', segmentCache);
    
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ 
        type: 'CACHE_SEGMENT_CLEARED',
        segment: segmentCache
      });
    }
  } catch (error) {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ 
        type: 'CACHE_SEGMENT_CLEAR_FAILED', 
        error: error.message 
      });
    }
  }
}

async function handleSyncNow(event) {
  try {
    if ('sync' in self.registration) {
      await self.registration.sync.register(SYNC_TAG);
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ type: 'SYNC_REGISTERED' });
      }
    } else {
      await processBackgroundSync();
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ type: 'SYNC_STARTING' });
      }
    }
  } catch (error) {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ 
        type: 'SYNC_FAILED', 
        error: error.message 
      });
    }
  }
}

async function handleGetCacheStats(event) {
  try {
    const cacheNames = await caches.keys();
    const stats = {};
    
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      stats[name] = keys.length;
    }
    
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ 
        type: 'CACHE_STATS', 
        stats,
        analyticsBufferSize: analyticsBuffer.length
      });
    }
  } catch (error) {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ 
        type: 'CACHE_STATS_FAILED', 
        error: error.message 
      });
    }
  }
}

async function handleFlushAnalytics(event) {
  try {
    await flushAnalyticsBuffer();
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: 'ANALYTICS_FLUSHED' });
    }
  } catch (error) {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ 
        type: 'ANALYTICS_FLUSH_FAILED', 
        error: error.message 
      });
    }
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW v3.0] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'NXE Marketplace';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icon-192x192.png',
    badge: '/icon-72x72.png',
    data: data.data || {},
    actions: data.actions || [
      { action: 'explore', title: 'Lihat Detail' },
      { action: 'close', title: 'Tutup' }
    ],
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW v3.0] Notification clicked:', event.notification.tag);
  
  event.notification.close();

  if (event.action) {
    console.log('[SW v3.0] Action clicked:', event.action);
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          const url = event.notification.data?.url || '/';
          return clients.openWindow(url);
        }
      })
  );
});

// Helper functions
function isStaticAsset(url) {
  return url.includes('/icon-') ||
         url.includes('/manifest.json') ||
         url.match(/\.(css|woff|woff2|ttf|eot)$/i) ||
         url.includes('fonts.googleapis.com') ||
         url.includes('fonts.gstatic.com');
}

function isProductRequest(url) {
  return url.includes('/api/products');
}

function isAPIReadRequest(url) {
  return url.includes('/api/') &&
         !url.includes('/api/chats/') &&
         !url.includes('/api/wallet');
}

function isImageRequest(request) {
  return request.destination === 'image' || 
         request.url.includes('/uploads/') ||
         request.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

function isAnalyticsRequest(url) {
  return url.includes('/api/analytics') || 
         url.includes('/api/tracking') ||
         url.includes('analytics.google.com') ||
         url.includes('google-analytics.com');
}

function createPlaceholderImage() {
  const svg = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="300" height="200" fill="#e2e8f0"/>
    <text x="50%" y="50%" text-anchor="middle" fill="#64748b" font-family="Arial">
      Image Unavailable
    </text>
  </svg>`;
  
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' }
  });
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => client.postMessage(message));
}

console.log('[SW v3.0] Service Worker loaded');
