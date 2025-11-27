'use client';

import { useTranslation } from 'react-i18next';

export default function TermsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{t('terms.title', 'Terms of Service')}</h1>

      <div className="prose prose-lg max-w-none">
          <p className="text-gray-600">
            {t('terms.lastUpdated', 'Last updated:')} {new Date().toLocaleDateString()}
          </p>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">
              {t('terms.acceptance', 'Acceptance of Terms')}
            </h2>
            <p className="text-gray-700">
              {t('terms.acceptanceText', 'By using this service, you agree to be bound by these terms of service.')}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">
              {t('terms.serviceDescription', 'Service Description')}
            </h2>
            <p className="text-gray-700">
              {t('terms.serviceDescriptionText', 'VisaBuddy/Ketdik provides an AI-powered platform to assist with visa application preparation and document management.')}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4 text-red-600">
              {t('terms.importantDisclaimer', '⚠️ Important Disclaimer')}
            </h2>
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded">
              <p className="text-red-800 font-semibold mb-2">
                {t('terms.disclaimerTitle', 'Visa Approval Not Guaranteed')}
              </p>
              <p className="text-red-700">
                {t('terms.disclaimerText', 'VisaBuddy/Ketdik does NOT guarantee visa approval. All visa decisions are made solely by embassies, consulates, or immigration authorities. We provide assistance with application preparation, but we cannot influence or guarantee the outcome of any visa application.')}
              </p>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">
              {t('terms.userResponsibilities', 'User Responsibilities')}
            </h2>
            <ul className="list-disc pl-6 mt-4 text-gray-700">
              <li>{t('terms.responsibility1', 'Provide accurate and truthful information')}</li>
              <li>{t('terms.responsibility2', 'Ensure all documents are authentic and valid')}</li>
              <li>{t('terms.responsibility3', 'Comply with all applicable laws and regulations')}</li>
              <li>{t('terms.responsibility4', 'Keep your account credentials secure')}</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">
              {t('terms.limitationOfLiability', 'Limitation of Liability')}
            </h2>
            <p className="text-gray-700">
              {t('terms.limitationText', 'VisaBuddy/Ketdik is not liable for any visa refusals, delays, or other outcomes related to visa applications. Users are solely responsible for the accuracy of information provided and the final outcome of their applications.')}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">
              {t('terms.contact', 'Contact Us')}
            </h2>
            <p className="text-gray-700">
              {t('terms.contactText', 'If you have questions about these terms, please contact us through our support page.')}
            </p>
          </section>

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>{t('terms.note', 'Note:')}</strong>{' '}
              {t('terms.noteText', 'This is a template terms of service. Please replace this content with your actual terms that comply with applicable laws. The disclaimer section is critical and should be reviewed by legal counsel.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


