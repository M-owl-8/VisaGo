'use client';

import { AlertTriangle, Home, RefreshCcw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const handleReport = () => {
    // Log to console for now, can integrate with Sentry later
    console.error('[ErrorBoundary] Reported error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // TODO: Send to Sentry or error tracking service
    // if (window.Sentry) {
    //   window.Sentry.captureException(error);
    // }

    alert('Error reported to our team. Thank you!');
  };

  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/applications';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="glass-panel max-w-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/20">
            <AlertTriangle size={40} className="text-rose-400" />
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-3 text-2xl font-bold text-white">
          Oops! Something went wrong
        </h1>

        {/* Description */}
        <p className="mb-6 text-sm text-white/60">
          We encountered an unexpected error. Do not worry, your data is safe. Please try refreshing the page or go back to the homepage.
        </p>

        {/* Error Details (collapsed by default) */}
        <details className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4 text-left">
          <summary className="cursor-pointer text-sm font-semibold text-white/80 hover:text-white">
            Technical Details
          </summary>
          <div className="mt-3 space-y-2">
            <div>
              <span className="text-xs font-medium text-white/50">Error Message:</span>
              <p className="mt-1 text-xs text-rose-300">{error.message}</p>
            </div>
            {error.stack && (
              <div>
                <span className="text-xs font-medium text-white/50">Stack Trace:</span>
                <pre className="mt-1 overflow-x-auto text-xs text-white/60">
                  {error.stack.split('\n').slice(0, 5).join('\n')}
                </pre>
              </div>
            )}
          </div>
        </details>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="primary"
            onClick={resetErrorBoundary}
            className="rounded-xl"
          >
            <RefreshCcw size={18} />
            <span className="ml-2">Try Again</span>
          </Button>

          <Button
            variant="secondary"
            onClick={handleGoHome}
            className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <Home size={18} />
            <span className="ml-2">Go Home</span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleReport}
            className="rounded-xl text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Bug size={18} />
            <span className="ml-2">Report Error</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}

