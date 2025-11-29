'use client';

import { useEffect, useState } from 'react';
import { initializeI18n } from '../lib/i18n';
import { useAuthStore } from '../lib/stores/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [i18nReady, setI18nReady] = useState(false);
  const { initializeApp } = useAuthStore();

  useEffect(() => {
    // Initialize i18n and auth in parallel
    Promise.all([
      initializeI18n().catch((err) => {
        console.warn('Failed to initialize i18n:', err);
        // Continue even if i18n fails
      }),
      initializeApp().catch((err) => {
        console.warn('Failed to initialize app:', err);
        // Continue even if auth init fails
      }),
    ]).then(() => {
      setI18nReady(true);
      setMounted(true);
    });
  }, [initializeApp]);

  // Prevent hydration mismatch and ensure i18n is ready before rendering
  if (!mounted || !i18nReady) {
    return null;
  }

  return <>{children}</>;
}
