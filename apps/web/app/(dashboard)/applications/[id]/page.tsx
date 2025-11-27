'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/errorMessages';
import ErrorBanner from '@/components/ErrorBanner';

export default function ApplicationDetailPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const { isSignedIn } = useAuthStore();
  const [application, setApplication] = useState<any>(null);
  const [checklist, setChecklist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setError('');
      const [appRes, checklistRes] = await Promise.all([
        apiClient.getApplication(params.id as string),
        apiClient.getDocumentChecklist(params.id as string),
      ]);

      if (appRes.success && appRes.data) {
        setApplication(appRes.data);
      } else {
        const errorMsg = getErrorMessage(appRes.error || {}, t, i18n.language);
        setError(errorMsg || t('errors.failedToLoadApplication'));
      }

      if (checklistRes.success && checklistRes.data) {
        setChecklist(checklistRes.data);
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err, t, i18n.language);
      setError(errorMsg || t('errors.failedToLoadApplication'));
    } finally {
      setLoading(false);
    }
  }, [params.id, t, i18n.language]);

  useEffect(() => {
    if (!isSignedIn) {
      router.push('/login');
      return;
    }
    loadData();
  }, [isSignedIn, router, loadData]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>{t('common.loading')}</div>
      </div>
    );
  }

  if (!application && !loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && <ErrorBanner message={error} />}
        <div className="mt-4">
          <Link
            href="/applications"
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            {t('applications.backToApplications')}
          </Link>
        </div>
        <div className="mt-4 flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">{t('applications.applicationNotFound')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && <ErrorBanner message={error} onClose={() => setError('')} />}

        <Link
          href="/applications"
          className="mb-4 text-sm text-primary-600 hover:text-primary-500"
        >
          ← {t('applications.backToApplications')}
        </Link>

        {application && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {application.country?.name || t('applications.title')} - {application.visaType?.name}
              </h1>
              <p className="text-sm text-gray-600">
                {t('applications.status')}: {application.status}
              </p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-gray-600">
                  <span>{t('applications.progress')}</span>
                  <span>{application.progressPercentage || 0}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-primary-600"
                    style={{ width: `${application.progressPercentage || 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold">{t('applications.documentChecklist')}</h2>
                {checklist?.items ? (
                  <ul className="space-y-2">
                    {checklist.items.map((item: any, index: number) => (
                      <li key={index} className="flex items-center justify-between">
                        <span className={item.status === 'verified' ? 'text-green-600' : 'text-gray-700'}>
                          {item.name}
                        </span>
                        <span className="text-sm text-gray-500">{item.status}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">{t('applications.noChecklistAvailable')}</p>
                )}
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold">{t('applications.actions')}</h2>
                <div className="space-y-2">
                  <Link
                    href={`/applications/${params.id}/documents`}
                    className="block rounded-md bg-primary-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary-700"
                  >
                    {t('applications.uploadDocuments')}
                  </Link>
                  <Link
                    href={`/chat?applicationId=${params.id}`}
                    className="block rounded-md bg-gray-100 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    {t('applications.chatAboutApplication')}
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


