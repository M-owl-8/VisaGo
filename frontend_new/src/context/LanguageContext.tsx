import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  availableLanguages: Array<{ code: string; name: string }>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<string>('en');
  const [isLoading, setIsLoading] = useState(true);

  const availableLanguages = [
    { code: 'en', name: 'English' },
    { code: 'ru', name: 'Русский' },
    { code: 'uz', name: "O'zbek" },
  ];

  // Load language preference from AsyncStorage on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('app_language');
        if (savedLanguage && availableLanguages.find(l => l.code === savedLanguage)) {
          setLanguageState(savedLanguage);
          await i18n.changeLanguage(savedLanguage);
        } else {
          // Fallback to English if no saved language
          await i18n.changeLanguage('en');
        }
      } catch (error) {
        console.error('Failed to load language preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, [i18n]);

  const setLanguage = async (newLanguage: string) => {
    try {
      if (!availableLanguages.find(l => l.code === newLanguage)) {
        console.warn(`Language ${newLanguage} not available`);
        return;
      }

      // Change i18n language
      await i18n.changeLanguage(newLanguage);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('app_language', newLanguage);
      
      // Update state
      setLanguageState(newLanguage);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  if (isLoading) {
    return null; // or return a loading screen if needed
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;