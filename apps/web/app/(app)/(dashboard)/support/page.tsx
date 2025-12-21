'use client';

import { useTranslation } from 'react-i18next';
import { Mail, Phone, MessageCircle, MessageSquare, Instagram } from 'lucide-react';

// Force dynamic rendering to prevent build-time evaluation
export const dynamic = 'force-dynamic';

export default function SupportPage() {
  const { t } = useTranslation();

  const supportOptions = [
    {
      icon: Mail,
      title: t('helpSupport.emailSupport'),
      value: t('helpSupport.supportEmail'),
      href: `mailto:${t('helpSupport.supportEmail')}`,
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Phone,
      title: t('helpSupport.phoneSupport'),
      value: t('helpSupport.supportPhone'),
      href: `tel:${t('helpSupport.supportPhone')}`,
      color: 'from-green-500 to-green-600',
    },
    {
      icon: MessageCircle,
      title: t('helpSupport.telegramSupportTitle'),
      value: t('helpSupport.telegramSupportSubtitle'),
      href: 'https://t.me/Ketdikuz',
      color: 'from-cyan-500 to-cyan-600',
      external: true,
    },
    {
      icon: MessageSquare,
      title: t('helpSupport.whatsappSupportTitle'),
      value: t('helpSupport.whatsappSupportSubtitle'),
      href: 'https://wa.me/998997614313',
      color: 'from-emerald-500 to-emerald-600',
      external: true,
    },
    {
      icon: Instagram,
      title: t('helpSupport.instagramSupportTitle'),
      value: t('helpSupport.instagramSupportSubtitle'),
      href: 'https://instagram.com/_ketdik',
      color: 'from-pink-500 to-pink-600',
      external: true,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-white sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold">{t('helpSupport.title', 'Help & Support')}</h1>

      <div className="mb-8 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-6 shadow-[0_25px_55px_rgba(7,12,30,0.6)]">
        <h2 className="mb-2 text-xl font-semibold">{t('helpSupport.needHelp', 'Need help?')}</h2>
        <p className="text-white/80">
          {t(
            'helpSupport.supportAvailable',
            'Our support team is available 24/7 to help you with any questions or issues.'
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {supportOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <a
              key={index}
              href={option.href}
              target={option.external ? '_blank' : undefined}
              rel={option.external ? 'noopener noreferrer' : undefined}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.45)] transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
            >
              <div className="relative z-10">
                <div className={`mb-4 inline-flex rounded-2xl bg-gradient-to-r ${option.color} p-3 shadow-lg`}>
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{option.title}</h3>
                <p className="text-primary transition group-hover:text-white">{option.value}</p>
              </div>
              <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-r ${option.color} opacity-10 blur-2xl transition group-hover:opacity-20`} />
            </a>
          );
        })}
      </div>
    </div>
  );
}
