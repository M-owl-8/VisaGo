import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import './globals.css';

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
    icon: '/images/ketdik-icon.png',
    apple: '/images/ketdik-icon.png',
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
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body className="bg-background font-sans text-primary-900 antialiased">{children}</body>
    </html>
  );
}
