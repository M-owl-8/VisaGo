'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-white/10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="mb-4 font-display text-lg font-semibold text-white">Ketdik</h3>
            <p className="text-sm text-white/60">
              {t('landing.footerTagline', 'Your AI-powered visa application partner')}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">
              {t('landing.footerLegal', 'Legal')}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-white/60 transition hover:text-white">
                  {t('landing.footerPrivacy', 'Privacy Policy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-white/60 transition hover:text-white">
                  {t('landing.footerTerms', 'Terms of Service')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">
              {t('landing.footerSupport', 'Support')}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/support" className="text-sm text-white/60 transition hover:text-white">
                  {t('landing.footerHelp', 'Help & Support')}
                </Link>
              </li>
              <li>
                <Link href="/chat" className="text-sm text-white/60 transition hover:text-white">
                  {t('landing.footerChat', 'AI Assistant')}
                </Link>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">
              {t('landing.footerGetStarted', 'Get Started')}
            </h4>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
            >
              <MessageCircle size={16} />
              {t('landing.footerSignUp', 'Sign Up Free')}
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-8 text-center text-sm text-white/60">
          <p>
            © {new Date().getFullYear()} Ketdik. {t('common.allRightsReserved', 'All rights reserved.')}
          </p>
        </div>
      </div>
    </footer>
  );
}

