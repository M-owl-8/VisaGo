'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, Shield, Globe } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';
import { getErrorMessage } from '@/lib/utils/errorMessages';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthField } from '@/components/auth/AuthField';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push('/applications');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, t, i18n.language);
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout formTitle={t('auth.signIn')} formSubtitle={t('auth.subtitle')}>
      <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div
            className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-2">
              <span className="flex-1">{error}</span>
            </div>
          </div>
        )}

        <AuthField
          label={t('auth.email')}
          icon={Mail}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-white/70">
            <span className="font-semibold">{t('auth.password')}</span>
            <Link href="/forgot-password" className="text-[#4A9EFF] hover:text-white">
              {t('auth.forgotPassword')}
            </Link>
          </div>
          <AuthField
            label=""
            icon={Lock}
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-white/50 transition hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#3EA6FF] to-[#4A9EFF] py-3 text-sm font-semibold text-white shadow-[0_15px_30px_rgba(62,166,255,0.35)] transition hover:brightness-110 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#030814] sm:py-3 sm:text-base"
        >
          {isSubmitting ? t('common.loading') : t('auth.signInButton')}
        </button>

        <div className="flex items-center gap-4 text-white/50">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs uppercase tracking-[0.4em]">{t('auth.or', 'Or')}</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          disabled
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white/80 shadow-inner shadow-black/20"
          title={t('auth.googleOAuthComingSoon', 'Google OAuth coming soon')}
        >
          <Globe size={18} />
          {t('auth.continueWithGoogle', 'Continue with Google')}
        </button>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          <div className="flex items-center gap-2">
            <Shield size={16} />
            <p>
              {t(
                'auth.securityNote',
                'Your credentials are encrypted and synced securely with the Ketdik mobile app.'
              )}
            </p>
          </div>
        </div>

        <div className="text-center text-xs text-white/70 sm:text-sm">
          <span>{t('auth.dontHaveAccount')}</span>{' '}
          <Link href="/register" className="font-semibold text-white hover:text-[#4A9EFF]">
            {t('auth.signUp')}
          </Link>
        </div>

        {/* Terms & Privacy */}
        <p className="text-center text-[10px] leading-relaxed text-white/50 sm:text-xs">
          {t('auth.termsAgreement', 'By continuing, you agree to our')}{' '}
          <Link href="/terms" className="underline hover:text-white">
            {t('auth.terms', 'Terms')}
          </Link>
          {' '}
          {t('auth.and', 'and')}{' '}
          <Link href="/privacy" className="underline hover:text-white">
            {t('auth.privacy', 'Privacy Policy')}
          </Link>
          .
        </p>
      </form>
    </AuthLayout>
  );
}
