'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-32">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-10%] top-[-20%] h-96 w-96 rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute left-[-15%] bottom-[-20%] h-96 w-96 rounded-full bg-[#1D4ED8]/15 blur-[160px]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="text-center">
          {/* Badge */}
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/70 sm:mb-6 sm:gap-2 sm:px-4 sm:py-1.5">
            <Sparkles size={12} className="text-primary sm:size-4" />
            {t('landing.badge', 'AI-Powered Visa Assistant')}
          </div>

          {/* Headline */}
          <h1 className="mx-auto max-w-4xl font-display text-2xl font-bold leading-tight text-white sm:text-3xl sm:leading-tight md:text-4xl lg:text-5xl xl:text-6xl">
            {t('landing.heroTitle', 'AI-powered visa partner for students and travelers')}
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:mt-6 sm:text-base md:text-lg lg:text-xl">
            {t(
              'landing.heroSubtitle',
              'Get personalized document checklists, step-by-step guidance, and 24/7 AI support. Everything you need for your visa application, synced across mobile and web.'
            )}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex w-full max-w-md flex-col items-stretch gap-3 sm:mx-auto sm:mt-10 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
            <Link href="/register" className="w-full sm:w-auto">
              <Button className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold shadow-[0_20px_45px_rgba(62,166,255,0.45)] sm:px-8 sm:py-4 sm:text-base">
                {t('landing.ctaStart', 'Start Web App')}
                <ArrowRight size={16} className="ml-2 sm:size-5" />
              </Button>
            </Link>
            <Link href="#how-it-works" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white shadow-[0_15px_35px_rgba(7,12,30,0.7)] hover:bg-white/10 sm:px-8 sm:py-4 sm:text-base"
              >
                {t('landing.ctaLearn', 'See How It Works')}
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 text-xs text-white/50 sm:mt-12 sm:flex-row sm:flex-wrap sm:gap-6 sm:text-sm">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{t('landing.trustSecure', 'Bank-level security')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{t('landing.trustSync', 'Mobile & web sync')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{t('landing.trustSupport', '24/7 AI support')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

