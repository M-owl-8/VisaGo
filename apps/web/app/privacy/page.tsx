'use client';

import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout';

export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">{t('privacy.title', 'Privacy Policy')}</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600">
            {t('privacy.lastUpdated', 'Last updated:')} {new Date().toLocaleDateString()}
          </p>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">
              {t('privacy.introduction', 'Introduction')}
            </h2>
            <p className="text-gray-700">
              {t('privacy.introText', 'This privacy policy describes how we collect, use, and protect your personal information when you use our visa application service.')}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">
              {t('privacy.dataCollection', 'Data Collection')}
            </h2>
            <p className="text-gray-700">
              {t('privacy.dataCollectionText', 'We collect information that you provide to us, including:')}
            </p>
            <ul className="list-disc pl-6 mt-4 text-gray-700">
              <li>{t('privacy.dataItem1', 'Personal information (name, email, phone number)')}</li>
              <li>{t('privacy.dataItem2', 'Visa application details')}</li>
              <li>{t('privacy.dataItem3', 'Document uploads')}</li>
              <li>{t('privacy.dataItem4', 'Chat messages with AI assistant')}</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">
              {t('privacy.dataUsage', 'How We Use Your Data')}
            </h2>
            <p className="text-gray-700">
              {t('privacy.dataUsageText', 'We use your data to:')}
            </p>
            <ul className="list-disc pl-6 mt-4 text-gray-700">
              <li>{t('privacy.usageItem1', 'Process your visa applications')}</li>
              <li>{t('privacy.usageItem2', 'Provide AI-powered assistance')}</li>
              <li>{t('privacy.usageItem3', 'Send you important updates about your applications')}</li>
              <li>{t('privacy.usageItem4', 'Improve our services')}</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">
              {t('privacy.dataProtection', 'Data Protection')}
            </h2>
            <p className="text-gray-700">
              {t('privacy.dataProtectionText', 'We implement security measures to protect your personal information. However, no method of transmission over the internet is 100% secure.')}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">
              {t('privacy.contact', 'Contact Us')}
            </h2>
            <p className="text-gray-700">
              {t('privacy.contactText', 'If you have questions about this privacy policy, please contact us through our support page.')}
            </p>
          </section>

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>{t('privacy.note', 'Note:')}</strong>{' '}
              {t('privacy.noteText', 'This is a template privacy policy. Please replace this content with your actual privacy policy text that complies with applicable laws (GDPR, CCPA, etc.).')}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

