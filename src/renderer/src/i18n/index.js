import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationFR from './locales/fr/translation.json';
import translationAR from './locales/ar/translation.json';

const resources = {
  en: { translation: translationEN },
  fr: { translation: translationFR },
  ar: { translation: translationAR }
};

i18n
  // Detects the user language (e.g., from browser or localStorage)
  .use(LanguageDetector)
  // Passes i18n instance to react-i18next
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    // We will handle RTL dynamically in the App container based on the selected language
    debug: false,
    
    interpolation: {
      escapeValue: false, // React already safeguards against XSS
      // {{currency}} in any translation; AppShell keeps it in sync with the store's currency
      defaultVariables: { currency: 'DZD' }
    }
  });

export default i18n;
