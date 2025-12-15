'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Cloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SaveIndicatorProps {
  isSaving?: boolean;
  lastSaved?: Date | null;
  className?: string;
}

export function SaveIndicator({ isSaving = false, lastSaved, className }: SaveIndicatorProps) {
  const [showIndicator, setShowIndicator] = useState(false);
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (isSaving || lastSaved) {
      setShowIndicator(true);

      // Auto-hide after 3 seconds if not saving
      if (!isSaving) {
        const timer = setTimeout(() => {
          setShowIndicator(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isSaving, lastSaved]);

  useEffect(() => {
    if (!lastSaved) return;

    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
      
      if (seconds < 5) {
        setTimeAgo('just now');
      } else if (seconds < 60) {
        setTimeAgo(`${seconds} seconds ago`);
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        setTimeAgo(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setTimeAgo(`${hours} ${hours === 1 ? 'hour' : 'hours'} ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [lastSaved]);

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={`flex items-center gap-2 text-xs ${className || ''}`}
        >
          {isSaving ? (
            <>
              <Cloud size={14} className="animate-pulse text-white/60" />
              <span className="text-white/60">Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-white/60">
                Saved {timeAgo}
              </span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

