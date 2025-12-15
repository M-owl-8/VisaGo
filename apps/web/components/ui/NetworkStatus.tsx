'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      
      // Show "Back online" message briefly
      setTimeout(() => {
        setShowIndicator(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true); // Keep showing while offline
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't show anything if online and indicator is hidden
  if (isOnline && !showIndicator) return null;

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={`fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 shadow-lg backdrop-blur-sm ${
            isOnline
              ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
              : 'border-amber-500/30 bg-amber-500/20 text-amber-300'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi size={16} />
              <span className="text-xs font-medium">Back online</span>
            </>
          ) : (
            <>
              <WifiOff size={16} />
              <span className="text-xs font-medium">You are offline</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

