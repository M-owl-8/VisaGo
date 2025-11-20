import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import ru from './ru.json';
import uz from './uz.json';
import es from './es.json';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  uz: { translation: uz },
  es: { translation: es },
};

/**
 * Get device system language
 * Returns language code (e.g., 'en', 'ru', 'uz') based on device locale
 */
const getDeviceLanguage = (): string => {
  try {
    let locale: string = 'en';
    
    // Try to get locale from NativeModules
    if (Platform.OS === 'ios') {
      // iOS: Try multiple methods
      const SettingsManager = NativeModules.SettingsManager;
      if (SettingsManager?.settings) {
        locale = SettingsManager.settings.AppleLocale || 
                 SettingsManager.settings.AppleLanguages?.[0] || 
                 'en';
      }
    } else {
      // Android: Use I18nManager
      const I18nManager = require('react-native').I18nManager;
      if (I18nManager?.localeIdentifier) {
        locale = I18nManager.localeIdentifier;
      } else if (NativeModules.I18nManager?.localeIdentifier) {
        locale = NativeModules.I18nManager.localeIdentifier;
      } else if (NativeModules.I18nManager?.locale) {
        locale = NativeModules.I18nManager.locale;
      }
    }
    
    // Fallback: Try to get from Intl API (if available)
    if (locale === 'en' && typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      try {
        const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
        if (intlLocale) {
          locale = intlLocale;
        }
      } catch (e) {
        // Ignore Intl errors
      }
    }
    
    // Extract language code (e.g., 'en-US' -> 'en', 'ru-RU' -> 'ru')
    const languageCode = locale.split('-')[0].toLowerCase();
    
    // Map to supported languages
    const supportedLanguages = ['en', 'ru', 'uz', 'es'];
    if (supportedLanguages.includes(languageCode)) {
      return languageCode;
    }
    
    // Map common language codes to supported languages
    const languageMap: Record<string, string> = {
      'uk': 'ru', // Ukrainian -> Russian (closest match)
      'be': 'ru', // Belarusian -> Russian
      'kk': 'ru', // Kazakh -> Russian
      'ky': 'ru', // Kyrgyz -> Russian
      'tg': 'ru', // Tajik -> Russian
      'az': 'uz', // Azerbaijani -> Uzbek (closest match)
      'tk': 'uz', // Turkmen -> Uzbek
    };
    
    return languageMap[languageCode] || 'en';
  } catch (error) {
    console.warn('Failed to detect device language, defaulting to English:', error);
    return 'en';
  }
};

/**
 * Initialize i18n with device language detection
 */
const initializeI18n = async () => {
  try {
    // Priority order:
    // 1. User's saved language from profile (if logged in)
    // 2. Saved language from AsyncStorage
    // 3. Device language (first install)
    // 4. Default to English
    
    let initialLanguage = 'en';
    
    // Check if user is logged in and has a language preference
    try {
      const userJson = await AsyncStorage.getItem('@user');
      if (userJson) {
        const user = JSON.parse(userJson);
        if (user.language && resources[user.language as keyof typeof resources]) {
          initialLanguage = user.language;
          // Also save to app_language for consistency
          await AsyncStorage.setItem('app_language', user.language);
        }
      }
    } catch (error) {
      // If user data doesn't exist or is invalid, continue to next check
    }
    
    // If no user language, check AsyncStorage
    if (initialLanguage === 'en') {
      const savedLanguage = await AsyncStorage.getItem('app_language');
      if (savedLanguage && resources[savedLanguage as keyof typeof resources]) {
        initialLanguage = savedLanguage;
      } else {
        // Use device language on first install
        initialLanguage = getDeviceLanguage();
        // Save device language for future use
        await AsyncStorage.setItem('app_language', initialLanguage);
      }
    }
    
    await i18next
      .use(initReactI18next)
      .init({
        resources,
        lng: initialLanguage,
        fallbackLng: 'en',
        interpolation: {
          escapeValue: false, // React already escapes values
        },
        compatibilityJSON: 'v3',
        react: {
          useSuspense: false, // Disable suspense for React Native
        },
      });
    
    return initialLanguage;
  } catch (error) {
    console.error('Failed to initialize i18n:', error);
    // Fallback initialization
    await i18next
      .use(initReactI18next)
      .init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
          escapeValue: false,
        },
        compatibilityJSON: 'v3',
        react: {
          useSuspense: false,
        },
      });
    return 'en';
  }
};

// Initialize i18n immediately (synchronously for initial render)
// The async initialization will happen in the background
i18next
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Temporary default, will be updated by initializeI18n
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3',
    react: {
      useSuspense: false,
    },
  });

// Initialize with device language in the background
initializeI18n().catch(error => {
  console.error('Background i18n initialization failed:', error);
});

export default i18next;
export { initializeI18n, getDeviceLanguage };