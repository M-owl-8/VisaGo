'use client';

import { useTranslation } from 'react-i18next';

// Force dynamic rendering to prevent build-time evaluation
export const dynamic = 'force-dynamic';

export default function SupportPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-white sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">{t('helpSupport.title')}</h1>

      <div className="mb-6 rounded-3xl border border-primary/20 bg-primary/10 p-6 shadow-[0_25px_55px_rgba(7,12,30,0.6)]">
        <h2 className="mb-2 text-lg font-semibold">{t('helpSupport.needHelp')}</h2>
        <p className="text-white/80">{t('helpSupport.supportAvailable')}</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
          <h3 className="mb-2 font-semibold">{t('helpSupport.emailSupport')}</h3>
          <a
            href={`mailto:${t('helpSupport.supportEmail')}`}
            className="text-primary hover:text-white"
          >
            {t('helpSupport.supportEmail')}
          </a>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
          <h3 className="mb-2 font-semibold">{t('helpSupport.phoneSupport')}</h3>
          <a
            href={`tel:${t('helpSupport.supportPhone')}`}
            className="text-primary hover:text-white"
          >
            {t('helpSupport.supportPhone')}
          </a>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
          <h3 className="mb-2 font-semibold">{t('helpSupport.telegramSupportTitle')}</h3>
          <a
            href="https://t.me/Ketdikuz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-white"
          >
            {t('helpSupport.telegramSupportSubtitle')}
          </a>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
          <h3 className="mb-2 font-semibold">{t('helpSupport.whatsappSupportTitle')}</h3>
          <a
            href={`https://wa.me/998997614313`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-white"
          >
            {t('helpSupport.whatsappSupportSubtitle')}
          </a>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
          <h3 className="mb-2 font-semibold">{t('helpSupport.instagramSupportTitle')}</h3>
          <a
            href="https://instagram.com/_ketdik"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-white"
          >
            {t('helpSupport.instagramSupportSubtitle')}
          </a>
        </div>
      </div>
    </div>
  );
}
