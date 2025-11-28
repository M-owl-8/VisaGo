'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // In production, send to error tracking service
      // Example: Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-500/10 p-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
        </div>

        <h1 className="mb-4 text-2xl font-bold text-white">
          {t('errors.somethingWentWrong', 'Something went wrong')}
        </h1>

        <p className="mb-6 text-neutral-400">
          {t(
            'errors.unexpectedError',
            'An unexpected error occurred. Please try again or return to the home page.'
          )}
        </p>

        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-left">
            <p className="mb-2 text-sm font-semibold text-red-400">Error Details:</p>
            <p className="text-xs text-red-300">{error.message}</p>
            {error.stack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-red-400">Stack trace</summary>
                <pre className="mt-2 overflow-auto text-xs text-red-300">{error.stack}</pre>
              </details>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="primary"
            onClick={reset}
            className="flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            {t('errors.tryAgain', 'Try again')}
          </Button>

          <Button
            variant="secondary"
            asChild
            className="flex items-center justify-center gap-2"
          >
            <Link href="/applications">
              <Home size={18} />
              {t('errors.goHome', 'Go home')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

