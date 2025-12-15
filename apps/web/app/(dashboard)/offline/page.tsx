'use client';

import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function OfflinePage() {
  const { t } = useTranslation();

  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="glass-panel max-w-md border border-white/10 bg-white/[0.03] p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20">
            <WifiOff size={40} className="text-amber-400" />
          </div>
        </div>

        <h1 className="mb-3 text-2xl font-bold text-white">
          {t('offline.title', 'You are offline')}
        </h1>
        <p className="mb-6 text-sm text-white/60">
          {t('offline.description', 'Please check your internet connection and try again. Your data is saved locally.')}
        </p>

        <Button variant="primary" onClick={handleRetry} className="w-full">
          <RefreshCcw size={18} />
          <span className="ml-2">{t('offline.retry', 'Try Again')}</span>
        </Button>
      </Card>
    </div>
  );
}

