/**
 * Complete Phase 3.7 Migration
 * Migrates all remaining console.log instances in:
 * - Client-side pages (app/)
 * - Utilities (lib/)
 * - Edge functions
 */

import * as fs from 'fs';
import * as path from 'path';

interface Migration {
  file: string;
  isClientComponent: boolean;
  replacements: Array<{ pattern: RegExp; replacement: string }>;
}

const migrations: Migration[] = [
  // Client-side pages
  {
    file: 'app/(auth)/invitation-pending/page.tsx',
    isClientComponent: true,
    replacements: [
      { pattern: /console\.error\(/g, replacement: 'logger.error(' },
      { pattern: /console\.log\(/g, replacement: 'logger.debug(' },
    ]
  },
  {
    file: 'app/(auth)/verify-otp/actions.ts',
    isClientComponent: false, // server action
    replacements: [
      { pattern: /console\.error\(/g, replacement: 'logger.error(' },
      { pattern: /console\.log\(/g, replacement: 'logger.info(' },
    ]
  },
  {
    file: 'app/(dashboard)/_client-layout.tsx',
    isClientComponent: true,
    replacements: [
      { pattern: /console\.error\(/g, replacement: 'logger.error(' },
    ]
  },
  {
    file: 'app/(dashboard)/flows/page.tsx',
    isClientComponent: true,
    replacements: [
      { pattern: /console\.log\(/g, replacement: 'logger.debug(' },
    ]
  },
  {
    file: 'app/(dashboard)/layout.tsx',
    isClientComponent: true,
    replacements: [
      { pattern: /console\.error\(/g, replacement: 'logger.error(' },
      { pattern: /console\.log\(/g, replacement: 'logger.debug(' },
    ]
  },
  {
    file: 'app/(public)/connect/[flowSlug]/page.tsx',
    isClientComponent: true,
    replacements: [
      { pattern: /console\.error\(/g, replacement: 'logger.error(' },
      { pattern: /console\.log\(/g, replacement: 'logger.debug(' },
    ]
  },
  {
    file: 'app/onboarding/step-2/page.tsx',
    isClientComponent: true,
    replacements: [
      { pattern: /console\.log\(/g, replacement: 'logger.debug(' },
    ]
  },
  {
    file: 'app/onboarding/step-3/page.tsx',
    isClientComponent: true,
    replacements: [
      { pattern: /console\.error\(/g, replacement: 'logger.error(' },
      { pattern: /console\.log\(/g, replacement: 'logger.debug(' },
    ]
  },
  {
    file: 'app/onboarding/step-4/page.tsx',
    isClientComponent: true,
    replacements: [
      { pattern: /console\.log\(/g, replacement: 'logger.debug(' },
    ]
  },
  {
    file: 'app/onboarding/step-5/page.tsx',
    isClientComponent: true,
    replacements: [
      { pattern: /console\.log\(/g, replacement: 'logger.debug(' },
    ]
  },

  // Utilities
  {
    file: 'lib/cache/landing-page-cache.ts',
    isClientComponent: false,
    replacements: [
      { pattern: /console\.log\(/g, replacement: 'logger.debug(' },
      { pattern: /console\.error\(/g, replacement: 'logger.error(' },
      { pattern: /console\.warn\(/g, replacement: 'logger.warn(' },
    ]
  },
  {
    file: 'lib/email/resend-service.ts',
    isClientComponent: false,
    replacements: [
      { pattern: /console\.error\(/g, replacement: 'logger.error(' },
      { pattern: /console\.log\(/g, replacement: 'logger.info(' },
    ]
  },
  {
    file: 'lib/safe-storage.ts',
    isClientComponent: true, // runs in browser
    replacements: [
      { pattern: /console\.warn\(/g, replacement: 'logger.warn(' },
    ]
  },
  {
    file: 'lib/posthog/client.ts',
    isClientComponent: true,
    replacements: [
      { pattern: /console\.warn\(/g, replacement: 'logger.warn(' },
    ]
  },
  {
    file: 'lib/posthog/server.ts',
    isClientComponent: false,
    replacements: [
      { pattern: /console\.warn\(/g, replacement: 'logger.warn(' },
      { pattern: /console\.log\(/g, replacement: 'logger.info(' },
    ]
  },
  {
    file: 'lib/stripe/subscription.ts',
    isClientComponent: false,
    replacements: [
      { pattern: /console\.warn\(/g, replacement: 'logger.warn(' },
    ]
  },
  {
    file: 'lib/email/templates/donation-receipt.ts',
    isClientComponent: false,
    replacements: [
      { pattern: /console\.error\(/g, replacement: 'logger.error(' },
    ]
  },
  {
    file: 'app/api/og/[churchSlug]/route.tsx',
    isClientComponent: false,
    replacements: [
      { pattern: /console\.error\(/g, replacement: 'logger.error(' },
    ]
  },
  {
    file: 'supabase/functions/send-scheduled-campaigns/index.ts',
    isClientComponent: false,
    replacements: [
      { pattern: /console\.log\(/g, replacement: 'logger.info(' },
      { pattern: /console\.error\(/g, replacement: 'logger.error(' },
    ]
  },
];

function addLoggerImport(content: string, isClientComponent: boolean): string {
  if (content.includes("from '@/lib/logger'")) {
    return content; // Already has import
  }

  const lines = content.split('\n');
  let insertIndex = 0;

  // Find insertion point
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('"use client"') || line.includes("'use client'")) {
      insertIndex = i + 1;
      continue;
    }
    if (line.includes('"use server"') || line.includes("'use server'")) {
      insertIndex = i + 1;
      continue;
    }
    if (line.trim().startsWith('import ')) {
      insertIndex = i + 1; // After last import
    }
  }

  // If no imports found, insert after directives or at top
  if (insertIndex === 0) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('"use client"') || lines[i].includes("'use client'")) {
        insertIndex = i + 1;
        break;
      }
    }
  }

  lines.splice(insertIndex, 0, "import { logger } from '@/lib/logger';");
  return lines.join('\n');
}

function migrateFile(migration: Migration): number {
  const filePath = path.join(process.cwd(), migration.file);

  if (!fs.existsSync(filePath)) {
    return 0;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let changeCount = 0;

  // Apply replacements
  migration.replacements.forEach((replacement) => {
    const matches = content.match(replacement.pattern);
    if (matches) {
      changeCount += matches.length;
      content = content.replace(replacement.pattern, replacement.replacement);
    }
  });

  // Add import if changes were made
  if (changeCount > 0) {
    content = addLoggerImport(content, migration.isClientComponent);
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return changeCount;
}

function main() {
  console.log('=== Phase 3.7 Complete Migration ===\n');

  let totalMigrated = 0;
  const results: Array<{ file: string; count: number }> = [];

  migrations.forEach((migration) => {
    const count = migrateFile(migration);
    if (count > 0) {
      console.log(`✅ ${migration.file}: ${count} instances`);
      results.push({ file: migration.file, count });
      totalMigrated += count;
    }
  });

  console.log(`\n=== Summary ===`);
  console.log(`Files migrated: ${results.length}`);
  console.log(`Total instances: ${totalMigrated}`);

  console.log(`\nℹ️  Note: Simple pattern replacement used.`);
  console.log(`   You may need to add operation names to some logger calls.`);
}

main();
