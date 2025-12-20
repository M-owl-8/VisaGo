'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';
import { getErrorMessage } from '@/lib/utils/errorMessages';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthField } from '@/components/auth/AuthField';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { validationRules, validateField } from '@/lib/utils/formValidation';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { login, loginWithGoogle } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (value: string) => {
    const error = validateField(value, [validationRules.required, validationRules.email]);
    setEmailError(error || '');
    return !error;
  };

  const validatePassword = (value: string) => {
    const error = validateField(value, [validationRules.required]);
    setPasswordError(error || '');
    return !error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

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

  const handleGoogleLogin = async (idToken: string) => {
    setError('');
    setIsSubmitting(true);
    try {
      await loginWithGoogle(idToken);
      router.push('/applications');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, t, i18n.language);
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = (error: Error) => {
    const errorMessage = getErrorMessage(error, t, i18n.language);
    setError(errorMessage);
    setIsSubmitting(false);
  };

  return (
    <AuthLayout formTitle={t('auth.signIn')} formSubtitle={t('auth.subtitle')}>
      <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit} noValidate>
        {error && (
          <div
            className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200"
            role="alert"
            aria-live="polite"
            aria-atomic="true"
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
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) validateEmail(e.target.value);
          }}
          onBlur={() => validateEmail(email)}
          error={emailError}
          required
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-white/70">
            <span className="font-semibold">{t('auth.password')}</span>
            <Link 
              href="/forgot-password" 
              className="text-[#4A9EFF] hover:text-white transition-colors rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
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
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) validatePassword(e.target.value);
            }}
            onBlur={() => validatePassword(password)}
            error={passwordError}
            required
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-white/50 transition hover:text-white rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
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
          aria-busy={isSubmitting}
        >
          {isSubmitting ? t('common.loading') : t('auth.signInButton')}
        </button>

        <div className="flex items-center gap-4 text-white/50">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs uppercase tracking-[0.4em]">{t('auth.or', 'Or')}</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <GoogleSignInButton
          onSuccess={handleGoogleLogin}
          onError={handleGoogleError}
          disabled={isSubmitting}
          className="w-full"
        />

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
