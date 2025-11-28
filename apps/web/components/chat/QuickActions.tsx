'use client';

import { useTranslation } from 'react-i18next';

interface QuickActionsProps {
  onSelect: (action: string) => void;
  applicationContext?: {
    country?: { name: string };
  };
}

export function QuickActions({ onSelect, applicationContext }: QuickActionsProps) {
  const { t } = useTranslation();
  const countryName = applicationContext?.country?.name;

  const actions = [
    t('chat.quickAction1', 'Explain my document checklist'),
    countryName
      ? t('chat.quickAction2WithCountry', 'What documents do I need for {{country}}?').replace('{{country}}', countryName)
      : t('chat.quickAction2', 'What documents do I need?'),
    t('chat.quickAction3', 'How can I improve my chances of approval?'),
    t('chat.quickAction4', 'What are common visa application mistakes?'),
    t('chat.quickAction5', 'How long does visa processing take?'),
  ];

  return (
    <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
      {actions.map((action, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(action)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white transition hover:border-white/20 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {action}
        </button>
      ))}
    </div>
  );
}

