/**
 * Final component migration - 19 remaining instances
 * Handles edge cases and validates console override patterns
 */

import * as fs from 'fs';
import * as path from 'path';

interface Migration {
  file: string;
  line: number;
  pattern: RegExp;
  replacement: string;
  skip?: boolean; // For intentional console overrides
}

// Manual migrations for remaining 19 instances
const migrations: Migration[] = [
  // donation-details.tsx - Line 41
  {
    file: 'components/donation/donation-details.tsx',
    line: 41,
    pattern: /console\.warn\('Attempted to submit with invalid form data\. Fund\/Campaign selected:', isFundOrCampaignSelected, 'Amount valid:', isAmountValid\);/,
    replacement: "logger.warn('Attempted to submit with invalid form data', { operation: 'ui.donation.validation_failed', isFundOrCampaignSelected, isAmountValid });"
  },

  // donation-payment.tsx - Lines 61, 62, 82 - SKIP (intentional console override)
  {
    file: 'components/donation/donation-payment.tsx',
    line: 61,
    pattern: /const originalConsoleError = console\.error;/,
    replacement: '', // Keep as-is
    skip: true
  },

  // subscription-pricing.tsx - Line 103
  {
    file: 'components/settings/subscription-pricing.tsx',
    line: 103,
    pattern: /console\.log\('🔍 Subscription Debug:', \{/,
    replacement: "logger.debug('Subscription Debug', { operation: 'ui.subscription.debug', data: {"
  },

  // language-switcher.tsx - Line 34
  {
    file: 'components/landing/language-switcher.tsx',
    line: 34,
    pattern: /console\.info\('Language preference will not persist across sessions'\)/,
    replacement: "logger.info('Language preference will not persist across sessions', { operation: 'ui.language.info' })"
  },

  // error-boundary.tsx - Line 28
  {
    file: 'components/error-boundary.tsx',
    line: 28,
    pattern: /console\.error\('Error caught by boundary:', error, errorInfo\)/,
    replacement: "logger.error('Error caught by boundary', { operation: 'ui.error_boundary', errorInfo }, error instanceof Error ? error : new Error(String(error)))"
  },

  // mobile-scan-view.tsx - Lines 113, 147
  {
    file: 'components/receipt-scanner/mobile-scan-view.tsx',
    line: 113,
    pattern: /console\.warn\("Torch toggle failed", error\)/,
    replacement: 'logger.warn("Torch toggle failed", { operation: "ui.scanner.torch_error" }, error instanceof Error ? error : new Error(String(error)))'
  },
  {
    file: 'components/receipt-scanner/mobile-scan-view.tsx',
    line: 147,
    pattern: /console\.warn\("Unable to disable torch", error\)/,
    replacement: 'logger.warn("Unable to disable torch", { operation: "ui.scanner.torch_disable_error" }, error instanceof Error ? error : new Error(String(error)))'
  },

  // receipt-scanner-modal.tsx - Line 115
  {
    file: 'components/receipt-scanner/receipt-scanner-modal.tsx',
    line: 115,
    pattern: /console\.error\("Receipt processing error:", err\)/,
    replacement: 'logger.error("Receipt processing error", { operation: "ui.receipt.processing_error" }, err instanceof Error ? err : new Error(String(err)))'
  },

  // donation-details-drawer.tsx - Line 62
  {
    file: 'components/donations/donation-details-drawer.tsx',
    line: 62,
    pattern: /console\.error\("Failed to fetch donation details:", err\)/,
    replacement: 'logger.error("Failed to fetch donation details", { operation: "ui.donation.fetch_error" }, err instanceof Error ? err : new Error(String(err)))'
  },

  // donor-details-drawer.tsx - Line 44
  {
    file: 'components/donations/donor-details-drawer.tsx',
    line: 44,
    pattern: /console\.error\("Failed to fetch donor details:", err\)/,
    replacement: 'logger.error("Failed to fetch donor details", { operation: "ui.donor.fetch_error" }, err instanceof Error ? err : new Error(String(err)))'
  },

  // access-control-wrapper.tsx - Line 62
  {
    file: 'components/layout/access-control-wrapper.tsx',
    line: 62,
    pattern: /console\.error\('Error fetching subscription info:', err\)/,
    replacement: "logger.error('Error fetching subscription info', { operation: 'ui.subscription.fetch_error' }, err instanceof Error ? err : new Error(String(err)))"
  },

  // theme-error-boundary.tsx - Line 36
  {
    file: 'components/providers/theme-error-boundary.tsx',
    line: 36,
    pattern: /console\.error\('Theme Error Boundary caught:', \{/,
    replacement: "logger.error('Theme Error Boundary caught', { operation: 'ui.theme.error_boundary', data: {"
  },

  // generate-report-modal.tsx - Line 158
  {
    file: 'components/modals/generate-report-modal.tsx',
    line: 158,
    pattern: /console\.error\("Error generating report:", err\)/,
    replacement: 'logger.error("Error generating report", { operation: "ui.report.generation_error" }, err instanceof Error ? err : new Error(String(err)))'
  },

  // new-donor-modal.tsx - Line 123
  {
    file: 'components/modals/new-donor-modal.tsx',
    line: 123,
    pattern: /console\.error\(result\.error\);/,
    replacement: 'logger.error("Donor creation failed", { operation: "ui.donor.creation_error", error: result.error });'
  },

  // financial-analysis-content.tsx - Line 121
  {
    file: 'components/reports/financial/financial-analysis-content.tsx',
    line: 121,
    pattern: /console\.error\('\[Financial Analysis Error\]', \{/,
    replacement: "logger.error('Financial Analysis Error', { operation: 'ui.report.analysis_error', data: {"
  },

  // reports-page.tsx - Line 196
  {
    file: 'components/reports/reports-page.tsx',
    line: 196,
    pattern: /console\.error\('Error fetching report data:', err\)/,
    replacement: "logger.error('Error fetching report data', { operation: 'ui.report.fetch_error' }, err instanceof Error ? err : new Error(String(err)))"
  },

  // StripeConnectEmbeddedWrapper.tsx - Line 149
  {
    file: 'components/stripe/StripeConnectEmbeddedWrapper.tsx',
    line: 149,
    pattern: /console\.error\(errorMessage\);/,
    replacement: 'logger.error("Stripe Connect initialization error", { operation: "ui.stripe.init_error", error: errorMessage });'
  }
];

function migrateFile(filePath: string, fileMigrations: Migration[]) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const initialCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;

  if (initialCount === 0) return { file: filePath, migrated: 0 };

  // Apply migrations
  let migrated = 0;
  fileMigrations.forEach((m) => {
    if (m.skip) return; // Skip intentional console overrides

    const before = content;
    content = content.replace(m.pattern, m.replacement);
    if (content !== before) migrated++;
  });

  // Add logger import if not present and we migrated something
  if (migrated > 0 && !content.includes("from '@/lib/logger'")) {
    const lines = content.split('\n');
    let insertIndex = 0;

    // Find where to insert (after "use client" if present)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('"use client"') || lines[i].includes("'use client'")) {
        insertIndex = i + 1;
        break;
      }
      if (lines[i].trim().startsWith('import ')) {
        insertIndex = i;
        break;
      }
    }

    // If no imports and no "use client", add at top
    if (insertIndex === 0 && lines.length > 0) {
      const hasUseClient = content.includes('"use client"') || content.includes("'use client'");
      if (!hasUseClient) {
        lines.splice(0, 0, '"use client";\n');
        insertIndex = 1;
      }
    }

    lines.splice(insertIndex, 0, "import { logger } from '@/lib/logger';");
    content = lines.join('\n');
  }

  const finalCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;

  if (migrated > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return {
    file: filePath,
    initial: initialCount,
    final: finalCount,
    migrated,
    skipped: fileMigrations.filter(m => m.skip).length
  };
}

async function main() {
  console.log('=== Migrating final 19 component console.log instances ===\n');

  // Group migrations by file
  const fileGroups = new Map<string, Migration[]>();
  migrations.forEach(m => {
    if (!fileGroups.has(m.file)) {
      fileGroups.set(m.file, []);
    }
    fileGroups.get(m.file)!.push(m);
  });

  const results = [];
  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const [file, fileMigrations] of fileGroups.entries()) {
    const fullPath = path.join(process.cwd(), file);

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  ${file}: File not found`);
      continue;
    }

    const result = migrateFile(fullPath, fileMigrations);

    if (result.migrated > 0 || result.skipped > 0) {
      const skipMsg = result.skipped > 0 ? ` (${result.skipped} intentionally skipped)` : '';
      console.log(`✓ ${file}: ${result.migrated} migrated, ${result.final} remaining${skipMsg}`);
      results.push(result);
      totalMigrated += result.migrated;
      totalSkipped += result.skipped;
    }
  }

  console.log(`\n=== Final component migration complete! ===`);
  console.log(`Total files processed: ${results.length}`);
  console.log(`Total instances migrated: ${totalMigrated}`);
  console.log(`Total instances skipped (intentional): ${totalSkipped}`);
  console.log(`\nNote: donation-payment.tsx has 3 intentional console overrides (library error suppression)`);
}

main().catch(console.error);
