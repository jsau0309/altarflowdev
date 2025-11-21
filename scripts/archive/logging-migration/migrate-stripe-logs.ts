/**
 * Automated migration script for Stripe API route console.log statements
 * Converts unsafe console.log to structured logger calls
 */

import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'app/api/stripe/route.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Count initial console.log instances
const initialCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;
console.log(`Initial console.log count: ${initialCount}`);

// Migration patterns
const migrations = [
  // Pattern 1: console.error with string
  {
    pattern: /console\.error\(`\[([^\]]+)\] ([^`]+)`\)/g,
    replacement: "logger.error('$2', { operation: 'stripe.api.$1' })"
  },

  // Pattern 2: console.error with string and error object
  {
    pattern: /console\.error\(`\[([^\]]+)\] ([^`]+)`, ([^)]+)\)/g,
    replacement: "logger.error('$2', { operation: 'stripe.api.$1' }, $3 instanceof Error ? $3 : new Error(String($3)))"
  },

  // Pattern 3: console.error with string literal
  {
    pattern: /console\.error\('([^']+):', ([^)]+)\)/g,
    replacement: "logger.error('$1', { operation: 'stripe.api.error' }, $2 instanceof Error ? $2 : new Error(String($2)))"
  },

  // Pattern 4: console.log with [DEBUG] prefix
  {
    pattern: /console\.log\(`\[DEBUG\] ([^`]+)`\)/g,
    replacement: "logger.debug('$1', { operation: 'stripe.api.debug' })"
  },

  // Pattern 5: console.log with [INFO] prefix
  {
    pattern: /console\.log\(`\[INFO\] ([^`]+)`\)/g,
    replacement: "logger.info('$1', { operation: 'stripe.api.info' })"
  },

  // Pattern 6: console.warn with [WARN] prefix
  {
    pattern: /console\.warn\(`\[WARN\] ([^`]+)`\)/g,
    replacement: "logger.warn('$1', { operation: 'stripe.api.warn' })"
  },

  // Pattern 7: console.log with template literal (simple)
  {
    pattern: /console\.log\('([^']+)'(?:,\s*([^)]+))?\)/g,
    replacement: (match: string, message: string, context?: string) => {
      if (context) {
        return `logger.debug('${message}', { operation: 'stripe.api.debug', context: ${context} })`;
      }
      return `logger.debug('${message}', { operation: 'stripe.api.debug' })`;
    }
  },
];

// Apply migrations
migrations.forEach(({ pattern, replacement }, index) => {
  const matches = content.match(pattern);
  if (matches) {
    console.log(`Pattern ${index + 1}: Found ${matches.length} matches`);
    content = content.replace(pattern, replacement as string);
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
