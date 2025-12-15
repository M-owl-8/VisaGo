'use client';

import { ReactNode, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { initializeI18n } from '@/lib/i18n';
import { CommandPalette } from '@/components/command/CommandPalette';
import { useCommandPalette } from '@/lib/hooks/useCommandPalette';
import { useAuthStore } from '@/lib/stores/auth';

const INITIALIZATION_TIMEOUT = 10000; // 10 seconds max

export function Providers({ children }: { children: ReactNode }) {
  const { isOpen, close } = useCommandPalette();
  const initializeApp = useAuthStore((state) => state.initializeApp);
  const [i18nReady, setI18nReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize i18n and auth on app startup
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const init = async () => {
      try {
        // Set timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.error('[Providers] Initialization timeout - proceeding anyway');
            setInitError('Initialization took too long, but continuing...');
            setI18nReady(true);
            initializeApp();
          }
        }, INITIALIZATION_TIMEOUT);

        // Initialize i18n first
        console.log('[Providers] Initializing i18n...');
        await initializeI18n();
        
        if (isMounted) {
          clearTimeout(timeoutId);
          console.log('[Providers] i18n initialized successfully');
          setI18nReady(true);
          
          // Then initialize auth (which may use i18n for error messages)
          console.log('[Providers] Initializing auth...');
          initializeApp();
        }
      } catch (error) {
        console.error('[Providers] Initialization error:', error);
        if (isMounted) {
          clearTimeout(timeoutId);
          setInitError(error instanceof Error ? error.message : 'Initialization failed');
          // Still set ready to true so app can render (with fallback translations)
          setI18nReady(true);
          initializeApp();
        }
      }
    };
    
    init();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [initializeApp]);

  // Don't render children until i18n is ready to prevent translation issues
  if (!i18nReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center text-white">
          <div className="mb-4 text-2xl font-bold">Ketdik</div>
          <div className="text-white/60">Loading...</div>
          {initError && (
            <div className="mt-4 text-sm text-yellow-400">{initError}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
      <CommandPalette isOpen={isOpen} onClose={close} />
    </I18nextProvider>
  );
}
