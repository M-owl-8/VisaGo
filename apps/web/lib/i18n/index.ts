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

// Initialize i18n - only once
// During SSR/build, initialize without React plugin to avoid createContext errors
if (!i18next.isInitialized) {
  if (typeof window !== 'undefined') {
    // Client-side: dynamically import and use React plugin
    // Use dynamic import to prevent evaluation during build
    import('react-i18next')
      .then((module) => {
        if (!i18next.isInitialized) {
          i18next
            .use(LanguageDetector)
            .use(module.initReactI18next)
            .init({
              resources,
              lng: getInitialLanguage(),
              fallbackLng: 'en',
              interpolation: {
                escapeValue: false,
              },
              react: {
                useSuspense: false,
              },
            });
        }
      })
      .catch(() => {
        // Fallback: initialize without React plugin if import fails
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
      });
    
    // Also initialize synchronously for immediate use (without React plugin initially)
    // The React plugin will be added asynchronously
    i18next.use(LanguageDetector).init({
      resources,
      lng: getInitialLanguage(),
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });
  } else {
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
}

export default i18next;
