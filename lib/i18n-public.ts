import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import public page translations only
import enDonations from '../locales/en/donations.json';
import esDonations from '../locales/es/donations.json';
import enConnectForm from '../locales/en/connect-form.json';
import esConnectForm from '../locales/es/connect-form.json';
import enCommon from '../locales/en/common.json';
import esCommon from '../locales/es/common.json';

// Create separate i18n instance for public pages
const publicI18n = i18n.createInstance();

publicI18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: process.env.NODE_ENV === 'development',
    fallbackLng: 'en',
    resources: {
      en: {
        common: enCommon,
        donations: enDonations,
        'connect-form': enConnectForm,
      },
      es: {
        common: esCommon,
        donations: esDonations,
        'connect-form': esConnectForm,
      }
    },
    detection: {
      // Critical: Use separate localStorage key to avoid interference with dashboard
      lookupLocalStorage: 'publicPageLng',
      lookupSessionStorage: 'publicPageLng',
      order: ['localStorage', 'sessionStorage', 'navigator'],
      caches: ['localStorage', 'sessionStorage'],
    },
    ns: ['common', 'donations', 'connect-form'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    },
    keySeparator: '.',
    nsSeparator: ':'
  });

export default publicI18n;
