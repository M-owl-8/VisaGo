import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
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

i18next
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    compatibilityJSON: 'v3',
  });

export default i18next;