import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  // Load translation using http -> see /public/locales (i.e. https://github.com/i18next/react-i18next/tree/master/example/react/public/locales)
  // learn more: https://github.com/i18next/i18next-http-backend
  .use(HttpBackend)
  // Detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // Init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    fallbackLng: 'en',
    // debug: process.env.NODE_ENV === 'development', // Enable debug output in development
    debug: true, // TODO: Set to false in production, possibly via env var
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    backend: {
      // Path where resources get loaded from
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    // Default namespace
    ns: ['translation'],
    defaultNS: 'translation',
    detection: {
      // Order and from where user language should be detected
      order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      // Keys or params to lookup language from
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      lookupLocalStorage: 'i18nextLng',
      lookupSessionStorage: 'i18nextLng',
      lookupFromPathIndex: 0,
      lookupFromSubdomainIndex: 0,
      // Cache user language on
      caches: ['localStorage', 'cookie'],
      excludeCacheFor: ['cimode'], // Languages to not persist (cookie, localStorage)
      // Optional expire and domain for set cookie
      cookieMinutes: 10,
      cookieDomain: 'myDomain',
      // Optional htmlTag attribute which defaults to the html tag
      // Note: This line assumes browser environment. May need adjustment for SSR.
      htmlTag: document.documentElement,
      // Optional set cookie options, reference:[MDN Set-Cookie docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
      cookieOptions: { path: '/', sameSite: 'strict' }
    }
  });

export default i18n; 