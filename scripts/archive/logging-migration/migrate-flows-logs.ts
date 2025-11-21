/**
 * Automated migration script for flows.actions.ts console.log statements
 * Converts unsafe console.log to structured logger calls
 */

import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'lib/actions/flows.actions.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Count initial console.log instances
const initialCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;
console.log(`Initial console.log count: ${initialCount}`);

// Migration patterns
const migrations = [
  // Pattern 1: console.error with [Resend Email] prefix and simple message
  {
    pattern: /console\.error\("\[Resend Email\] ([^"]+)"\);/g,
    replacement: "logger.error('$1', { operation: 'flows.email.error' });"
  },

  // Pattern 2: console.log with [Resend Email] prefix
  {
    pattern: /console\.log\(`\[Resend Email\] ([^`]+)`\);/g,
    replacement: "logger.info('$1', { operation: 'flows.email.info' });"
  },

  // Pattern 3: console.error with [Resend Email] prefix and error object
  {
    pattern: /console\.error\(`\[Resend Email\] ([^`]+)`, ([^)]+)\);/g,
    replacement: "logger.error('$1', { operation: 'flows.email.error' }, $2 instanceof Error ? $2 : new Error(String($2)));"
  },

  // Pattern 4: console.error with [Resend Prayer Email] prefix and simple message
  {
    pattern: /console\.error\("\[Resend Prayer Email\] ([^"]+)"\);/g,
    replacement: "logger.error('$1', { operation: 'flows.prayer_email.error' });"
  },

  // Pattern 5: console.error with [Resend Prayer Email] prefix and error object
  {
    pattern: /console\.error\(`\[Resend Prayer Email\] ([^`]+)`, ([^)]+)\);/g,
    replacement: "logger.error('$1', { operation: 'flows.prayer_email.error' }, $2 instanceof Error ? $2 : new Error(String($2)));"
  },

  // Pattern 6: console.log with [Resend Prayer Email] prefix
  {
    pattern: /console\.log\(`\[Resend Prayer Email\] ([^`]+)`\);/g,
    replacement: "logger.info('$1', { operation: 'flows.prayer_email.info' });"
  },

  // Pattern 7: Auth errors - simple messages
  {
    pattern: /console\.error\("([^"]*Auth[^"]+)"\);/g,
    replacement: "logger.error('$1', { operation: 'flows.auth.error' });"
  },

  // Pattern 8: Auth errors - template literals with userId
  {
    pattern: /console\.error\(`User \$\{userId\} ([^`]+)`\);/g,
    replacement: "logger.error('User has $1', { operation: 'flows.auth.no_org', userId });"
  },

  // Pattern 9: console.warn with template literals
  {
    pattern: /console\.warn\(`([^`]+)`\);/g,
    replacement: "logger.warn('$1', { operation: 'flows.config.warn' });"
  },

  // Pattern 10: console.error with template literals and error object
  {
    pattern: /console\.error\(`Error ([^`]+)`, error\);/g,
    replacement: "logger.error('Error $1', { operation: 'flows.error' }, error instanceof Error ? error : new Error(String(error)));"
  },

  // Pattern 11: console.error with saveFlowConfiguration prefix
  {
    pattern: /console\.error\(`saveFlowConfiguration Error: ([^`]+)`\);/g,
    replacement: "logger.error('saveFlowConfiguration Error: $1', { operation: 'flows.save_config.error' });"
  },

  // Pattern 12: console.error with template literal and updateError
  {
    pattern: /console\.error\(`Error updating ([^`]+)`, updateError\);/g,
    replacement: "logger.error('Error updating $1', { operation: 'flows.update.error' }, updateError instanceof Error ? updateError : new Error(String(updateError)));"
  },

  // Pattern 13: console.error with P2002 slug conflict
  {
    pattern: /console\.error\(`Original P2002 ([^`]+)`\);/g,
    replacement: "logger.error('Original P2002 $1', { operation: 'flows.slug_conflict.error' });"
  },

  // Pattern 14: console.error with creating configuration
  {
    pattern: /console\.error\(`Error creating ([^`]+)`, error\);/g,
    replacement: "logger.error('Error creating $1', { operation: 'flows.create.error' }, error instanceof Error ? error : new Error(String(error)));"
  },

  // Pattern 15: console.log with getPublicFlowBySlug prefix
  {
    pattern: /console\.log\("getPublicFlowBySlug: ([^"]+)"\);/g,
    replacement: "logger.debug('getPublicFlowBySlug: $1', { operation: 'flows.public.debug' });"
  },

  // Pattern 16: console.log with getPublicFlowBySlug and slug variable
  {
    pattern: /console\.log\(`getPublicFlowBySlug: ([^`]+) slug: \$\{slug\}`\);/g,
    replacement: "logger.debug('getPublicFlowBySlug: $1', { operation: 'flows.public.debug', slug });"
  },

  // Pattern 17: console.error with getPublicFlowBySlug and slug
  {
    pattern: /console\.error\(`getPublicFlowBySlug: ([^`]+) slug: \$\{slug\}`\);/g,
    replacement: "logger.error('getPublicFlowBySlug: $1', { operation: 'flows.public.error', slug });"
  },

  // Pattern 18: console.error with public flow configuration
  {
    pattern: /console\.error\(`Error fetching public flow configuration for slug \$\{slug\}:`, error\);/g,
    replacement: "logger.error('Error fetching public flow configuration', { operation: 'flows.public.fetch_error', slug }, error instanceof Error ? error : new Error(String(error)));"
  },

  // Pattern 19: console.error with [SubmitFlow] prefix and simple message
  {
    pattern: /console\.error\("\[SubmitFlow\] ([^"]+)"\);/g,
    replacement: "logger.error('$1', { operation: 'flows.submit.error' });"
  },

  // Pattern 20: console.error with [SubmitFlow] prefix and error object
  {
    pattern: /console\.error\("\[SubmitFlow\] ([^"]+)", ([^)]+)\);/g,
    replacement: "logger.error('$1', { operation: 'flows.submit.error' }, $2 instanceof Error ? $2 : new Error(String($2)));"
  },

  // Pattern 21: console.error with [SubmitFlow] prefix and template literals
  {
    pattern: /console\.error\(`\[SubmitFlow\] ([^`]+)`, ([^)]+)\);/g,
    replacement: "logger.error('$1', { operation: 'flows.submit.error' }, $2 instanceof Error ? $2 : new Error(String($2)));"
  },

  // Pattern 22: console.log with [SubmitFlow] prefix
  {
    pattern: /console\.log\(`\[SubmitFlow\] ([^`]+)`\);/g,
    replacement: "logger.info('$1', { operation: 'flows.submit.info' });"
  },

  // Pattern 23: console.log with [SubmitFlow] prefix (double quotes)
  {
    pattern: /console\.log\("\[SubmitFlow\] ([^"]+)"\);/g,
    replacement: "logger.debug('$1', { operation: 'flows.submit.debug' });"
  },

  // Pattern 24: console.warn with [SubmitFlow] and template literal
  {
    pattern: /console\.warn\(`\[SubmitFlow\] ([^`]+)`\);/g,
    replacement: "logger.warn('$1', { operation: 'flows.submit.warn' });"
  },

  // Pattern 25: console.log with [RateLimit] prefix
  {
    pattern: /console\.log\(`\[RateLimit\] ([^`]+)`\);/g,
    replacement: "logger.debug('$1', { operation: 'flows.rate_limit.debug' });"
  },

  // Pattern 26: console.error with [getActiveFlowsByChurchId] prefix
  {
    pattern: /console\.error\(`\[getActiveFlowsByChurchId\] ([^`]+)`, ([^)]+)\);/g,
    replacement: "logger.error('$1', { operation: 'flows.get_active.error' }, $2 instanceof Error ? $2 : new Error(String($2)));"
  },

  // Pattern 27: console.error with [getActiveFlowsByChurchId] and churchId
  {
    pattern: /console\.error\(`\[getActiveFlowsByChurchId\] Error fetching active flows for church \$\{churchId\}:`, error\);/g,
    replacement: "logger.error('Error fetching active flows for church', { operation: 'flows.get_active.fetch_error', churchId }, error instanceof Error ? error : new Error(String(error)));"
  },

  // Pattern 28: console.log configuration created successfully
  {
    pattern: /console\.log\(`\$\{flowType\} configuration created successfully for org \$\{orgId\} \(Flow ID: \$\{createdFlow\.id\}\)`\);/g,
    replacement: "logger.info('Flow configuration created successfully', { operation: 'flows.save_config.created', flowType, orgId, flowId: createdFlow.id });"
  },

  // Pattern 29: console.log Create failed P2002
  {
    pattern: /console\.log\(`Create failed \(P2002\), assuming flow exists for org \$\{orgId\}, type \$\{flowType\}\. Attempting update\.\`\);/g,
    replacement: "logger.info('Create failed (P2002), attempting update', { operation: 'flows.save_config.p2002_retry', orgId, flowType });"
  },

  // Pattern 30: console.log configuration updated successfully
  {
    pattern: /console\.log\(`\$\{flowType\} configuration updated successfully for org \$\{orgId\} \(Flow ID: \$\{existingFlow\.id\}\)`\);/g,
    replacement: "logger.info('Flow configuration updated successfully', { operation: 'flows.save_config.updated', flowType, orgId, flowId: existingFlow.id });"
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
