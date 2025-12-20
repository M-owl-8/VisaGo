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
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { validationRules, validateField } from '@/lib/utils/formValidation';

export default function RegisterPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { register, loginWithGoogle } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (value: string) => {
    const error = validateField(value, [validationRules.required, validationRules.email]);
    setFieldErrors((prev) => ({ ...prev, email: error || '' }));
    return !error;
  };

  const validatePassword = (value: string) => {
    const error = validateField(value, [validationRules.required, validationRules.minLength(6)]);
    setFieldErrors((prev) => ({ ...prev, password: error || '' }));
    return !error;
  };

  const validateConfirmPassword = (value: string) => {
    let error = validateField(value, [validationRules.required]);
    if (!error && value !== formData.password) {
      error = 'Passwords do not match';
    }
    setFieldErrors((prev) => ({ ...prev, confirmPassword: error || '' }));
    return !error;
  };

  const validateName = (value: string, field: 'firstName' | 'lastName') => {
    const error = validateField(value, [validationRules.required]);
    setFieldErrors((prev) => ({ ...prev, [field]: error || '' }));
    return !error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    const isFirstNameValid = validateName(formData.firstName, 'firstName');
    const isLastNameValid = validateName(formData.lastName, 'lastName');
    const isEmailValid = validateEmail(formData.email);
    const isPasswordValid = validatePassword(formData.password);
    const isConfirmPasswordValid = validateConfirmPassword(formData.confirmPassword);

    if (
      !isFirstNameValid ||
      !isLastNameValid ||
      !isEmailValid ||
      !isPasswordValid ||
      !isConfirmPasswordValid
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      await register(formData.email, formData.password, formData.firstName, formData.lastName);
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
    <AuthLayout formTitle={t('auth.registerTitle')} formSubtitle={t('auth.subtitle')}>
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AuthField
            label={t('auth.firstName')}
            icon={UserRound}
            id="firstName"
            name="firstName"
            type="text"
            placeholder={t('auth.firstName')}
            value={formData.firstName}
            onChange={(e) => {
              setFormData({ ...formData, firstName: e.target.value });
              if (fieldErrors.firstName) validateName(e.target.value, 'firstName');
            }}
            onBlur={() => validateName(formData.firstName, 'firstName')}
            error={fieldErrors.firstName}
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
            onChange={(e) => {
              setFormData({ ...formData, lastName: e.target.value });
              if (fieldErrors.lastName) validateName(e.target.value, 'lastName');
            }}
            onBlur={() => validateName(formData.lastName, 'lastName')}
            error={fieldErrors.lastName}
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
          onChange={(e) => {
            setFormData({ ...formData, email: e.target.value });
            if (fieldErrors.email) validateEmail(e.target.value);
          }}
          onBlur={() => validateEmail(formData.email)}
          error={fieldErrors.email}
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
          onChange={(e) => {
            setFormData({ ...formData, password: e.target.value });
            if (fieldErrors.password) validatePassword(e.target.value);
            if (fieldErrors.confirmPassword && formData.confirmPassword)
              validateConfirmPassword(formData.confirmPassword);
          }}
          onBlur={() => validatePassword(formData.password)}
          error={fieldErrors.password}
          required
          hint={
            !fieldErrors.password
              ? t('auth.passwordHint', 'Minimum 6 characters to sync with mobile app.')
              : undefined
          }
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
          onChange={(e) => {
            setFormData({ ...formData, confirmPassword: e.target.value });
            if (fieldErrors.confirmPassword) validateConfirmPassword(e.target.value);
          }}
          onBlur={() => validateConfirmPassword(formData.confirmPassword)}
          error={fieldErrors.confirmPassword}
          required
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#4A9EFF] to-[#3EA6FF] py-3 text-sm font-semibold text-white shadow-[0_15px_30px_rgba(74,158,255,0.35)] transition hover:brightness-110 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#030814] sm:py-3 sm:text-base"
          aria-busy={isSubmitting}
        >
          {isSubmitting ? t('common.loading') : t('auth.createAccount')}
        </button>

        {/* Only show Google OAuth if configured */}
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <>
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
          </>
        )}

        <div className="text-center text-xs text-white/70 sm:text-sm">
          <span>{t('auth.alreadyHaveAccount')}</span>{' '}
          <Link
            href="/login"
            className="font-semibold text-white hover:text-[#4A9EFF] transition-colors rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {t('auth.signIn')}
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
