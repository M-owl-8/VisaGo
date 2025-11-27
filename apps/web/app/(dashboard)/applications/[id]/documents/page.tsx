'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/errorMessages';
import ErrorBanner from '@/components/ErrorBanner';
import SuccessBanner from '@/components/SuccessBanner';

export default function DocumentsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError(t('documents.fileTooLarge'));
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.uploadDocument(
        params.id as string,
        'document',
        file,
      );

      if (response.success) {
        setSuccess(t('documents.uploadSuccess'));
        setTimeout(() => {
          router.push(`/applications/${params.id}`);
        }, 2000);
      } else {
        const errorMsg = getErrorMessage(response.error || {}, t, i18n.language);
        setError(errorMsg || t('documents.uploadFailed'));
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err, t, i18n.language);
      setError(errorMsg || t('documents.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('documents.title')}</h1>

      {error && <ErrorBanner message={error} onClose={() => setError('')} />}
      {success && <SuccessBanner message={success} />}

      <div className="rounded-lg bg-white p-6 shadow">
        <label className="block text-sm font-medium text-gray-700">
          {t('documents.selectDocument')}
        </label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileUpload}
          disabled={uploading}
          className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
        />
        {uploading && <p className="mt-2 text-sm text-gray-600">{t('common.loading')}</p>}
      </div>
    </div>
  );
}


