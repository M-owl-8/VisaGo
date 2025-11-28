'use client';

import { useEffect, useState } from 'react';
import { initializeI18n } from '../lib/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    // Initialize i18n first, then mark as mounted
    initializeI18n()
      .then(() => {
        setI18nReady(true);
        setMounted(true);
      })
      .catch((err) => {
        console.warn('Failed to initialize i18n:', err);
        // Still mount even if i18n fails, but translations may not work
        setI18nReady(true);
        setMounted(true);
      });
  }, []);

  // Prevent hydration mismatch and ensure i18n is ready before rendering
  if (!mounted || !i18nReady) {
    return null;
  }

  return <>{children}</>;
}
