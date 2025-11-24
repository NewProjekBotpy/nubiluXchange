// Initialize Sentry first
import { initSentry } from "./lib/sentry";
initSentry();

import { logInfo, logError } from '@/lib/logger';
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { 
  registerServiceWorker, 
  requestNotificationPermission, 
  setupPWAInstallPrompt,
  isPWA 
} from "./utils/sw-registration";
import { captureError } from "./lib/sentry";
import { hydrateFromIndexedDB, setupSyncInvalidation } from "./lib/offline-query";
import { queryClient } from "./lib/queryClient";
import { syncQueue } from "./lib/sync-queue";
import { offlineDB } from "./lib/offline-db";

// Initialize PWA features
async function initializePWA() {
  try {
    // Initialize IndexedDB first
    logInfo('[Offline] Initializing IndexedDB');
    await offlineDB.init();
    logInfo('[Offline] IndexedDB initialized');
    
    // Register service worker
    const registration = await registerServiceWorker();
    
    if (registration) {
      logInfo('PWA: Service worker registered');
      
      // Request notification permission if running as PWA
      if (isPWA()) {
        await requestNotificationPermission();
      }
    }
    
    // Setup PWA install prompt
    setupPWAInstallPrompt();
    
    // Initialize offline functionality
    logInfo('[Offline] Initializing offline features');
    
    // Hydrate queries from IndexedDB
    await hydrateFromIndexedDB(queryClient);
    
    // Setup sync invalidation
    setupSyncInvalidation(queryClient);
    
    // Initialize and start sync queue processing
    logInfo('[Offline] Initializing sync queue');
    await syncQueue.init();
    
    // Process any pending items in the queue
    const queueStats = await syncQueue.getStats();
    if (queueStats.pending > 0 || queueStats.processing > 0) {
      logInfo(`[Offline] Found ${queueStats.pending} pending items, processing...`);
      syncQueue.processQueue().catch(err => {
        logError('[Offline] Queue processing failed', err as Error);
      });
    }
    
    // Start auto-processing on network status changes
    syncQueue.startAutoProcessing();
    
    logInfo('[Offline] Offline features initialized');
    
  } catch (error) {
    logError('PWA initialization failed', error as Error);
    captureError(error as Error, { context: 'PWA_INITIALIZATION' });
  }
}

// Initialize app
createRoot(document.getElementById("root")!).render(<App />);

// Initialize PWA features after app render
initializePWA();
