'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/lib/stores/auth';

export default function ApplicationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userApplications, fetchUserApplications, isSignedIn } = useAuthStore();

  useEffect(() => {
    if (!isSignedIn) {
      router.push('/login');
      return;
    }
    fetchUserApplications();
  }, [isSignedIn, fetchUserApplications, router]);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('applications.myApplications')}
          </h1>
          <Link
            href="/questionnaire"
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            {t('applications.startNewApplication')}
          </Link>
        </div>

        {userApplications.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-600">{t('applications.noApplicationsYet')}</p>
            <Link
              href="/questionnaire"
              className="mt-4 inline-block rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              {t('applications.startNewApplication')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {userApplications.map((app) => (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-2xl">{app.country?.flagEmoji}</span>
                  <span className="text-sm text-gray-500">{app.status}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {app.country?.name || 'Unknown Country'}
                </h3>
                <p className="text-sm text-gray-600">{app.visaType?.name}</p>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-gray-600">
                    <span>Progress</span>
                    <span>{app.progressPercentage}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-primary-600"
                      style={{ width: `${app.progressPercentage}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}


