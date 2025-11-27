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
      const response = await apiClient.uploadDocument(params.id as string, 'document', file);

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
    <div className="mx-auto max-w-3xl px-4 py-8 text-white sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">{t('documents.title')}</h1>

      {error && <ErrorBanner message={error} onClose={() => setError('')} />}
      {success && <SuccessBanner message={success} />}

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_55px_rgba(1,7,17,0.65)]">
        <label className="block text-sm font-medium text-white/80">
          {t('documents.selectDocument')}
        </label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileUpload}
          disabled={uploading}
          className="mt-2 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 file:mr-4 file:rounded-xl file:border-0 file:bg-gradient-to-r file:from-primary file:to-primary-dark file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:brightness-110"
        />
        {uploading && <p className="mt-2 text-sm text-white/60">{t('common.loading')}</p>}
      </div>
    </div>
  );
}
