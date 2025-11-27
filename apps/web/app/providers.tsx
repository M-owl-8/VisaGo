'use client';

import { useEffect, useState } from 'react';

// Import i18n to ensure it's initialized
import '../lib/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted after client-side hydration
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}
