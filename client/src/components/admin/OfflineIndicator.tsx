import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== 'undefined' ? window.navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white shadow-lg"
          data-testid="offline-indicator"
        >
          <div className="flex items-center justify-center gap-3 px-4 py-3">
            <WifiOff className="h-5 w-5 animate-pulse" aria-hidden="true" />
            <span className="font-semibold text-sm md:text-base">
              No internet connection
            </span>
            <Wifi className="h-5 w-5 opacity-30" aria-hidden="true" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
