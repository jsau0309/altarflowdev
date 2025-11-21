/**
 * Batch migration script for all component files
 * Migrates console.log to structured logger calls
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

async function migrateFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf-8');

  const initialCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;
  if (initialCount === 0) return { file: filePath, migrated: 0 };

  // Generic migrations for all components (client-side)
  const migrations = [
    // Error patterns with error object
    { pattern: /console\.error\("([^"]+)", ([^)]+)\);/g, replacement: "logger.error('$1', { operation: 'ui.error' }, $2 instanceof Error ? $2 : new Error(String($2)));" },
    { pattern: /console\.error\('([^']+)', ([^)]+)\);/g, replacement: "logger.error('$1', { operation: 'ui.error' }, $2 instanceof Error ? $2 : new Error(String($2)));" },
    { pattern: /console\.error\(`([^`]+)`, ([^)]+)\);/g, replacement: "logger.error('$1', { operation: 'ui.error' }, $2 instanceof Error ? $2 : new Error(String($2)));" },

    // Error patterns without error object
    { pattern: /console\.error\("([^"]+)"\);/g, replacement: "logger.error('$1', { operation: 'ui.error' });" },
    { pattern: /console\.error\('([^']+)'\);/g, replacement: "logger.error('$1', { operation: 'ui.error' });" },
    { pattern: /console\.error\(`([^`]+)`\);/g, replacement: "logger.error('$1', { operation: 'ui.error' });" },

    // Warn patterns
    { pattern: /console\.warn\("([^"]+)"\);/g, replacement: "logger.warn('$1', { operation: 'ui.warn' });" },
    { pattern: /console\.warn\('([^']+)'\);/g, replacement: "logger.warn('$1', { operation: 'ui.warn' });" },
    { pattern: /console\.warn\(`([^`]+)`\);/g, replacement: "logger.warn('$1', { operation: 'ui.warn' });" },

    // Log/Info patterns - use debug for client-side
    { pattern: /console\.log\("([^"]+)"\);/g, replacement: "logger.debug('$1', { operation: 'ui.debug' });" },
    { pattern: /console\.log\('([^']+)'\);/g, replacement: "logger.debug('$1', { operation: 'ui.debug' });" },
    { pattern: /console\.log\(`([^`]+)`\);/g, replacement: "logger.debug('$1', { operation: 'ui.debug' });" },
    { pattern: /console\.info\("([^"]+)"\);/g, replacement: "logger.info('$1', { operation: 'ui.info' });" },
    { pattern: /console\.info\('([^']+)'\);/g, replacement: "logger.info('$1', { operation: 'ui.info' });" },
    { pattern: /console\.info\(`([^`]+)`\);/g, replacement: "logger.info('$1', { operation: 'ui.info' });" },
  ];

  // Apply migrations
  migrations.forEach(({ pattern, replacement }) => {
    content = content.replace(pattern, replacement);
  });

  // Add logger import if not present
  if (!content.includes("from '@/lib/logger'")) {
    // For client components, add "use client" if not present and add logger import
    const lines = content.split('\n');
    let insertIndex = 0;

    // Find where to insert (after "use client" if present, otherwise at top)
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

    // If no imports found and no "use client", add at the top
    if (insertIndex === 0 && lines.length > 0) {
      insertIndex = 0;
      // Check if we need to add "use client"
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
  const migrated = initialCount - finalCount;

  if (migrated > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return { file: filePath, initial: initialCount, final: finalCount, migrated };
}

async function main() {
  console.log('=== Batch migrating all component files ===\n');

  // Find all component files
  const files = await glob('components/**/*.{ts,tsx}', {
    cwd: process.cwd(),
    ignore: ['**/node_modules/**', '**/.next/**'],
  });

  const results = [];
  let totalMigrated = 0;

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
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
