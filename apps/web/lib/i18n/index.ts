import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../../locales/en.json';
import ru from '../../locales/ru.json';
import uz from '../../locales/uz.json';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  uz: { translation: uz },
};

const getInitialLanguage = (): string => {
  // During SSR, default to English
  if (typeof window === 'undefined') return 'en';

  // Priority 1: User's saved language from profile
  try {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      if (user.language && resources[user.language as keyof typeof resources]) {
        return user.language;
      }
    }
  } catch (error) {
    // Continue to next check
  }

  // Priority 2: Saved language from localStorage
  try {
    const savedLanguage = localStorage.getItem('app_language');
    if (savedLanguage && resources[savedLanguage as keyof typeof resources]) {
      return savedLanguage;
    }
  } catch (error) {
    // Continue to next check
  }

  // Priority 3: Browser language
  try {
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language.split('-')[0].toLowerCase();
      if (resources[browserLang as keyof typeof resources]) {
        return browserLang;
      }
    }
  } catch (error) {
    // Continue to default
  }

  // Priority 4: Default to English
  return 'en';
};

// Initialize i18n - ensure it's ready before components use it
// On client side, we'll initialize in Providers component to avoid build-time evaluation
// On server side, initialize without React plugin
if (typeof window === 'undefined' && !i18next.isInitialized) {
  // Server-side/build: initialize without React plugin
  i18next.init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
}

// Export a function to initialize i18n on client side
export function initializeI18n(): Promise<void> {
  if (typeof window === 'undefined' || i18next.isInitialized) {
    return Promise.resolve();
  }

  return import('react-i18next')
    .then((module) => {
      if (!i18next.isInitialized) {
        try {
          const initialLanguage = getInitialLanguage();
          
          i18next
            .use(LanguageDetector)
            .use(module.initReactI18next)
            .init({
              resources,
              lng: initialLanguage, // Use our custom detection logic
              fallbackLng: 'en',
              interpolation: {
                escapeValue: false,
              },
              react: {
                useSuspense: false,
              },
              detection: {
                // Configure LanguageDetector to use app_language key for persistence
                lookupLocalStorage: 'app_language',
                caches: ['localStorage'],
                // Use localStorage first (which will read app_language), then browser language
                // This ensures our saved preference is respected, but also allows browser detection as fallback
                order: ['localStorage', 'navigator'],
              },
            });
        } catch (error) {
          console.error('[i18n] Error during initialization with React plugin:', error);
          // Fall through to fallback initialization
        }
      }
      // Always resolve, even if initialization had issues
      return Promise.resolve();
    })
    .catch((error) => {
      console.warn('[i18n] Failed to import react-i18next, using fallback initialization:', error);
      // Fallback: initialize without React plugin if import fails
      try {
        if (!i18next.isInitialized) {
          const initialLanguage = getInitialLanguage();
          
          i18next.use(LanguageDetector).init({
            resources,
            lng: initialLanguage,
            fallbackLng: 'en',
            interpolation: {
              escapeValue: false,
            },
            detection: {
              // Configure LanguageDetector to use app_language key for persistence
              lookupLocalStorage: 'app_language',
              caches: ['localStorage'],
              order: ['localStorage', 'navigator'],
            },
          });
        }
      } catch (fallbackError) {
        console.error('[i18n] Fallback initialization also failed:', fallbackError);
        // Last resort: initialize with minimal config
        if (!i18next.isInitialized) {
          i18next.init({
            resources,
            lng: 'en',
            fallbackLng: 'en',
            interpolation: {
              escapeValue: false,
            },
          });
        }
      }
      // Always resolve, even if all initialization attempts failed
      return Promise.resolve();
    });
}

export default i18next;
