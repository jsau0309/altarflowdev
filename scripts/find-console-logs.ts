/**
 * Detection script for console.log instances
 * Part of Phase 3 - Pino Logging Migration (ALT-87)
 *
 * Scans codebase for remaining console.log/error/warn/info instances
 * and reports them for manual review.
 */

import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

interface ConsoleInstance {
  file: string;
  line: number;
  content: string;
  type: 'log' | 'error' | 'warn' | 'info';
}

async function findConsoleLogs(): Promise<ConsoleInstance[]> {
  const instances: ConsoleInstance[] = [];

  // Scan all TypeScript/JavaScript files
  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: process.cwd(),
    ignore: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/scripts/**', // Allow console.log in scripts
    ],
  });

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Skip commented lines
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return;
      }

      // Check for intentional console overrides (like in donation-payment.tsx)
      if (line.includes('originalConsoleError') || line.includes('console.error =')) {
        return;
      }

      // Detect console.log/error/warn/info
      const consoleMatch = line.match(/console\.(log|error|warn|info)/);
      if (consoleMatch) {
        instances.push({
          file,
          line: index + 1,
          content: line.trim(),
          type: consoleMatch[1] as 'log' | 'error' | 'warn' | 'info',
        });
      }
    });
  }

  return instances;
}

async function main() {
  console.log('🔍 Scanning codebase for console.log instances...\n');

  const instances = await findConsoleLogs();

  if (instances.length === 0) {
    console.log('✅ No console.log instances found! Migration complete.\n');
    process.exit(0);
  }

  console.log(`⚠️  Found ${instances.length} console instances:\n`);

  // Group by file
  const byFile = instances.reduce((acc, instance) => {
    if (!acc[instance.file]) {
      acc[instance.file] = [];
    }
    acc[instance.file].push(instance);
    return acc;
  }, {} as Record<string, ConsoleInstance[]>);

  // Report grouped by file
  Object.entries(byFile).forEach(([file, fileInstances]) => {
    console.log(`📄 ${file} (${fileInstances.length} instances):`);
    fileInstances.forEach((instance) => {
      console.log(`   Line ${instance.line}: ${instance.content.substring(0, 80)}${instance.content.length > 80 ? '...' : ''}`);
    });
    console.log('');
  });

  // Summary by type
  const byType = instances.reduce((acc, instance) => {
    acc[instance.type] = (acc[instance.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📊 Summary by type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   console.${type}: ${count}`);
  });

  console.log('\n⚠️  These instances should be migrated to structured logging.\n');
  process.exit(1);
}

main().catch((error) => {
  console.error('Error running console.log detection:', error);
  process.exit(1);
});
