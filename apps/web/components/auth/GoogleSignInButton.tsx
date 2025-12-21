'use client';

import { useEffect, useRef, useState } from 'react';
import { Globe } from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              width?: string | number;
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              type?: 'standard' | 'icon';
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onSuccess: (idToken: string) => Promise<void>;
  onError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  disabled = false,
  className = '',
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isLoadingClientId, setIsLoadingClientId] = useState(true);

  // Fetch client ID from API at runtime (works even if not set at build time)
  useEffect(() => {
    const fetchClientId = async () => {
      try {
        // First, check if it's available in build-time env (faster)
        const buildTimeClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (buildTimeClientId && buildTimeClientId.trim() !== '') {
          setClientId(buildTimeClientId);
          setIsLoadingClientId(false);
          return;
        }

        // If not available at build time, fetch from API endpoint
        const response = await fetch('/api/config/google-client-id');
        const data = await response.json();

        if (data.success && data.clientId) {
          setClientId(data.clientId);
        } else {
          // Client ID not configured
          if (process.env.NODE_ENV === 'development') {
            console.warn('[GoogleSignIn] Google Client ID not configured');
            console.warn('[GoogleSignIn] Set NEXT_PUBLIC_GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID in Railway');
          }
        }
      } catch (error) {
        console.error('[GoogleSignIn] Failed to fetch client ID:', error);
        // Silently fail - button will be hidden
      } finally {
        setIsLoadingClientId(false);
      }
    };

    fetchClientId();
  }, []);

  // Initialize Google Sign-In once we have the client ID
  useEffect(() => {
    if (!clientId || clientId.trim() === '' || typeof window === 'undefined') {
      return;
    }

    // Wait for Google Identity Services script to load
    let retryCount = 0;
    const maxRetries = 50; // 5 seconds max wait time

    const checkGoogleLoaded = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: { credential: string }) => {
              if (response.credential) {
                setIsLoading(true);
                try {
                  await onSuccess(response.credential);
                } catch (error) {
                  setIsLoading(false);
                  onError?.(error instanceof Error ? error : new Error(String(error)));
                }
              } else {
                setIsLoading(false);
                onError?.(new Error('No credential received from Google'));
              }
            },
          });

          // Render button
          if (buttonRef.current && !isInitialized) {
            window.google.accounts.id.renderButton(buttonRef.current, {
              theme: 'outline',
              size: 'large',
              width: '100%',
              text: 'signin_with',
              shape: 'rectangular',
              logo_alignment: 'left',
            });
            setIsInitialized(true);
          }
        } catch (error) {
          console.error('[GoogleSignIn] Initialization error:', error);
          onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      } else if (retryCount < maxRetries) {
        // Retry after a short delay if Google script hasn't loaded yet
        retryCount++;
        setTimeout(checkGoogleLoaded, 100);
      } else {
        console.error('[GoogleSignIn] Google Identity Services script failed to load');
        onError?.(new Error('Google Sign-In is not available. Please refresh the page.'));
      }
    };

    // Start checking once we have client ID
    checkGoogleLoaded();
  }, [clientId, onSuccess, onError, isInitialized]);

  // If still loading client ID, show nothing (or a loading state)
  if (isLoadingClientId) {
    return null; // Or you could show a loading spinner
  }

  // If client ID is not available, don't render anything (button will be hidden)
  if (!clientId || clientId.trim() === '') {
    return null;
  }

  // Fallback button if Google script fails to load
  if (!isInitialized && !window.google?.accounts?.id) {
    return (
      <button
        type="button"
        onClick={() => {
          if (window.google?.accounts?.id) {
            window.google.accounts.id.prompt();
          } else {
            onError?.(new Error('Google Sign-In is not available'));
          }
        }}
        disabled={disabled || isLoading}
        className={`flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white/80 shadow-inner shadow-black/20 transition hover:bg-white/10 disabled:opacity-60 ${className}`}
      >
        <Globe size={18} />
        Continue with Google
      </button>
    );
  }

  return (
    <div
      ref={buttonRef}
      className={disabled || isLoading ? 'opacity-60 pointer-events-none' : ''}
    />
  );
}

