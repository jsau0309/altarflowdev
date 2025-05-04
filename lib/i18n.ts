import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { Resource } from 'i18next';

// Import all locale files
import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enLayout from '../locales/en/layout.json';
import enDashboard from '../locales/en/dashboard.json';
import enDonations from '../locales/en/donations.json';
import enExpenses from '../locales/en/expenses.json';
import enMembers from '../locales/en/members.json';
import enCampaigns from '../locales/en/campaigns.json';
import enReports from '../locales/en/reports.json';
import enSettings from '../locales/en/settings.json';
import enBanking from '../locales/en/banking.json';
import enOnboarding from '../locales/en/onboarding.json';
import enReceiptScanner from '../locales/en/receiptScanner.json';
import enCharts from '../locales/en/charts.json';
import enNfc from '../locales/en/nfc.json';
import enFlows from '../locales/en/flows.json';
import enConnectForm from '../locales/en/connect-form.json';

// Import all Spanish locale files
import esCommon from '../locales/es/common.json';
import esAuth from '../locales/es/auth.json';
import esLayout from '../locales/es/layout.json';
import esDashboard from '../locales/es/dashboard.json';
import esDonations from '../locales/es/donations.json';
import esExpenses from '../locales/es/expenses.json';
import esMembers from '../locales/es/members.json';
import esCampaigns from '../locales/es/campaigns.json';
import esReports from '../locales/es/reports.json';
import esSettings from '../locales/es/settings.json';
import esBanking from '../locales/es/banking.json';
import esOnboarding from '../locales/es/onboarding.json';
import esReceiptScanner from '../locales/es/receiptScanner.json';
import esCharts from '../locales/es/charts.json';
import esNfc from '../locales/es/nfc.json';
import esFlows from '../locales/es/flows.json';
import esConnectForm from '../locales/es/connect-form.json';

// Define resources structured by language and namespace
const resources: Resource = {
  en: {
    common: enCommon,
    auth: enAuth,
    layout: enLayout,
    dashboard: enDashboard,
    donations: enDonations,
    expenses: enExpenses,
    members: enMembers,
    campaigns: enCampaigns,
    reports: enReports,
    settings: enSettings,
    banking: enBanking,
    onboarding: enOnboarding,
    receiptScanner: enReceiptScanner,
    charts: enCharts,
    nfc: enNfc,
    flows: enFlows,
    'connect-form': enConnectForm
  },
  es: { 
    common: esCommon,
    auth: esAuth,
    layout: esLayout,
    dashboard: esDashboard,
    donations: esDonations,
    expenses: esExpenses,
    members: esMembers,
    campaigns: esCampaigns,
    reports: esReports,
    settings: esSettings,
    banking: esBanking,
    onboarding: esOnboarding,
    receiptScanner: esReceiptScanner,
    charts: esCharts,
    nfc: esNfc,
    flows: esFlows,
    'connect-form': esConnectForm
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: process.env.NODE_ENV === 'development',
    fallbackLng: 'en',
    resources,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    ns: [
      'common',
      'auth',
      'layout',
      'dashboard',
      'donations',
      'expenses',
      'members',
      'campaigns',
      'reports',
      'settings',
      'banking',
      'onboarding',
      'receiptScanner',
      'charts',
      'nfc',
      'flows',
      'connect-form'
    ],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    },
    // Using dot notation for nested keys
    keySeparator: '.',
    // Using colon for namespace separation in explicit calls
    nsSeparator: ':'
  });

export default i18n; 