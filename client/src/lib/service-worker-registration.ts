// Service Worker Registration and Management
import { logger } from '@/lib/logger';

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    logger.info('[SW] Service Worker not supported', { component: 'ServiceWorkerRegistration' });
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    logger.info('[SW] Service Worker registered successfully', { component: 'ServiceWorkerRegistration', scope: registration.scope });

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      if (newWorker) {
        logger.info('[SW] New Service Worker installing...', { component: 'ServiceWorkerRegistration' });
        
        newWorker.addEventListener('statechange', () => {
          logger.info('[SW] Service Worker state', { component: 'ServiceWorkerRegistration', state: newWorker.state });
          
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available, prompt user to refresh
            logger.info('[SW] New content available, please refresh', { component: 'ServiceWorkerRegistration' });
            
            // You can show a toast notification here
            if ('BroadcastChannel' in window) {
              const channel = new BroadcastChannel('sw-messages');
              channel.postMessage({
                type: 'SW_UPDATE_AVAILABLE',
                message: 'Versi baru tersedia! Refresh untuk mendapatkan update.'
              });
            }
          }
        });
      }
    });

    // Check for updates every hour
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    return registration;
  } catch (error) {
    logger.error('[SW] Service Worker registration failed', { component: 'ServiceWorkerRegistration', error });
    return null;
  }
}

export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (registration) {
      const success = await registration.unregister();
      logger.info('[SW] Service Worker unregistered', { component: 'ServiceWorkerRegistration', success });
      return success;
    }
    
    return false;
  } catch (error) {
    logger.error('[SW] Service Worker unregistration failed', { component: 'ServiceWorkerRegistration', error });
    return false;
  }
}

export function skipWaiting(): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
}

export function clearCache(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      if (event.data.type === 'CACHE_CLEARED') {
        logger.info('[SW] Cache cleared successfully', { component: 'ServiceWorkerRegistration' });
        resolve();
      } else if (event.data.type === 'CACHE_CLEAR_FAILED') {
        logger.error('[SW] Cache clear failed', { component: 'ServiceWorkerRegistration', error: event.data.error });
        reject(new Error(event.data.error));
      }
    };

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    } else {
      reject(new Error('No service worker controller'));
    }
  });
}

export function requestSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      if (event.data.type === 'SYNC_REGISTERED' || event.data.type === 'SYNC_STARTING') {
        logger.info('[SW] Sync requested', { component: 'ServiceWorkerRegistration', type: event.data.type });
        resolve();
      } else if (event.data.type === 'SYNC_FAILED') {
        logger.error('[SW] Sync failed', { component: 'ServiceWorkerRegistration', error: event.data.error });
        reject(new Error(event.data.error));
      }
    };

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(
        { type: 'SYNC_NOW' },
        [messageChannel.port2]
      );
    } else {
      reject(new Error('No service worker controller'));
    }
  });
}

// Listen for SW update available notifications
if ('BroadcastChannel' in window) {
  const channel = new BroadcastChannel('sw-messages');
  
  channel.addEventListener('message', (event) => {
    if (event.data.type === 'SW_UPDATE_AVAILABLE') {
      logger.info('[SW] Update available message', { component: 'ServiceWorkerRegistration', message: event.data.message });
      // You can dispatch a custom event here to show UI notification
      window.dispatchEvent(new CustomEvent('swUpdateAvailable', {
        detail: { message: event.data.message }
      }));
    }
  });
}
