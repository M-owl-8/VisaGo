'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, UserRound } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';
import { getErrorMessage } from '@/lib/utils/errorMessages';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthField } from '@/components/auth/AuthField';

export default function RegisterPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { register } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (formData.password !== formData.confirmPassword) {
      setError(t('errors.passwordsDoNotMatch'));
      setIsSubmitting(false);
      return;
    }

    if (formData.password.length < 6) {
      setError(t('errors.passwordMinLength'));
      setIsSubmitting(false);
      return;
    }

    try {
      await register(formData.email, formData.password, formData.firstName, formData.lastName);
      router.push('/applications');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, t, i18n.language);
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout formTitle={t('auth.registerTitle')} formSubtitle={t('auth.subtitle')}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField
            label={t('auth.firstName')}
            icon={UserRound}
            id="firstName"
            name="firstName"
            type="text"
            placeholder={t('auth.firstName')}
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
          <AuthField
            label={t('auth.lastName')}
            icon={UserRound}
            id="lastName"
            name="lastName"
            type="text"
            placeholder={t('auth.lastName')}
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>

        <AuthField
          label={t('auth.email')}
          icon={Mail}
          id="email"
          name="email"
          type="email"
          placeholder="you@email.com"
          autoComplete="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />

        <AuthField
          label={t('auth.password')}
          icon={Lock}
          id="password"
          name="password"
          type="password"
          placeholder={t('auth.password')}
          autoComplete="new-password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          hint={t('auth.passwordHint', 'Minimum 6 characters to sync with mobile app.')}
        />

        <AuthField
          label={t('auth.confirmPassword')}
          icon={Lock}
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder={t('auth.confirmPassword')}
          autoComplete="new-password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#4A9EFF] to-[#3EA6FF] py-3 text-base font-semibold text-white shadow-[0_15px_30px_rgba(74,158,255,0.35)] transition hover:brightness-110 disabled:opacity-60"
        >
          {isSubmitting ? t('common.loading') : t('auth.createAccount')}
        </button>

        <div className="text-center text-sm text-white/70">
          <span>{t('auth.alreadyHaveAccount')}</span>{' '}
          <Link href="/login" className="font-semibold text-white hover:text-[#4A9EFF]">
            {t('auth.signIn')}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
