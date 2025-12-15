'use client';

import { ReactNode, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { initializeI18n } from '@/lib/i18n';
import { CommandPalette } from '@/components/command/CommandPalette';
import { useCommandPalette } from '@/lib/hooks/useCommandPalette';
import { useAuthStore } from '@/lib/stores/auth';

const INITIALIZATION_TIMEOUT = 5000; // 5 seconds for normal timeout
const MAX_INIT_TIME = 10000; // Absolute max: 10 seconds - force render

export function Providers({ children }: { children: ReactNode }) {
  const { isOpen, close } = useCommandPalette();
  const initializeApp = useAuthStore((state) => state.initializeApp);
  const [i18nReady, setI18nReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize i18n and auth on app startup
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let maxTimeoutId: NodeJS.Timeout;
    let isMounted = true;

    // Absolute failsafe - force render after max time regardless of state
    maxTimeoutId = setTimeout(() => {
      if (isMounted && !i18nReady) {
        console.error('[Providers] MAX TIMEOUT - Forcing render after 10s');
        setI18nReady(true);
        try {
          initializeApp();
        } catch (e) {
          console.error('[Providers] Error in initializeApp (max timeout):', e);
        }
      }
    }, MAX_INIT_TIME);

    const init = async () => {
      try {
        // Set timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (isMounted && !i18nReady) {
            console.error('[Providers] Initialization timeout - proceeding anyway');
            setInitError('Initialization took too long, but continuing...');
            setI18nReady(true);
            try {
              initializeApp();
            } catch (e) {
              console.error('[Providers] Error in initializeApp (timeout):', e);
            }
          }
        }, INITIALIZATION_TIMEOUT);

        // Initialize i18n first with timeout wrapper
        console.log('[Providers] Initializing i18n...');
        
        const i18nPromise = initializeI18n();
        const timeoutPromise = new Promise<void>((resolve) => {
          setTimeout(() => {
            console.warn('[Providers] i18n init taking too long, proceeding...');
            resolve();
          }, INITIALIZATION_TIMEOUT);
        });

        // Race i18n initialization against timeout
        await Promise.race([i18nPromise, timeoutPromise]);
        
        if (isMounted) {
          clearTimeout(timeoutId);
          console.log('[Providers] i18n initialized (or timed out)');
          setI18nReady(true);
          
          // Then initialize auth
          console.log('[Providers] Initializing auth...');
          try {
            initializeApp();
          } catch (e) {
            console.error('[Providers] Error in initializeApp:', e);
          }
        }
      } catch (error) {
        console.error('[Providers] Initialization error:', error);
        if (isMounted) {
          clearTimeout(timeoutId);
          setInitError(error instanceof Error ? error.message : 'Initialization failed');
          setI18nReady(true);
          try {
            initializeApp();
          } catch (e) {
            console.error('[Providers] Error in initializeApp (catch):', e);
          }
        }
      }
    };
    
    // Start initialization with error handling
    init().catch((error) => {
      console.error('[Providers] Unhandled init error:', error);
      if (isMounted) {
        setI18nReady(true);
        try {
          initializeApp();
        } catch (e) {
          console.error('[Providers] Error in initializeApp (unhandled):', e);
        }
      }
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (maxTimeoutId) clearTimeout(maxTimeoutId);
    };
  }, [initializeApp, i18nReady]);

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
