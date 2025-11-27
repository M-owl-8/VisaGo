'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/lib/stores/auth';

export default function ProfilePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isSignedIn, fetchUserProfile } = useAuthStore();

  useEffect(() => {
    if (!isSignedIn) {
      router.push('/login');
      return;
    }
    fetchUserProfile();
  }, [isSignedIn, fetchUserProfile, router]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('profile.myProfile')}</h1>

      <div className="rounded-lg bg-white p-6 shadow">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('profile.firstName')}
            </label>
            <p className="mt-1 text-sm text-gray-900">{user.firstName || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('profile.lastName')}
            </label>
            <p className="mt-1 text-sm text-gray-900">{user.lastName || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('profile.email')}
            </label>
            <p className="mt-1 text-sm text-gray-900">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('profile.phone')}
            </label>
            <p className="mt-1 text-sm text-gray-900">{user.phone || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('profile.language')}
            </label>
            <p className="mt-1 text-sm text-gray-900">{user.language || 'en'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}



