/**
 * Batch migration script for all remaining API routes
 * Migrates console.log to structured logger calls
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const migratedFiles = [
  'app/api/clerk-webhook/route.ts',
  'app/api/webhooks/stripe/route.ts',
  'app/api/stripe/route.ts',
  'app/api/donations/initiate/route.ts',
  'app/api/expenses/[expenseId]/route.ts',
];

async function migrateFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf-8');

  const initialCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;
  if (initialCount === 0) return { file: filePath, migrated: 0 };

  // Generic migrations for all API routes
  const migrations = [
    // Error patterns
    { pattern: /console\.error\("([^"]+)", ([^)]+)\);/g, replacement: "logger.error('$1', { operation: 'api.error' }, $2 instanceof Error ? $2 : new Error(String($2)));" },
    { pattern: /console\.error\('([^']+)', ([^)]+)\);/g, replacement: "logger.error('$1', { operation: 'api.error' }, $2 instanceof Error ? $2 : new Error(String($2)));" },
    { pattern: /console\.error\(`([^`]+)`, ([^)]+)\);/g, replacement: "logger.error('$1', { operation: 'api.error' }, $2 instanceof Error ? $2 : new Error(String($2)));" },
    { pattern: /console\.error\("([^"]+)"\);/g, replacement: "logger.error('$1', { operation: 'api.error' });" },
    { pattern: /console\.error\('([^']+)'\);/g, replacement: "logger.error('$1', { operation: 'api.error' });" },
    { pattern: /console\.error\(`([^`]+)`\);/g, replacement: "logger.error('$1', { operation: 'api.error' });" },

    // Warn patterns
    { pattern: /console\.warn\("([^"]+)"\);/g, replacement: "logger.warn('$1', { operation: 'api.warn' });" },
    { pattern: /console\.warn\('([^']+)'\);/g, replacement: "logger.warn('$1', { operation: 'api.warn' });" },
    { pattern: /console\.warn\(`([^`]+)`\);/g, replacement: "logger.warn('$1', { operation: 'api.warn' });" },

    // Log/Info patterns
    { pattern: /console\.log\("([^"]+)"\);/g, replacement: "logger.info('$1', { operation: 'api.info' });" },
    { pattern: /console\.log\('([^']+)'\);/g, replacement: "logger.info('$1', { operation: 'api.info' });" },
    { pattern: /console\.log\(`([^`]+)`\);/g, replacement: "logger.info('$1', { operation: 'api.info' });" },
    { pattern: /console\.info\("([^"]+)"\);/g, replacement: "logger.info('$1', { operation: 'api.info' });" },
    { pattern: /console\.info\('([^']+)'\);/g, replacement: "logger.info('$1', { operation: 'api.info' });" },
    { pattern: /console\.info\(`([^`]+)`\);/g, replacement: "logger.info('$1', { operation: 'api.info' });" },
  ];

  // Apply migrations
  migrations.forEach(({ pattern, replacement }) => {
    content = content.replace(pattern, replacement);
  });

  // Add logger import if not present
  if (!content.includes("from '@/lib/logger'")) {
    // Find the last import statement
    const lines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      }
    }

    if (lastImportIndex !== -1) {
      lines.splice(lastImportIndex + 1, 0, "import { logger } from '@/lib/logger';");
      content = lines.join('\n');
    }
  }

  const finalCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;
  const migrated = initialCount - finalCount;

  if (migrated > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return { file: filePath, initial: initialCount, final: finalCount, migrated };
}

async function main() {
  console.log('=== Batch migrating all remaining API routes ===\n');

  // Find all API route files
  const files = await glob('app/api/**/*.{ts,tsx}', {
    cwd: process.cwd(),
    ignore: ['**/node_modules/**', '**/.next/**'],
  });

  const results = [];
  let totalMigrated = 0;

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);

    // Skip already migrated files
    if (migratedFiles.some(mf => fullPath.includes(mf.replace(/\//g, path.sep)))) {
      continue;
    }

    const result = await migrateFile(fullPath);
    if (result.migrated > 0) {
      console.log(`✓ ${file}: ${result.migrated} instances migrated`);
      results.push(result);
      totalMigrated += result.migrated;
    }
  }

  console.log(`\n=== Batch migration complete! ===`);
  console.log(`Total files processed: ${results.length}`);
  console.log(`Total instances migrated: ${totalMigrated}`);
}

main().catch(console.error);
