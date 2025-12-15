'use client';

import { ReactNode, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { CommandPalette } from '@/components/command/CommandPalette';
import { useCommandPalette } from '@/lib/hooks/useCommandPalette';
import { useAuthStore } from '@/lib/stores/auth';

export function Providers({ children }: { children: ReactNode }) {
  const { isOpen, close } = useCommandPalette();
  const initializeApp = useAuthStore((state) => state.initializeApp);

  // Initialize auth on app startup
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  return (
    <I18nextProvider i18n={i18n}>
      {children}
      <CommandPalette isOpen={isOpen} onClose={close} />
    </I18nextProvider>
  );
}
