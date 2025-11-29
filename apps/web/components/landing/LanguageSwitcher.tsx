'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n?.language || 'en');

  // Update currentLang when i18n language changes (e.g., from other components)
  useEffect(() => {
    if (i18n) {
      setCurrentLang(i18n.language);
      
      // Listen for language changes to update state
      const handleLanguageChanged = (lng: string) => {
        setCurrentLang(lng);
      };
      
      i18n.on('languageChanged', handleLanguageChanged);
      
      return () => {
        i18n.off('languageChanged', handleLanguageChanged);
      };
    }
  }, [i18n]);

  const changeLanguage = async (lang: string) => {
    if (!i18n) return;
    // Change language and wait for it to complete
    // This will trigger 'languageChanged' event which updates all components
    await i18n.changeLanguage(lang);
    setCurrentLang(lang);
    // LanguageDetector will automatically save to localStorage with the configured key
    // But we also save explicitly to ensure consistency
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_language', lang);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold shadow-inner shadow-black/20 transition hover:bg-white/15',
        className
      )}
    >
      <Languages size={14} className="text-white" />
      <select
        value={currentLang}
        onChange={(e) => changeLanguage(e.target.value)}
        className="bg-transparent text-xs font-semibold uppercase tracking-[0.2em] text-white focus:outline-none [&>option]:bg-[#0E1A2C] [&>option]:text-white"
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
  );
}

