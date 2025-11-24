#!/usr/bin/env node
/**
 * Batch ESLint Fix Script
 * Automatically fixes common ESLint issues
 */

const fs = require('fs');
const path = require('path');

// Files to fix - list all files with unused variables
const filesToFix = [
  { file: 'components/donation/donation-payment.tsx', pattern: 'churchId', replace: '_churchId', line: 51 },
  { file: 'components/landing/simple-features.tsx', pattern: 'Mail', remove: true },
  { file: 'components/landing/tabbed-features.tsx', pattern: 'Mail', remove: true },
  { file: 'components/members/enhanced-member-directory.tsx', pattern: 'onFilterChange', replace: '_onFilterChange' },
  { file: 'components/members/member-registration-form.tsx', pattern: 'setFormUrl', replace: '_setFormUrl' },
  { file: 'components/modals/campaign-modal.tsx', pattern: '_freq', exists: true }, // already prefixed
  { file: 'components/modals/campaign-modal.tsx', pattern: 'campaignData', replace: '_campaignData' },
  { file: 'components/payouts/payout-reconciliation-dashboard.tsx', pattern: 'result', replace: '_result' },
  { file: 'components/reports/monthly-bar-chart.tsx', pattern: 'useEffect', remove: true },
  { file: 'components/reports/monthly-bar-chart.tsx', pattern: 'useRef', remove: true },
  { file: 'components/reports/reports-page.tsx', pattern: 'LoaderOne', remove: true },
  { file: 'components/reports/reports-page.tsx', pattern: 'isTabChange', replace: '_isTabChange' },
  { file: 'components/settings/categories-settings.tsx', pattern: 'X', remove: true },
  { file: 'components/settings/landing-manager.tsx', pattern: 'Clock', remove: true },
  { file: 'components/settings/landing-manager.tsx', pattern: 'Calendar', remove: true },
  { file: 'components/settings/landing-manager.tsx', pattern: 'DAYS_OF_WEEK', replace: '_DAYS_OF_WEEK' },
  { file: 'components/settings/landing-page-preview.tsx', pattern: 'showDonateButton', replace: '_showDonateButton' },
  { file: 'components/settings/landing-page-preview.tsx', pattern: 'showConnectButton', replace: '_showConnectButton' },
  { file: 'components/settings/landing-page-preview.tsx', pattern: 'donateButtonText', replace: '_donateButtonText' },
  { file: 'components/settings/landing-page-preview.tsx', pattern: 'connectButtonText', replace: '_connectButtonText' },
  { file: 'components/settings/landing-manager-enhanced.tsx', pattern: 'User', remove: true },
  { file: 'components/settings/landing-manager-enhanced.tsx', pattern: 'parseError', replace: '_parseError' },
  { file: 'components/settings/landing-share-modal.tsx', pattern: 'err', replace: '_err' },
  { file: 'components/settings-content.tsx', pattern: 'useState', remove: true },
  { file: 'components/settings-content.tsx', pattern: 'initialChurchProfile', replace: '_initialChurchProfile' },
  { file: 'components/settings-content.tsx', pattern: 'i18n', replace: '_i18n' },
  { file: 'components/stripe/StripeConnectEmbeddedWrapper.tsx', pattern: 'useRef', remove: true },
  { file: 'components/stripe-connect-button.tsx', pattern: 'ExternalLink', remove: true },
  { file: 'components/stripe-connect-button.tsx', pattern: 'EffectiveStatus', replace: '_EffectiveStatus' },
  { file: 'components/stripe-connect-button.tsx', pattern: 'variant', replace: '_variant' },
  { file: 'components/stripe-connect-button.tsx', pattern: 'accountStatus', replace: '_accountStatus' },
  { file: 'components/ui/toaster.tsx', pattern: 'ToastProps', replace: '_ToastProps' },
  { file: 'components/ui/toaster.tsx', pattern: 'ToastActionElement', replace: '_ToastActionElement' },
  { file: 'lib/chart-utils.ts', pattern: 'data', replace: '_data' },
  { file: 'lib/chart-utils.ts', pattern: 'groupByKey', replace: '_groupByKey' },
  { file: 'lib/chart-utils.ts', pattern: 'aggregateKey', replace: '_aggregateKey' },
  { file: 'lib/chart-utils.ts', pattern: 'donations', replace: '_donations' },
  { file: 'lib/chart-utils.ts', pattern: 'expenses', replace: '_expenses' },
  { file: 'lib/chart-utils.ts', pattern: 'categoryKey', replace: '_categoryKey' },
  { file: 'lib/crop-image.ts', pattern: 'rotation', replace: '_rotation' },
  { file: 'lib/email/templates/new-member-welcome.ts', pattern: 'escapeHtmlAttribute', remove: true },
  { file: 'lib/email/templates/new-member-welcome.ts', pattern: 'escapeAndValidateUrl', remove: true },
  { file: 'lib/email/templates/new-member-welcome.ts', pattern: 'stayConnectedTitle', replace: '_stayConnectedTitle' },
  { file: 'lib/i18n.server.ts', pattern: 'initReactI18next', remove: true },
  { file: 'lib/sentry.ts', pattern: 'webhookLogger', remove: true },
  { file: 'lib/subscription-helpers.ts', pattern: 'Church', remove: true },
  { file: 'lib/file-upload-stream.ts', pattern: 'fileName', replace: '_fileName' },
];

console.log(`Batch fixing ${filesToFix.length} file issues...`);
console.log('This script is a placeholder - fixes are being applied directly via StrReplace tool');
