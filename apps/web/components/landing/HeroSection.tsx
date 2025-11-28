'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-10%] top-[-20%] h-96 w-96 rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute left-[-15%] bottom-[-20%] h-96 w-96 rounded-full bg-[#1D4ED8]/15 blur-[160px]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
            <Sparkles size={14} className="text-primary" />
            {t('landing.badge', 'AI-Powered Visa Assistant')}
          </div>

          {/* Headline */}
          <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            {t('landing.heroTitle', 'AI-powered visa partner for students and travelers')}
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70 sm:text-xl">
            {t(
              'landing.heroSubtitle',
              'Get personalized document checklists, step-by-step guidance, and 24/7 AI support. Everything you need for your visa application, synced across mobile and web.'
            )}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-8 py-4 text-base font-semibold shadow-[0_20px_45px_rgba(62,166,255,0.45)]">
                {t('landing.ctaStart', 'Start Web App')}
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button
                variant="secondary"
                className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white shadow-[0_15px_35px_rgba(7,12,30,0.7)] hover:bg-white/10"
              >
                {t('landing.ctaLearn', 'See How It Works')}
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-white/50">
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

