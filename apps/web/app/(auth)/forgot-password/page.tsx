'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/errorMessages';
import ErrorBanner from '@/components/ErrorBanner';
import Link from 'next/link';

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

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">
              {t('auth.passwordReset')}
            </p>
          </div>
          <Link
            href="/login"
            className="block text-center text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            {t('auth.resetPassword')}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <ErrorBanner message={error} onClose={() => setError('')} />}
          <div>
            <label htmlFor="email" className="sr-only">
              {t('auth.email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="relative block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
              placeholder={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50"
            >
              {isLoading ? t('common.loading') : t('auth.sendResetLink')}
            </button>
          </div>

          <div className="text-center text-sm">
            <Link
              href="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              {t('forgotPassword.backToLogin')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}


