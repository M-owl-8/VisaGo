'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/errorMessages';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthField } from '@/components/auth/AuthField';

export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.forgotPassword(email);
      if (response.success) {
        setSuccess(true);
      } else {
        const errorMsg = getErrorMessage(response.error || {}, t, i18n.language);
        setError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err, t, i18n.language);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout formTitle={t('auth.resetPassword')} formSubtitle={t('auth.subtitle')}>
      {success ? (
        <div className="space-y-6 text-white/80">
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            {t('auth.passwordReset')}
          </div>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <AuthField
            label={t('auth.email')}
            icon={Mail}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder', 'you@email.com')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            hint={t('auth.resetHint', 'We will send a secure link to this email.')}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#4A9EFF] to-[#3EA6FF] py-3 text-base font-semibold text-white shadow-[0_15px_30px_rgba(74,158,255,0.35)] transition hover:brightness-110 disabled:opacity-60"
          >
            {isLoading ? t('common.loading') : t('auth.sendResetLink')}
          </button>

          <div className="text-center text-sm text-white/70">
            <Link href="/login" className="font-semibold text-white hover:text-[#4A9EFF]">
              {t('forgotPassword.backToLogin')}
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
