'use client';

import { useEffect, useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Lazy import i18n only on client side to prevent build-time evaluation
    // This ensures react-i18next's createContext is not called during build
    import('../lib/i18n').catch((err) => {
      console.warn('Failed to initialize i18n:', err);
    });
    
    // Mark as mounted after client-side hydration
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}
