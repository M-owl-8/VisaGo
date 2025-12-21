'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleSignInButton } from './GoogleSignInButton';

interface GoogleOAuthSectionProps {
  onSuccess: (idToken: string) => Promise<void>;
  onError: (error: Error) => void;
  disabled?: boolean;
}

/**
 * GoogleOAuthSection - Conditionally renders Google OAuth button and separator
 * Fetches client ID to determine if OAuth is available
 */
export function GoogleOAuthSection({
  onSuccess,
  onError,
  disabled = false,
}: GoogleOAuthSectionProps) {
  const { t } = useTranslation();
  const [hasClientId, setHasClientId] = useState<boolean | null>(null);

  useEffect(() => {
    const checkClientId = async () => {
      try {
        // Check build-time env first
        if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
          setHasClientId(true);
          return;
        }

        // Check runtime API
        const response = await fetch('/api/config/google-client-id');
        const data = await response.json();
        setHasClientId(data.success && !!data.clientId);
      } catch (error) {
        setHasClientId(false);
      }
    };

    checkClientId();
  }, []);

  // Don't render anything if we don't know yet or if client ID is not available
  if (hasClientId === null || hasClientId === false) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-4 text-white/50">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs uppercase tracking-[0.4em]">{t('auth.or', 'Or')}</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <GoogleSignInButton
        onSuccess={onSuccess}
        onError={onError}
        disabled={disabled}
        className="w-full"
      />
    </>
  );
}
