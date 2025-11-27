'use client';

import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout';

export default function SupportPage() {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('helpSupport.title')}</h1>

        <div className="mb-6 rounded-lg bg-blue-50 p-6">
          <h2 className="mb-2 text-lg font-semibold">{t('helpSupport.needHelp')}</h2>
          <p className="text-gray-700">{t('helpSupport.supportAvailable')}</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-2 font-semibold">{t('helpSupport.emailSupport')}</h3>
            <a
              href={`mailto:${t('helpSupport.supportEmail')}`}
              className="text-primary-600 hover:text-primary-700"
            >
              {t('helpSupport.supportEmail')}
            </a>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-2 font-semibold">{t('helpSupport.phoneSupport')}</h3>
            <a
              href={`tel:${t('helpSupport.supportPhone')}`}
              className="text-primary-600 hover:text-primary-700"
            >
              {t('helpSupport.supportPhone')}
            </a>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-2 font-semibold">{t('helpSupport.telegramSupportTitle')}</h3>
            <a
              href="https://t.me/Ketdikuz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700"
            >
              {t('helpSupport.telegramSupportSubtitle')}
            </a>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-2 font-semibold">{t('helpSupport.whatsappSupportTitle')}</h3>
            <a
              href={`https://wa.me/998997614313`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700"
            >
              {t('helpSupport.whatsappSupportSubtitle')}
            </a>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-2 font-semibold">{t('helpSupport.instagramSupportTitle')}</h3>
            <a
              href="https://instagram.com/_ketdik"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700"
            >
              {t('helpSupport.instagramSupportSubtitle')}
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}


