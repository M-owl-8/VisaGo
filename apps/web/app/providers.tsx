'use client';

import { useEffect, useState } from 'react';
import { initializeI18n } from '../lib/i18n';
import { useAuthStore } from '../lib/stores/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [i18nReady, setI18nReady] = useState(false);
  const initializeApp = useAuthStore((state) => state.initializeApp);

  useEffect(() => {
    let isMounted = true;

    // Initialize i18n and auth in parallel with timeout
    const initPromises = [
      initializeI18n().catch((err) => {
        console.warn('Failed to initialize i18n:', err);
        // Continue even if i18n fails
      }),
      initializeApp().catch((err) => {
        console.warn('Failed to initialize app:', err);
        // Continue even if auth init fails
      }),
    ];

    // Add a timeout to ensure we don't wait forever
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        console.warn('Initialization timeout - proceeding anyway');
        resolve();
      }, 5000); // 5 second timeout
    });

    Promise.race([
      Promise.all(initPromises),
      timeoutPromise,
    ]).then(() => {
      if (isMounted) {
        setI18nReady(true);
        setMounted(true);
      }
    }).catch((err) => {
      console.error('Initialization error:', err);
      // Still mount even if there's an error
      if (isMounted) {
        setI18nReady(true);
        setMounted(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [initializeApp]); // Include initializeApp - Zustand selector returns stable reference

  // Prevent hydration mismatch and ensure i18n is ready before rendering
  if (!mounted || !i18nReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center text-white">
          <div className="mb-4 text-2xl font-bold">Ketdik</div>
          <div className="text-white/60">Loading...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
