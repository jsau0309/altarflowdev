/**
 * Batch migration script for lib/actions files
 * Migrates console.log to structured logger calls
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const migratedFiles = [
  'lib/actions/flows.actions.ts',
  'lib/actions/reports.actions.ts',
  'lib/actions/donors.actions.ts',
];

async function migrateFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf-8');

  const initialCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;
  if (initialCount === 0) return { file: filePath, migrated: 0 };

  // Generic migrations for all action files
  const migrations = [
    // Error patterns with error object
    { pattern: /console\.error\("([^"]+)", ([^)]+)\);/g, replacement: "logger.error('$1', { operation: 'actions.error' }, $2 instanceof Error ? $2 : new Error(String($2)));" },
    { pattern: /console\.error\('([^']+)', ([^)]+)\);/g, replacement: "logger.error('$1', { operation: 'actions.error' }, $2 instanceof Error ? $2 : new Error(String($2)));" },
    { pattern: /console\.error\(`([^`]+)`, ([^)]+)\);/g, replacement: "logger.error('$1', { operation: 'actions.error' }, $2 instanceof Error ? $2 : new Error(String($2)));" },

    // Error patterns without error object
    { pattern: /console\.error\("([^"]+)"\);/g, replacement: "logger.error('$1', { operation: 'actions.error' });" },
    { pattern: /console\.error\('([^']+)'\);/g, replacement: "logger.error('$1', { operation: 'actions.error' });" },
    { pattern: /console\.error\(`([^`]+)`\);/g, replacement: "logger.error('$1', { operation: 'actions.error' });" },

    // Warn patterns
    { pattern: /console\.warn\("([^"]+)"\);/g, replacement: "logger.warn('$1', { operation: 'actions.warn' });" },
    { pattern: /console\.warn\('([^']+)'\);/g, replacement: "logger.warn('$1', { operation: 'actions.warn' });" },
    { pattern: /console\.warn\(`([^`]+)`\);/g, replacement: "logger.warn('$1', { operation: 'actions.warn' });" },

    // Log/Info patterns
    { pattern: /console\.log\("([^"]+)"\);/g, replacement: "logger.debug('$1', { operation: 'actions.debug' });" },
    { pattern: /console\.log\('([^']+)'\);/g, replacement: "logger.debug('$1', { operation: 'actions.debug' });" },
    { pattern: /console\.log\(`([^`]+)`\);/g, replacement: "logger.debug('$1', { operation: 'actions.debug' });" },
    { pattern: /console\.info\("([^"]+)"\);/g, replacement: "logger.info('$1', { operation: 'actions.info' });" },
    { pattern: /console\.info\('([^']+)'\);/g, replacement: "logger.info('$1', { operation: 'actions.info' });" },
    { pattern: /console\.info\(`([^`]+)`\);/g, replacement: "logger.info('$1', { operation: 'actions.info' });" },
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
  console.log('=== Batch migrating all lib/actions files ===\n');

  // Find all action files
  const files = await glob('lib/actions/**/*.ts', {
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
