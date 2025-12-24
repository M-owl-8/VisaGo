'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, LogOut, MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { ApplicationTypeModal } from '@/components/modals/ApplicationTypeModal';

function normalizeRole(role: string | undefined | null): 'user' | 'admin' | 'super_admin' {
  if (!role) return 'user';
  const lower = role.toLowerCase().trim();
  if (lower === 'super_admin' || lower === 'superadmin') return 'super_admin';
  if (lower === 'admin') return 'admin';
  return 'user';
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isSignedIn } = useAuthStore();
  const [currentLang, setCurrentLang] = useState('en');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [showApplicationTypeModal, setShowApplicationTypeModal] = useState(false);

  // Check if user is admin (using normalizeRole for consistency)
  const userRole = normalizeRole(user?.role);
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  useEffect(() => {
    if (i18n) {
      setCurrentLang(i18n.language);
    }
  }, [i18n]);

  const navLinks = useMemo(
    () => {
      const links = [
        { href: '/applications', label: t('applications.title') },
        { href: '/chat', label: t('chat.aiAssistant') },
        { href: '/profile', label: t('profile.profile') },
        { href: '/support', label: t('helpSupport.title') },
      ];
      
      // Add admin link if user is admin
      if (isAdmin) {
        links.push({ href: '/admin/users', label: 'Admin Panel' });
      }
      
      return links;
    },
    [t, isAdmin]
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
    <div className="relative flex min-h-full flex-col overflow-hidden bg-background text-white">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(62,166,255,0.15),transparent_60%),radial-gradient(circle_at_80%_0%,rgba(13,25,56,0.7),transparent_40%)]" />
        <div className="blur-[180px] opacity-40 absolute right-[-10%] top-[-5%] h-72 w-72 rounded-full bg-primary animate-blob" />
        <div className="blur-[200px] opacity-30 absolute left-[-5%] bottom-[-10%] h-72 w-72 rounded-full bg-primary-dark animate-blob" />
      </div>

      <nav className={cn(
        "sticky top-0 z-40 shrink-0 px-3 py-2.5 sm:px-4 sm:py-3 lg:px-8",
        pathname === '/chat' && "bg-gradient-to-b from-background/95 to-background/80 backdrop-blur-xl"
      )}>
        <div className={cn(
          "glass-panel relative flex items-center justify-between border border-white/10 px-3 py-2.5 text-white sm:px-4 sm:py-3 md:px-6",
          pathname === '/chat' ? "bg-midnight/95 backdrop-blur-xl shadow-lg" : "bg-midnight/80"
        )}>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/applications" className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.45)] sm:h-12 sm:w-12">
                <Image
                  src="/images/ketdik-icon.png"
                  alt="Ketdik icon"
                  width={40}
                  height={40}
                  priority
                  unoptimized
                  className="h-8 w-8 rounded-2xl object-cover sm:h-10 sm:w-10"
                />
              </div>
              <div>
                <p className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                  Ketdik
                </p>
              </div>
            </Link>
          </div>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link, index) => {
              const isActive = pathname.startsWith(link.href);
              // De-emphasize non-application links when viewing application detail
              const isInApplicationDetail = pathname.startsWith('/applications/') && pathname !== '/applications';
              const isApplicationLink = link.href === '/applications';
              const shouldDeEmphasize = isInApplicationDetail && !isApplicationLink && link.href !== '/chat';
              
              return (
                <React.Fragment key={link.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'rounded-full px-5 py-2 text-sm font-semibold transition',
                      isActive
                        ? 'bg-primary text-white shadow-[0_15px_35px_rgba(15,15,20,0.35)] hover:bg-primary-dark'
                        : shouldDeEmphasize
                        ? 'text-white/30 hover:bg-white/10 hover:text-white/60'
                        : 'text-white/50 hover:bg-white/10 hover:text-white'
                    )}
                    onClick={() => router.push(link.href)}
                  >
                    {link.label}
                  </Button>
                  
                  {/* Insert Start New Application button right after Applications */}
                  {isApplicationLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full px-5 py-2 text-sm font-semibold transition text-white/50 hover:bg-white/10 hover:text-white"
                      onClick={() => setShowApplicationTypeModal(true)}
                    >
                      {t('applications.startNewApplication', 'Start New Application')}
                    </Button>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop: Language + Profile + Logout */}
            <div className="hidden items-center gap-3 md:flex">
              <select
                value={currentLang}
                onChange={(e) => changeLanguage(e.target.value)}
                className="appearance-none cursor-pointer rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-primary/50 [&>option]:bg-[#0E1A2C] [&>option]:text-white"
                style={{ color: 'white' }}
              >
                <option value="en">EN</option>
                <option value="ru">RU</option>
                <option value="uz">UZ</option>
              </select>

              <div className="rounded-full bg-white/10 px-4 py-2 text-sm text-white">
                {user?.firstName} {user?.lastName}
              </div>
              
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full border border-white/10 !bg-transparent px-4 py-2 text-sm text-white shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span className="ml-2">{t('profile.logout')}</span>
              </Button>
            </div>

            {/* Mobile: Hamburger Menu */}
            <button
              type="button"
              onClick={() => setIsNavOpen((prev) => !prev)}
              className="flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-white/10 active:scale-95 md:hidden"
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
                // De-emphasize non-application links when viewing application detail
                const isInApplicationDetail = pathname.startsWith('/applications/') && pathname !== '/applications';
                const isApplicationLink = link.href === '/applications';
                const shouldDeEmphasize = isInApplicationDetail && !isApplicationLink && link.href !== '/chat';
                
                return (
                  <React.Fragment key={link.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        'justify-start rounded-2xl text-left h-12 text-base font-medium',
                        isActive 
                          ? 'bg-primary text-white hover:bg-primary-dark' 
                          : shouldDeEmphasize
                          ? 'text-white/40 hover:bg-white/10'
                          : 'text-white/70 hover:bg-white/10'
                      )}
                      onClick={() => {
                        router.push(link.href);
                        setIsNavOpen(false);
                      }}
                    >
                      {link.label}
                    </Button>
                    
                    {/* Insert Start New Application button right after Applications in mobile menu */}
                    {isApplicationLink && (
                      <Button
                        variant="ghost"
                        className="justify-start rounded-2xl text-left h-12 text-base font-medium text-white/70 hover:bg-white/10"
                        onClick={() => {
                          setShowApplicationTypeModal(true);
                          setIsNavOpen(false);
                        }}
                      >
                        {t('applications.startNewApplication', 'Start New Application')}
                      </Button>
                    )}
                  </React.Fragment>
                );
              })}

              <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                    {initials || 'U'}
                  </div>
                  <Button
                    variant="ghost"
                    className="flex-1 min-w-0 h-11 border border-white/20 !bg-transparent text-white hover:bg-white/10 hover:border-white/40 transition active:scale-95"
                    onClick={handleLogout}
                  >
                    <LogOut size={18} className="shrink-0" />
                    <span className="ml-2 truncate font-medium">{t('profile.logout')}</span>
                  </Button>
                </div>

                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                  {t('profile.language')}
                </label>
                <select
                  value={currentLang}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white [&>option]:bg-[#0E1A2C] [&>option]:text-white"
                  style={{ color: 'white' }}
                >
                  <option value="en" className="bg-[#0E1A2C] text-white">
                    EN
                  </option>
                  <option value="ru" className="bg-[#0E1A2C] text-white">
                    RU
                  </option>
                  <option value="uz" className="bg-[#0E1A2C] text-white">
                    UZ
                  </option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main id="main-content" className={cn("relative z-10 flex-1", pathname === '/chat' && "overflow-hidden")} role="main">
        {children}
      </main>

      {pathname !== '/chat' && (
        <footer className="relative z-10 shrink-0 border-t border-white/10 px-3 py-3 text-white/60 sm:px-4 sm:py-4 lg:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            © {new Date().getFullYear()} Ketdik. {t('common.allRightsReserved')}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/privacy" className="transition hover:text-white">
              {t('common.privacy', 'Privacy')}
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              {t('common.terms', 'Terms')}
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
      )}

      {/* Application Type Modal */}
      <ApplicationTypeModal 
        isOpen={showApplicationTypeModal} 
        onClose={() => setShowApplicationTypeModal(false)} 
      />
    </div>
  );
}
