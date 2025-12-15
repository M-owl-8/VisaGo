'use client';

import { AnimatePresence } from 'framer-motion';
import { useToastStore } from '@/lib/stores/toast';
import { Toast } from './Toast';
import { LiveRegion } from '@/components/a11y/LiveRegion';
import { useMemo } from 'react';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  // Generate screen reader announcement from latest toast
  const latestAnnouncement = useMemo(() => {
    if (toasts.length === 0) return '';
    const latest = toasts[toasts.length - 1];
    const prefix = latest.variant === 'error' ? 'Error: ' : latest.variant === 'success' ? 'Success: ' : '';
    return `${prefix}${latest.message}`;
  }, [toasts]);

  return (
    <>
      <div
        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none md:bottom-4 md:right-4"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast toast={toast} onDismiss={removeToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Screen reader announcements */}
      <LiveRegion message={latestAnnouncement} politeness="polite" />
    </>
  );
}

