'use client';

import { Providers } from '../providers';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { NetworkStatus } from '@/components/ui/NetworkStatus';
import { SkipLink } from '@/components/a11y/SkipLink';

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipLink />
      <ErrorBoundary>
        <Providers>{children}</Providers>
      </ErrorBoundary>
      <ToastContainer />
      <NetworkStatus />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker
                  .register('/sw.js')
                  .then(reg => console.log('[SW] Registered:', reg.scope))
                  .catch(err => console.error('[SW] Registration failed:', err));
              });
            }
          `,
        }}
      />
    </>
  );
}

