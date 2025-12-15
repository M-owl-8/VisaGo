import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { NetworkStatus } from '@/components/ui/NetworkStatus';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-jakarta',
  display: 'swap',
});

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ketdik — Visa Application Workspace',
  description:
    'Premium visa application management for travelers in Uzbekistan. Track documents, chat with AI, and stay synced with mobile.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Ketdik — Visa Application Workspace',
    description:
      'Manage every visa journey from one premium dashboard. Synced with the Ketdik mobile app.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${grotesk.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#040816" />
      </head>
      <body className="bg-background font-sans text-primary-900 antialiased">
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
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('[SW] Registered:', reg.scope))
                    .catch(err => console.error('[SW] Registration failed:', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
