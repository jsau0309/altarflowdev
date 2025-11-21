/**
 * Batch migration for Phase 3.6 and 3.7
 * Migrates remaining lib/ and utils/ console.log instances
 */

import * as fs from 'fs';
import * as path from 'path';

interface FileMigration {
  file: string;
  needsImport: boolean;
  replacements: Array<{ old: RegExp; new: string }>;
}

const migrations: FileMigration[] = [
  // Phase 3.6 - Medium Priority
  {
    file: 'utils/stripe/server.ts',
    needsImport: true,
    replacements: [
      { old: /console\.log\("checkout with referral id:", referralId\)/, new: "logger.debug('Checkout with referral ID', { operation: 'stripe.checkout.referral', referralId })" },
      { old: /console\.error\(err\);/g, new: "logger.error('Stripe operation error', { operation: 'stripe.error' }, err instanceof Error ? err : new Error(String(err)));" },
      { old: /console\.error\(`Could not find profile for user \$\{userId\}\.\`\);/, new: "logger.error('Could not find profile for user', { operation: 'stripe.profile_not_found', userId });" },
      { old: /console\.warn\("Stripe customer retrieval\/creation logic is commented out in createStripePortal\."\);/, new: "logger.warn('Stripe customer logic commented out', { operation: 'stripe.portal.commented_logic' });" },
      { old: /console\.error\('Error creating billing portal session:', error\)/, new: "logger.error('Error creating billing portal session', { operation: 'stripe.portal.error' }, error instanceof Error ? error : new Error(String(error)));" },
    ]
  },
  {
    file: 'lib/prisma-middleware.ts',
    needsImport: true,
    replacements: [
      { old: /console\.warn\('\[Prisma\] Connection error detected, retrying\.\.\.', \{/, new: "logger.warn('Prisma connection error - retrying', { operation: 'database.prisma_retry', " },
      { old: /console\.error\('\[Prisma\] Retry failed:', \{/, new: "logger.error('Prisma retry failed', { operation: 'database.prisma_retry_failed', " },
    ]
  },
  {
    file: 'lib/monitoring/connection-pool-monitor.ts',
    needsImport: true,
    replacements: [
      { old: /console\.warn\('\[Connection Pool\]', \{/, new: "logger.warn('Connection pool warning', { operation: 'database.pool_warning', " },
      { old: /console\.warn\('\[Slow Queries\]', status\.slowQueries\.map\(q => \(\{/, new: "logger.warn('Slow queries detected', { operation: 'database.slow_queries', queries: status.slowQueries.map(q => ({" },
      { old: /console\.warn\(`\[Slow Query\] \$\{endpoint\} took \$\{duration\}ms`\);/, new: "logger.warn('Slow query detected', { operation: 'database.slow_query', endpoint, duration });" },
      { old: /console\.error\(`\[Connection Pool Error\] \$\{endpoint\}:`, \{/, new: "logger.error('Connection pool error', { operation: 'database.pool_error', endpoint, " },
    ]
  },

  // Phase 3.7 - Lower Priority Utilities
  {
    file: 'lib/gemini-receipt-ocr.ts',
    needsImport: true,
    replacements: [
      { old: /console\.error\('\[Gemini OCR\] Attempt failed', \{/, new: "logger.warn('Gemini OCR attempt failed', { operation: 'ai.gemini.attempt_failed', " },
      { old: /console\.error\('\[Gemini OCR\] All attempts failed\. Falling back to manual entry\.', JSON\.stringify\(lastAttemptError\)\);/, new: "logger.error('Gemini OCR all attempts failed', { operation: 'ai.gemini.all_failed', lastError: JSON.stringify(lastAttemptError) });" },
    ]
  },
  {
    file: 'utils/ai/openai.ts',
    needsImport: true,
    replacements: [
      { old: /console\.error\("Unexpected OpenAI response:", JSON\.stringify\(response\)\);/, new: 'logger.error("Unexpected OpenAI response", { operation: "ai.openai.unexpected_response", response: JSON.stringify(response) });' },
      { old: /console\.error\("Error generating completion:", error\);/, new: 'logger.error("Error generating completion", { operation: "ai.openai.generation_error" }, error instanceof Error ? error : new Error(String(error)));' },
    ]
  },
  {
    file: 'lib/email/resend-service.ts',
    needsImport: true,
    replacements: [
      // Will need to check actual patterns
    ]
  },
  {
    file: 'lib/subscription.ts',
    needsImport: true,
    replacements: [
      { old: /console\.error\('\[Subscription\] Invalid trialEndsAt date:', church\.trialEndsAt\);/, new: "logger.error('Invalid trialEndsAt date', { operation: 'subscription.invalid_trial_date', trialEndsAt: church.trialEndsAt });" },
      { old: /console\.error\('\[Subscription\] Invalid freeTrialStartedAt date:', church\.freeTrialStartedAt\);/, new: "logger.error('Invalid freeTrialStartedAt date', { operation: 'subscription.invalid_started_date', freeTrialStartedAt: church.freeTrialStartedAt });" },
    ]
  },
  {
    file: 'lib/file-upload-stream.ts',
    needsImport: true,
    replacements: [
      { old: /console\.error\('Stream upload error:', error\);/, new: "logger.error('Stream upload error', { operation: 'file.upload_stream_error' }, error instanceof Error ? error : new Error(String(error)));" },
    ]
  },
  {
    file: 'lib/validation/button-validation.ts',
    needsImport: true,
    replacements: [
      { old: /console\.warn\('Button configuration is not an array, returning empty array'\);/, new: "logger.warn('Button configuration invalid format', { operation: 'validation.button.not_array' });" },
      { old: /console\.warn\('Invalid button configuration found:', item\);/, new: "logger.warn('Invalid button configuration found', { operation: 'validation.button.invalid_item', item });" },
      { old: /console\.warn\('Unexpected button JSON format:', typeof buttonsJson\);/, new: "logger.warn('Unexpected button JSON format', { operation: 'validation.button.unexpected_type', type: typeof buttonsJson });" },
      { old: /console\.error\('Failed to parse button configuration:', error\);/, new: "logger.error('Failed to parse button configuration', { operation: 'validation.button.parse_error' }, error instanceof Error ? error : new Error(String(error)));" },
    ]
  },
  {
    file: 'lib/cache/landing-page-cache.ts',
    needsImport: true,
    replacements: [
      // Will scan for patterns
    ]
  },
  {
    file: 'lib/stripe.ts',
    needsImport: true,
    replacements: [
      { old: /console\.warn\('STRIPE_WEBHOOK_SECRET is not set in environment variables\. Webhook signature verification will be skipped\.'\);/, new: "logger.warn('STRIPE_WEBHOOK_SECRET not configured', { operation: 'stripe.config.missing_webhook_secret', env: process.env.NODE_ENV });" },
    ]
  },
];

function migrateFile(migration: FileMigration): number {
  const filePath = path.join(process.cwd(), migration.file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${migration.file}`);
    return 0;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let migratedCount = 0;

  // Add import if needed
  if (migration.needsImport && !content.includes("from '@/lib/logger'")) {
    const lines = content.split('\n');
    let insertIndex = 0;

    // Find first import
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        insertIndex = i + 1;
        break;
      }
      if (lines[i].includes("'use server'") || lines[i].includes('"use server"')) {
        insertIndex = i + 2; // After 'use server' and blank line
      }
    }

    lines.splice(insertIndex, 0, "import { logger } from '@/lib/logger';");
    content = lines.join('\n');
  }

  // Apply replacements
  migration.replacements.forEach((replacement) => {
    const before = content;
    content = content.replace(replacement.old, replacement.new);
    if (content !== before) {
      migratedCount++;
    }
  });

  if (migratedCount > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return migratedCount;
}

function main() {
  console.log('=== Migrating Phase 3.6 & 3.7 Files ===\n');

  let totalMigrated = 0;
  migrations.forEach((migration) => {
    const count = migrateFile(migration);
    if (count > 0) {
      console.log(`✅ ${migration.file}: ${count} instances migrated`);
      totalMigrated += count;
    }
  });

  console.log(`\n✅ Total migrated: ${totalMigrated} instances`);
}

main();
