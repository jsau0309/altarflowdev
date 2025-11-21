/**
 * Automated migration script for Stripe webhook console.log statements
 * Converts unsafe console.log to structured webhookLogger calls
 */

import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'app/api/webhooks/stripe/route.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Count initial console.log instances
const initialCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;
console.log(`Initial console.log count: ${initialCount}`);

// Migration patterns
const migrations = [
  // Pattern 1: Development-only console.log blocks
  {
    pattern: /if \(process\.env\.NODE_ENV === 'development'\) \{\s*console\.log\(`\[Stripe Webhook\] ([^`]+)`\);\s*\}/g,
    replacement: "logger.debug('$1', { operation: 'webhook.stripe.debug' });"
  },

  // Pattern 2: Standard console.log with template literals
  {
    pattern: /console\.log\(`\[Stripe Webhook\] ([^`]+)`\)/g,
    replacement: "logger.info('$1', { operation: 'webhook.stripe.info' })"
  },

  // Pattern 3: console.error with template literals
  {
    pattern: /console\.error\(`\[Stripe Webhook\] ([^`]+)`\)/g,
    replacement: "logger.error('$1', { operation: 'webhook.stripe.error' })"
  },

  // Pattern 4: console.warn with template literals
  {
    pattern: /console\.warn\(`\[Stripe Webhook\] ([^`]+)`\)/g,
    replacement: "logger.warn('$1', { operation: 'webhook.stripe.warn' })"
  },

  // Pattern 5: console.error with string and object
  {
    pattern: /console\.error\(`\[Stripe Webhook\] ([^`]+)`, ([^)]+)\)/g,
    replacement: "logger.error('$1', { operation: 'webhook.stripe.error', context: $2 })"
  },

  // Pattern 6: console.log with string
  {
    pattern: /console\.log\('\[Stripe Webhook\] ([^']+)'\)/g,
    replacement: "logger.info('$1', { operation: 'webhook.stripe.info' })"
  },
];

// Apply migrations
migrations.forEach(({ pattern, replacement }, index) => {
  const matches = content.match(pattern);
  if (matches) {
    console.log(`Pattern ${index + 1}: Found ${matches.length} matches`);
    content = content.replace(pattern, replacement);
  }
});

// Count remaining console.log instances
const remainingCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;
console.log(`\nMigration complete:`);
console.log(`  Initial: ${initialCount}`);
console.log(`  Remaining: ${remainingCount}`);
console.log(`  Migrated: ${initialCount - remainingCount}`);

// Write back
fs.writeFileSync(filePath, content, 'utf-8');
console.log(`\nFile updated: ${filePath}`);
