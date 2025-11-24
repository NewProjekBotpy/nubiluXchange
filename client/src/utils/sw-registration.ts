// Service Worker Registration Utility
import { logger } from '@/lib/logger';

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      logger.info('Registering service worker...', { component: 'SW-Registration' });
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      logger.info('Service worker registered successfully', { component: 'SW-Registration', scope: registration.scope });

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New content is available, prompt user to refresh
                logger.info('New version available! Please refresh the page.', { component: 'SW-Registration' });
                showUpdateNotification(newWorker);
              } else {
                // Content is cached for the first time
                logger.info('Content is cached for offline use', { component: 'SW-Registration' });
              }
            }
          });
        }
      });

      // Listen for controller change to reload page
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      return registration;
    } catch (error) {
      logger.error('Service worker registration failed', { component: 'SW-Registration', error });
      return null;
    }
  } else {
    logger.info('Service worker not supported', { component: 'SW-Registration' });
    return null;
  }
}

// Show update notification to user
function showUpdateNotification(worker: ServiceWorker) {
  if (confirm('Versi baru aplikasi tersedia! Muat ulang sekarang?')) {
    // Send message to the waiting service worker to skip waiting
    if (worker) {
      worker.postMessage({ type: 'SKIP_WAITING' });
    }
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        // Replace with your VAPID public key
        'BK7dVglqZRvd5bXrJm6d5OkWkAyY4dGkl2q1Rt9x0YFk7FEzP2pGjX3M_NjCqL8QvKjE9tXkD3V4Kz0F1g9x0E4'
      )
    });

    logger.info('Push subscription successful', { component: 'SW-Registration', endpoint: subscription?.endpoint });
    return subscription;
  } catch (error) {
    logger.error('Failed to subscribe to push notifications', { component: 'SW-Registration', error });
    return null;
  }
}

// Convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Check if app is running as PWA
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone ||
         document.referrer.includes('android-app://');
}

// Install PWA prompt
let deferredPrompt: any;

export function setupPWAInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    showInstallPrompt();
  });
}

function showInstallPrompt() {
  // Show your custom install button/prompt
  const installButton = document.getElementById('pwa-install-button');
  if (installButton) {
    installButton.style.display = 'block';
    installButton.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            logger.info('User accepted the A2HS prompt', { component: 'SW-Registration' });
          }
          deferredPrompt = null;
        });
      }
    });
  }
}