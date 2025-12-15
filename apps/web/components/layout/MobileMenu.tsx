'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { X, Globe, User, LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';
import Image from 'next/image';

export function MobileMenu() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const currentLang = i18n.language;

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    if (user) {
      // Update user language preference in backend (fire and forget)
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ language: lang }),
      }).catch(() => {});
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Close menu on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger Button - Only visible on mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center rounded-lg p-2 text-white transition hover:bg-white/10 md:hidden"
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      {/* Slide-out Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed right-0 top-0 z-50 h-full w-80 max-w-[85vw] bg-midnight/95 backdrop-blur-xl border-l border-white/10 shadow-2xl md:hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h2 className="text-lg font-semibold text-white">{t('menu.title', 'Menu')}</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Menu Content */}
            <div className="flex flex-col p-4 space-y-6">
              {/* User Info */}
              {user && (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary-dark/20">
                    {user.photoUrl ? (
                      <Image
                        src={user.photoUrl}
                        alt={user.firstName || 'User'}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                    ) : (
                      <User size={24} className="text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="truncate text-sm text-white/60">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Language Selector */}
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50">
                  <Globe size={12} className="mr-1.5 inline" />
                  {t('menu.language', 'Language')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['en', 'ru', 'uz'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => changeLanguage(lang)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold uppercase transition ${
                        currentLang === lang
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Link */}
              <button
                onClick={() => {
                  router.push('/profile');
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
              >
                <User size={20} className="text-white/70" />
                <span className="text-sm font-medium text-white">{t('menu.profile', 'Profile')}</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-left transition hover:bg-rose-500/20"
              >
                <LogOut size={20} className="text-rose-400" />
                <span className="text-sm font-medium text-rose-300">{t('menu.logout', 'Logout')}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

