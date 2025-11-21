/**
 * Migration script for remaining complex console.log patterns in components
 * Handles template literals and complex error patterns
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

async function migrateFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf-8');

  const initialCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;
  if (initialCount === 0) return { file: filePath, migrated: 0 };

  // Add logger import if not present
  if (!content.includes("from '@/lib/logger'")) {
    const lines = content.split('\n');
    let insertIndex = 0;

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

  // Now do line-by-line replacement for complex patterns
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Pattern: console.error('...', error) in catch blocks
    if (line.includes('console.error(') && line.includes(', error)')) {
      // Extract message
      const match = line.match(/console\.error\((['"`])(.+?)\1,\s*error\)/);
      if (match) {
        const message = match[2];
        const indent = line.match(/^(\s*)/)?.[1] || '';
        lines[i] = `${indent}logger.error('${message}', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));`;
        continue;
      }
    }

    // Pattern: console.log('...', someVar) - complex
    if (line.includes('console.log(') && line.includes(',')) {
      const match = line.match(/console\.log\((['"`])(.+?)\1,\s*(.+?)\)/);
      if (match) {
        const message = match[2];
        const variable = match[3];
        const indent = line.match(/^(\s*)/)?.[1] || '';
        lines[i] = `${indent}logger.debug('${message}', { operation: 'ui.debug', data: ${variable} });`;
        continue;
      }
    }

    // Pattern: console.error('...') - simple
    if (line.includes('console.error(') && !line.includes(', ')) {
      const match = line.match(/console\.error\((['"`])(.+?)\1\)/);
      if (match) {
        const message = match[2];
        const indent = line.match(/^(\s*)/)?.[1] || '';
        lines[i] = `${indent}logger.error('${message}', { operation: 'ui.error' });`;
        continue;
      }
    }

    // Pattern: console.log('...') - simple
    if (line.includes('console.log(') && !line.includes(', ')) {
      const match = line.match(/console\.log\((['"`])(.+?)\1\)/);
      if (match) {
        const message = match[2];
        const indent = line.match(/^(\s*)/)?.[1] || '';
        lines[i] = `${indent}logger.debug('${message}', { operation: 'ui.debug' });`;
        continue;
      }
    }

    // Pattern: console.warn
    if (line.includes('console.warn(')) {
      const match = line.match(/console\.warn\((['"`])(.+?)\1\)/);
      if (match) {
        const message = match[2];
        const indent = line.match(/^(\s*)/)?.[1] || '';
        lines[i] = `${indent}logger.warn('${message}', { operation: 'ui.warn' });`;
        continue;
      }
    }
  }

  content = lines.join('\n');

  const finalCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;
  const migrated = initialCount - finalCount;

  if (migrated > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return { file: filePath, initial: initialCount, final: finalCount, migrated };
}

async function main() {
  console.log('=== Migrating remaining complex console.log patterns in components ===\n');

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
      console.log(`✓ ${file}: ${result.migrated} instances migrated (${result.final} remaining)`);
      results.push(result);
      totalMigrated += result.migrated;
    }
  }

  console.log(`\n=== Migration complete! ===`);
  console.log(`Total files processed: ${results.length}`);
  console.log(`Total instances migrated: ${totalMigrated}`);
}

main().catch(console.error);
