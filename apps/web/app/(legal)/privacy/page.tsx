'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Force dynamic rendering to prevent build-time evaluation
export const dynamic = 'force-dynamic';

const sections = [
  { key: 'introduction', defaultTitle: 'Introduction', bodyKey: 'introText' },
  {
    key: 'dataCollection',
    defaultTitle: 'Data Collection',
    bodyKey: 'dataCollectionText',
    listKeys: ['dataItem1', 'dataItem2', 'dataItem3', 'dataItem4'],
  },
  {
    key: 'dataUsage',
    defaultTitle: 'How We Use Your Data',
    bodyKey: 'dataUsageText',
    listKeys: ['usageItem1', 'usageItem2', 'usageItem3', 'usageItem4'],
  },
  { key: 'dataProtection', defaultTitle: 'Data Protection', bodyKey: 'dataProtectionText' },
  { key: 'contact', defaultTitle: 'Contact Us', bodyKey: 'contactText' },
];

export default function PrivacyPage() {
  const { t } = useTranslation();

  const computedSections = useMemo(
    () =>
      sections.map((section) => ({
        title: t(`privacy.${section.key}`, section.defaultTitle),
        body: t(`privacy.${section.bodyKey}`, ''),
        list: section.listKeys?.map((key) => t(`privacy.${key}`)),
      })),
    [t]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{t('privacy.title', 'Privacy Policy')}</h1>
      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600">
          {t('privacy.lastUpdated', 'Last updated:')} {new Date().toLocaleDateString()}
        </p>

        {computedSections.map((section) => (
          <section key={section.title} className="mt-8">
            <h2 className="mb-4 text-2xl font-semibold">{section.title}</h2>
            <p className="text-gray-700">{section.body}</p>
            {section.list && (
              <ul className="mt-4 list-disc pl-6 text-gray-700">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <div className="mt-8 rounded border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            <strong>{t('privacy.note', 'Note:')}</strong>{' '}
            {t(
              'privacy.noteText',
              'This is a template privacy policy. Please replace this content with your actual privacy policy text that complies with applicable laws (GDPR, CCPA, etc.).'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
