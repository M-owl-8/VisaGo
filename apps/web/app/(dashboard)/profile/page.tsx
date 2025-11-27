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
    <div className="mx-auto max-w-3xl px-4 py-8 text-white sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">{t('profile.myProfile')}</h1>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_55px_rgba(1,7,17,0.65)]">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70">
              {t('profile.firstName')}
            </label>
            <p className="mt-1 text-sm">{user.firstName || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70">
              {t('profile.lastName')}
            </label>
            <p className="mt-1 text-sm">{user.lastName || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70">{t('profile.email')}</label>
            <p className="mt-1 text-sm">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70">{t('profile.phone')}</label>
            <p className="mt-1 text-sm">{user.phone || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70">
              {t('profile.language')}
            </label>
            <p className="mt-1 text-sm uppercase">{user.language || 'en'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
