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
          <Link href="/applications" className="text-sm text-primary-600 hover:text-primary-500">
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
    <div className="mx-auto max-w-7xl px-4 py-8 text-white sm:px-6 lg:px-8">
      {error && <ErrorBanner message={error} onClose={() => setError('')} />}

      <Link href="/applications" className="mb-4 text-sm text-primary hover:text-white">
        ← {t('applications.backToApplications')}
      </Link>

      {application && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">
              {application.country?.name || t('applications.title')} - {application.visaType?.name}
            </h1>
            <p className="text-sm text-white/60">
              {t('applications.status')}: <span className="capitalize">{application.status}</span>
            </p>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-white/60">
                <span>{t('applications.progress')}</span>
                <span>{application.progressPercentage || 0}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark"
                  style={{ width: `${application.progressPercentage || 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass-panel border border-white/10 bg-white/[0.03] p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">
                {t('applications.documentChecklist')}
              </h2>
              {checklist?.items ? (
                <ul className="space-y-2">
                  {checklist.items.map((item: any, index: number) => (
                    <li key={index} className="flex items-center justify-between text-white/80">
                      <span
                        className={
                          item.status === 'verified' ? 'text-emerald-300' : 'text-white/80'
                        }
                      >
                        {item.name}
                      </span>
                      <span className="text-sm text-white/50 capitalize">{item.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-white/60">{t('applications.noChecklistAvailable')}</p>
              )}
            </div>

            <div className="glass-panel border border-white/10 bg-white/[0.03] p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">{t('applications.actions')}</h2>
              <div className="space-y-2">
                <Link
                  href={`/applications/${params.id}/documents`}
                  className="block rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-4 py-2 text-center text-sm font-medium text-white shadow-[0_15px_35px_rgba(62,166,255,0.35)]"
                >
                  {t('applications.uploadDocuments')}
                </Link>
                <Link
                  href={`/chat?applicationId=${params.id}`}
                  className="block rounded-2xl border border-white/10 bg-transparent px-4 py-2 text-center text-sm font-medium text-white hover:bg-white/10"
                >
                  {t('applications.chatAboutApplication')}
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
