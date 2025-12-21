'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Force dynamic rendering to prevent build-time evaluation
export const dynamic = 'force-dynamic';

const termsSections = [
  { key: 'acceptance', defaultTitle: 'Acceptance of Terms', bodyKey: 'acceptanceText' },
  {
    key: 'serviceDescription',
    defaultTitle: 'Service Description',
    bodyKey: 'serviceDescriptionText',
  },
  {
    key: 'userResponsibilities',
    defaultTitle: 'User Responsibilities',
    listKeys: ['responsibility1', 'responsibility2', 'responsibility3', 'responsibility4'],
  },
  {
    key: 'limitationOfLiability',
    defaultTitle: 'Limitation of Liability',
    bodyKey: 'limitationText',
  },
  { key: 'contact', defaultTitle: 'Contact Us', bodyKey: 'contactText' },
];

export default function TermsPage() {
  const { t } = useTranslation();

  const computedSections = useMemo(
    () =>
      termsSections.map((section) => ({
        title: t(`terms.${section.key}`, section.defaultTitle),
        body: section.bodyKey ? t(`terms.${section.bodyKey}`, '') : '',
        list: section.listKeys?.map((key) => t(`terms.${key}`)),
      })),
    [t]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{t('terms.title', 'Terms of Service')}</h1>
      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600">
          {t('terms.lastUpdated', 'Last updated:')} {new Date().toLocaleDateString()}
        </p>

        {computedSections.map((section) => (
          <section key={section.title} className="mt-8">
            <h2 className="mb-4 text-2xl font-semibold">{section.title}</h2>
            {section.body && <p className="text-gray-700">{section.body}</p>}
            {section.list && (
              <ul className="mt-4 list-disc pl-6 text-gray-700">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="mt-8">
          <h2 className="mb-4 text-2xl font-semibold text-red-600">
            {t('terms.importantDisclaimer', 'Important Disclaimer')}
          </h2>
          <div className="rounded border-2 border-red-200 bg-red-50 p-4">
            <p className="mb-2 font-semibold text-red-800">
              {t('terms.disclaimerTitle', 'Visa Approval Not Guaranteed')}
            </p>
            <p className="text-red-700">{t('terms.disclaimerText')}</p>
          </div>
        </section>

        <div className="mt-8 rounded border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            <strong>{t('terms.note', 'Note:')}</strong>{' '}
            {t(
              'terms.noteText',
              'This is a template terms of service. Please replace this content with your actual terms that comply with applicable laws. The disclaimer section is critical and should be reviewed by legal counsel.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
