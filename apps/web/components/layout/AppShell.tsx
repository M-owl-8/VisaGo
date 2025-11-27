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
    <div className="relative min-h-screen overflow-x-hidden bg-background text-white">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(62,166,255,0.15),transparent_60%),radial-gradient(circle_at_80%_0%,rgba(13,25,56,0.7),transparent_40%)]" />
        <div className="blur-[180px] opacity-40 absolute right-[-10%] top-[-5%] h-72 w-72 rounded-full bg-primary animate-blob" />
        <div className="blur-[200px] opacity-30 absolute left-[-5%] bottom-[-10%] h-72 w-72 rounded-full bg-primary-dark animate-blob" />
      </div>

      <nav className="sticky top-0 z-40 px-4 py-6 sm:px-6 lg:px-8">
        <div className="glass-panel relative flex items-center justify-between border border-white/10 bg-midnight/80 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <Link href="/applications" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
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
                <p className="font-display text-lg font-semibold tracking-tight text-white">
                  Ketdik
                </p>
                <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Visa Workspace
                </span>
              </div>
            </Link>
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium text-white/70 shadow-inner sm:flex">
              <ShieldCheck size={14} className="text-primary" />
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
                      ? 'bg-primary text-white shadow-[0_15px_35px_rgba(15,15,20,0.35)]'
                      : 'text-white/50 hover:bg-white/10 hover:text-white',
                  )}
                  onClick={() => router.push(link.href)}
                >
                  {link.label}
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide shadow-inner shadow-black/20 transition hover:bg-white/15 md:flex">
              <Languages size={16} className="text-white" />
              <select
                value={currentLang}
                onChange={(e) => changeLanguage(e.target.value)}
                className="bg-transparent text-xs font-semibold uppercase tracking-[0.2em] text-white focus:outline-none [&>option]:bg-[#0E1A2C] [&>option]:text-white [&>option]:text-white"
                style={{ color: 'white' }}
              >
                <option value="en" className="bg-[#0E1A2C] text-white">EN</option>
                <option value="ru" className="bg-[#0E1A2C] text-white">RU</option>
                <option value="uz" className="bg-[#0E1A2C] text-white">UZ</option>
              </select>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <div className="rounded-full bg-white/10 px-4 py-2 text-sm text-white">
                {user?.firstName} {user?.lastName}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full border border-white/10 !bg-transparent text-white shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
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
              className="glass-panel mt-4 flex flex-col gap-3 border border-white/10 bg-white/5 px-4 py-4 text-white md:hidden"
            >
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Button
                    key={link.href}
                    variant="ghost"
                    className={cn(
                      'justify-start rounded-2xl text-left',
                      isActive ? 'bg-primary text-white' : 'text-white/70 hover:bg-white/10',
                    )}
                    onClick={() => {
                      router.push(link.href);
                      setIsNavOpen(false);
                    }}
                  >
                    {link.label}
                  </Button>
                );
              })}

              <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                    {initials || 'U'}
                  </div>
                  <Button variant="secondary" className="flex-1 border border-white/10 text-white" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span className="ml-2">{t('profile.logout')}</span>
                  </Button>
                </div>

                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                  {t('profile.language')}
                </label>
                <select
                  value={currentLang}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white [&>option]:bg-[#0E1A2C] [&>option]:text-white"
                  style={{ color: 'white' }}
                >
                  <option value="en" className="bg-[#0E1A2C] text-white">English</option>
                  <option value="ru" className="bg-[#0E1A2C] text-white">Русский</option>
                  <option value="uz" className="bg-[#0E1A2C] text-white">O&apos;zbekcha</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="relative z-10 px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="relative z-10 border-t border-white/10 px-4 pb-8 pt-6 text-white/60 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            © {new Date().getFullYear()} Ketdik.{' '}
            {t('common.allRightsReserved')}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
            <button
              type="button"
              onClick={() => router.push('/chat')}
              className="inline-flex items-center gap-1 text-primary transition hover:opacity-80"
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

