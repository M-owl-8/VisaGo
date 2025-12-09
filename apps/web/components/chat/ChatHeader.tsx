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
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary-dark/20 sm:h-12 sm:w-12">
          <Bot size={20} className="text-primary sm:size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-semibold text-white sm:text-2xl md:text-3xl">
            {t('chat.aiAssistant', 'AI Assistant')}
          </h1>
          <p className="mt-0.5 text-xs text-white/60 sm:mt-1 sm:text-sm">
            {t(
              'chat.subtitle',
              'Ask questions about your visas, documents, and requirements.'
            )}
          </p>
        </div>
      </div>

      {/* Application Context Pill */}
      {applicationContext && (
        <div className="mt-3 sm:mt-4">
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary sm:px-3 sm:py-1.5 sm:text-xs"
          >
            <span className="truncate">
              {applicationContext.country?.name || t('common.unknown', 'Unknown')} •{' '}
              {applicationContext.visaType?.name || t('common.unknown', 'Unknown')} •{' '}
              {applicationContext.status}
            </span>
          </Badge>
        </div>
      )}
    </div>
  );
}

