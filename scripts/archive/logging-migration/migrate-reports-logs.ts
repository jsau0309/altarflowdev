/**
 * Automated migration script for reports.actions.ts console.log statements
 * Converts unsafe console.log to structured logger calls
 */

import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'lib/actions/reports.actions.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Count initial console.log instances
const initialCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;
console.log(`Initial console.log count: ${initialCount}`);

// Migration patterns
const migrations = [
  // Pattern 1: console.error with [functionName] Authorization failed
  {
    pattern: /console\.error\('\[([^\]]+)\] Authorization failed:', ([^)]+)\)/g,
    replacement: "logger.error('Authorization failed', { operation: 'reports.$1.auth_error', error: $2 })"
  },

  // Pattern 2: console.error with generic error messages and error object
  {
    pattern: /console\.error\('Error fetching ([^']+)', error\)/g,
    replacement: "logger.error('Error fetching $1', { operation: 'reports.fetch_error' }, error instanceof Error ? error : new Error(String(error)))"
  },

  // Pattern 3: console.error with AI summary data
  {
    pattern: /console\.error\('Error fetching AI summary data:', error\)/g,
    replacement: "logger.error('Error fetching AI summary data', { operation: 'reports.ai_summary.error' }, error instanceof Error ? error : new Error(String(error)))"
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
