'use client';

import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';

interface ChatHeaderProps {
  applicationContext?: {
    country?: { name: string; code: string };
    visaType?: { name: string };
    status: string;
  };
}

export function ChatHeader({ applicationContext }: ChatHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary-dark/20">
          <Bot size={24} className="text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
            {t('chat.aiAssistant', 'AI Assistant')}
          </h1>
          <p className="mt-1 text-sm text-white/60">
            {t(
              'chat.subtitle',
              'Ask questions about your visas, documents, and requirements.'
            )}
          </p>
        </div>
      </div>

      {/* Application Context Pill */}
      {applicationContext && (
        <div className="mt-4">
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
          >
            {applicationContext.country?.name || 'Unknown'} •{' '}
            {applicationContext.visaType?.name || 'Unknown'} •{' '}
            {applicationContext.status}
          </Badge>
        </div>
      )}
    </div>
  );
}

