'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Menu,
  X,
  LogOut,
  Languages,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isSignedIn } = useAuthStore();
  const [currentLang, setCurrentLang] = useState('en');
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    if (i18n) {
      setCurrentLang(i18n.language);
    }
  }, [i18n]);

  const navLinks = useMemo(
    () => [
      { href: '/applications', label: t('applications.title') },
      { href: '/questionnaire', label: t('applications.startNewApplication') },
      { href: '/chat', label: t('chat.aiAssistant') },
      { href: '/profile', label: t('profile.profile') },
      { href: '/support', label: t('helpSupport.title') },
    ],
    [t],
  );

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const changeLanguage = (lang: string) => {
    if (!i18n) return;
    i18n.changeLanguage(lang);
    setCurrentLang(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_language', lang);
    }
  };

  if (!isSignedIn) {
    return <>{children}</>;
  }

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-80">
        <div className="bg-gradient-to-br from-primary-50 via-transparent to-accent-50 absolute inset-0" />
        <div className="blur-3xl opacity-30 absolute right-[-10%] top-[-5%] h-72 w-72 rounded-full bg-accent-200 animate-blob" />
        <div className="blur-3xl opacity-30 absolute left-[-5%] bottom-[-10%] h-72 w-72 rounded-full bg-primary-200 animate-blob" />
      </div>

      <nav className="sticky top-0 z-40 px-4 py-6 sm:px-6 lg:px-8">
        <div className="glass-panel relative flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/applications" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black shadow-card-soft">
                <Image
                  src="/images/ketdik-icon.jpg"
                  alt="Ketdik icon"
                  width={40}
                  height={40}
                  priority
                  className="h-10 w-10 rounded-2xl object-cover"
                />
              </div>
              <div>
                <p className="font-display text-lg font-semibold tracking-tight text-primary-900">
                  Ketdik
                </p>
                <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">
                  Visa Workspace
                </span>
              </div>
            </Link>
            <div className="hidden items-center gap-2 rounded-full border border-transparent bg-white/60 px-4 py-1 text-xs font-medium text-primary-600 shadow-card-soft sm:flex">
              <ShieldCheck size={14} />
              <span>{t('applications.status')}</span>
            </div>
          </div>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Button
                  key={link.href}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'rounded-full px-5 py-2 text-sm font-semibold transition',
                    isActive
                      ? 'bg-black text-white shadow-[0_15px_35px_rgba(15,15,20,0.25)]'
                      : 'text-neutral-500 hover:bg-white hover:text-primary-900',
                  )}
                  onClick={() => router.push(link.href)}
                >
                  {link.label}
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-transparent bg-white/70 px-3 py-1 text-xs font-semibold tracking-wide text-primary-800 shadow-inner shadow-white/50 transition hover:bg-white md:flex">
              <Languages size={16} />
              <select
                value={currentLang}
                onChange={(e) => changeLanguage(e.target.value)}
                className="bg-transparent text-xs font-semibold uppercase tracking-[0.2em] focus:outline-none"
              >
                <option value="en">EN</option>
                <option value="ru">RU</option>
                <option value="uz">UZ</option>
              </select>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <div className="rounded-full bg-primary-900/10 px-4 py-2 text-sm text-primary-900">
                {user?.firstName} {user?.lastName}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full border border-primary-900/10 !bg-white text-primary-900 shadow-card-soft"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span className="ml-2">{t('profile.logout')}</span>
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setIsNavOpen((prev) => !prev)}
              className="md:hidden"
              aria-label="Toggle navigation"
            >
              {isNavOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isNavOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="glass-panel mt-4 flex flex-col gap-3 px-4 py-4 md:hidden"
            >
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Button
                    key={link.href}
                    variant={isActive ? 'primary' : 'ghost'}
                    className="justify-start rounded-2xl"
                    onClick={() => {
                      router.push(link.href);
                      setIsNavOpen(false);
                    }}
                  >
                    {link.label}
                  </Button>
                );
              })}

              <div className="flex flex-col gap-2 rounded-2xl border border-white/50 bg-white/70 p-4">
                <p className="text-sm font-semibold text-primary-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-900/10 text-sm font-semibold text-primary-900">
                    {initials || 'U'}
                  </div>
                  <Button variant="secondary" className="flex-1" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span className="ml-2">{t('profile.logout')}</span>
                  </Button>
                </div>

                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  {t('profile.language')}
                </label>
                <select
                  value={currentLang}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="rounded-2xl border border-neutral-200 px-3 py-2 text-sm"
                >
                  <option value="en">English</option>
                  <option value="ru">Русский</option>
                  <option value="uz">O‘zbekcha</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="relative z-10 px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="relative z-10 border-t border-white/40 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
          <div>
            © {new Date().getFullYear()} Ketdik.{' '}
            {t('common.allRightsReserved', 'All rights reserved.')}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/privacy" className="transition hover:text-primary-900">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-primary-900">
              Terms
            </Link>
            <button
              type="button"
              onClick={() => router.push('/chat')}
              className="inline-flex items-center gap-1 text-primary-900 transition hover:opacity-80"
            >
              <MessageCircle size={16} />
              {t('chat.aiAssistant')}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

