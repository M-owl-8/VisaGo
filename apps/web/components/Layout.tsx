'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/lib/stores/auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isSignedIn } = useAuthStore();
  const [currentLang, setCurrentLang] = useState('en');

  useEffect(() => {
    if (i18n) {
      setCurrentLang(i18n.language);
    }
  }, [i18n]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const changeLanguage = (lang: string) => {
    if (i18n) {
      i18n.changeLanguage(lang);
      setCurrentLang(lang);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_language', lang);
      }
    }
  };

  if (!isSignedIn) {
    return <>{children}</>;
  }

  const navLinks = [
    { href: '/applications', label: t('applications.title') },
    { href: '/questionnaire', label: 'Questionnaire' },
    { href: '/chat', label: t('chat.aiAssistant') },
    { href: '/profile', label: t('profile.profile') },
    { href: '/support', label: t('helpSupport.title') },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <Link href="/applications" className="text-xl font-bold text-primary-600">
                  Ketdik
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                      pathname === link.href
                        ? 'border-primary-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <select
                  value={currentLang}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="en">EN</option>
                  <option value="ru">RU</option>
                  <option value="uz">UZ</option>
                </select>
              </div>
              <div className="text-sm text-gray-700">
                {user?.firstName} {user?.lastName}
              </div>
              <button
                onClick={handleLogout}
                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                {t('profile.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600">
            <div className="mb-4 sm:mb-0">
              © {new Date().getFullYear()} Ketdik. {t('common.allRightsReserved', 'All rights reserved.')}
            </div>
            <div className="flex space-x-6">
              <Link
                href="/privacy"
                className="hover:text-primary-600 transition-colors"
              >
                {t('common.privacyPolicy', 'Privacy Policy')}
              </Link>
              <Link
                href="/terms"
                className="hover:text-primary-600 transition-colors"
              >
                {t('common.termsOfService', 'Terms of Service')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

