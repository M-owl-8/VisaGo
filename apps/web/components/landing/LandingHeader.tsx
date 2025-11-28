'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/landing/LanguageSwitcher';

export function LandingHeader() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Image
              src="/images/ketdik-icon.jpg"
              alt="Ketdik"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-cover"
              priority
            />
          </div>
          <span className="font-display text-xl font-semibold text-white">Ketdik</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#how-it-works" className="text-sm text-white/60 transition hover:text-white">
            {t('landing.navHowItWorks', 'How It Works')}
          </a>
          <a href="#features" className="text-sm text-white/60 transition hover:text-white">
            {t('landing.navFeatures', 'Features')}
          </a>
          <Link href="/support" className="text-sm text-white/60 transition hover:text-white">
            {t('landing.navSupport', 'Support')}
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/login">
            <Button
              variant="ghost"
              className="rounded-xl border border-white/10 bg-transparent px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              {t('landing.navSignIn', 'Sign In')}
            </Button>
          </Link>
          <Link href="/register">
            <Button className="rounded-xl bg-gradient-to-r from-primary to-primary-dark px-4 py-2 text-sm shadow-[0_10px_25px_rgba(62,166,255,0.35)]">
              {t('landing.navGetStarted', 'Get Started')}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

