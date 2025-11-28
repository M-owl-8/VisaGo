'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Mail, Phone, Globe, User } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
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
        <div className="text-white/70">{t('common.loading')}</div>
      </div>
    );
  }

  // Get user's display name (first name only, no surname)
  const displayName = user.firstName || user.email?.split('@')[0] || 'User';
  
  // Get user initials for avatar
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Premium Header Section */}
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold text-white">{t('profile.myProfile')}</h1>
        <p className="text-white/60">Manage your account settings and preferences</p>
      </div>

      {/* Premium Profile Card */}
      <div className="glass-panel relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-8 shadow-[0_25px_55px_rgba(1,7,17,0.65)] backdrop-blur-xl">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary-dark blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Avatar Section */}
          <div className="mb-8 flex flex-col items-center sm:flex-row sm:items-start sm:gap-6">
            <div className="relative mb-4 sm:mb-0">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-2xl font-bold text-white shadow-[0_20px_40px_rgba(62,166,255,0.3)]">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={displayName}
                    width={96}
                    height={96}
                    className="h-24 w-24 rounded-2xl object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary-500">
                <User size={16} className="text-white" />
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="mb-2 text-3xl font-bold text-white">{displayName}</h2>
              <p className="text-white/60">{user.email}</p>
              {user.emailVerified && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="mb-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Profile Information Grid */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Email */}
            <div className="group rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-all hover:border-white/10 hover:bg-white/[0.05]">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/20">
                  <Mail size={18} className="text-primary-400" />
                </div>
                <label className="text-xs font-medium uppercase tracking-wider text-white/50">
                  {t('profile.email')}
                </label>
              </div>
              <p className="text-base font-medium text-white">{user.email}</p>
            </div>

            {/* Phone */}
            <div className="group rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-all hover:border-white/10 hover:bg-white/[0.05]">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/20">
                  <Phone size={18} className="text-primary-400" />
                </div>
                <label className="text-xs font-medium uppercase tracking-wider text-white/50">
                  {t('profile.phone')}
                </label>
              </div>
              <p className="text-base font-medium text-white">{user.phone || 'Not provided'}</p>
            </div>

            {/* Language */}
            <div className="group rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-all hover:border-white/10 hover:bg-white/[0.05]">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/20">
                  <Globe size={18} className="text-primary-400" />
                </div>
                <label className="text-xs font-medium uppercase tracking-wider text-white/50">
                  {t('profile.language')}
                </label>
              </div>
              <p className="text-base font-medium text-white uppercase">
                {user.language || i18n.language || 'en'}
              </p>
            </div>

            {/* Account Status */}
            <div className="group rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-all hover:border-white/10 hover:bg-white/[0.05]">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/20">
                  <User size={18} className="text-primary-400" />
                </div>
                <label className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Account Status
                </label>
              </div>
              <p className="text-base font-medium text-white">Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
