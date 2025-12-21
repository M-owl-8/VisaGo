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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-4 sm:py-4 lg:px-8">
        {/* Logo - Smaller on mobile */}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary/50 sm:gap-3"
          aria-label="Ketdik home"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 sm:h-10 sm:w-10">
            <Image
              src="/images/ketdik-icon.png"
              alt="Ketdik logo"
              width={32}
              height={32}
              className="h-6 w-6 rounded-lg object-cover sm:h-8 sm:w-8"
              priority
              unoptimized
            />
          </div>
          <span className="font-display text-lg font-semibold text-white sm:text-xl">Ketdik</span>
        </Link>

        {/* Navigation - Hidden on mobile */}
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

        {/* Actions - Responsive layout */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
          {/* Language switcher - Hidden on very small screens, visible from sm */}
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          
          {/* Sign In - Hidden on mobile, visible from md */}
          <Link href="/login" className="hidden md:block">
            <Button
              variant="ghost"
              className="rounded-xl border border-white/10 bg-transparent px-3 py-1.5 text-xs text-white hover:bg-white/10 focus:ring-2 focus:ring-primary/50 sm:px-4 sm:py-2 sm:text-sm"
            >
              {t('landing.navSignIn', 'Sign In')}
            </Button>
          </Link>
          
          {/* Get Started - Primary CTA, always visible but smaller on mobile */}
          <Link href="/register">
            <Button className="rounded-xl bg-gradient-to-r from-primary to-primary-dark px-3 py-1.5 text-xs font-semibold shadow-[0_10px_25px_rgba(62,166,255,0.35)] focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background sm:px-4 sm:py-2 sm:text-sm">
              {t('landing.navGetStarted', 'Get Started')}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

