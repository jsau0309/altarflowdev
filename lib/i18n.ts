import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Define resources directly
const resources = {
  en: {
    translation: {
      "welcome": "Welcome",
      "greeting": "Hello!"
      // Add other base translations here if needed
    }
  },
  // Add Spanish resources if available
  // es: {
  //   translation: {
  //     "welcome": "Bienvenido",
  //     "greeting": "¡Hola!"
  //   }
  // }
};

i18n
  // Remove http-backend usage
  // .use(Backend)
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass the i18n instance to react-i18next.
  .init({
    debug: true,
    fallbackLng: 'en',
    // Pass resources directly
    resources: resources,
    ns: ['translation'], // Ensure namespace is defined
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false // React already safes from xss
    },
    // Keep detection options, but backend options are no longer needed
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage', 'cookie'],
      htmlTag: typeof document !== 'undefined' ? document.documentElement : null,
      cookieOptions: { path: '/', sameSite: 'strict' }
    }
  });

export default i18n; 