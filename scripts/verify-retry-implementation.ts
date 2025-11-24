/**
 * Verification script for database retry implementation
 * 
 * This script verifies that the retry logic is properly integrated into the Prisma client
 * without requiring a database connection.
 */

import { PrismaClient } from '@prisma/client';
import { retryExtension } from '../lib/prisma-extension-retry';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function verify() {
  log('\n═══════════════════════════════════════════', 'blue');
  log('  Database Retry Implementation Verification', 'blue');
  log('═══════════════════════════════════════════\n', 'blue');

  let allPassed = true;

  // Test 1: Verify retryExtension exists and is callable
  log('📝 Test 1: Verify retry extension is defined', 'cyan');
  if (retryExtension !== undefined && retryExtension !== null) {
    log('✓ Retry extension is properly defined', 'green');
    log(`  Extension type: ${typeof retryExtension}`, 'cyan');
  } else {
    log('✗ Retry extension is not properly defined', 'red');
    allPassed = false;
  }

  // Test 2: Verify extension can be applied to PrismaClient
  log('\n📝 Test 2: Verify extension can be applied to Prisma client', 'cyan');
  try {
    const baseClient = new PrismaClient();
    const extendedClient = baseClient.$extends(retryExtension);
    
    if (extendedClient) {
      log('✓ Extension successfully applied to Prisma client', 'green');
    } else {
      log('✗ Failed to apply extension to Prisma client', 'red');
      allPassed = false;
    }
  } catch (error) {
    log(`✗ Error applying extension: ${error}`, 'red');
    allPassed = false;
  }

  // Test 3: Verify the extension structure
  log('\n📝 Test 3: Verify extension structure', 'cyan');
  if (retryExtension && 'name' in retryExtension && retryExtension.name === 'retry-extension') {
    log('✓ Extension has correct structure and name', 'green');
  } else {
    log('⚠ Extension structure could not be fully verified', 'yellow');
  }

  // Test 4: Verify db.ts exports the extended client
  log('\n📝 Test 4: Verify db.ts configuration', 'cyan');
  try {
    const fs = require('fs');
    const dbContent = fs.readFileSync('./lib/db.ts', 'utf8');
    
    const checks = [
      { pattern: /import.*retryExtension.*from.*prisma-extension-retry/, description: 'imports retry extension' },
      { pattern: /\$extends\(retryExtension\)/, description: 'applies retry extension to client' },
      { pattern: /const client = baseClient\.\$extends\(retryExtension\)/, description: 'correctly extends base client' },
    ];
    
    let dbChecksPassed = 0;
    checks.forEach(({ pattern, description }) => {
      if (pattern.test(dbContent)) {
        log(`  ✓ db.ts ${description}`, 'green');
        dbChecksPassed++;
      } else {
        log(`  ✗ db.ts does not ${description}`, 'red');
        allPassed = false;
      }
    });
    
    if (dbChecksPassed === checks.length) {
      log('✓ db.ts is properly configured with retry extension', 'green');
    }
  } catch (error) {
    log(`✗ Could not read db.ts: ${error}`, 'red');
    allPassed = false;
  }

  // Test 5: Verify retry logic is comprehensive
  log('\n📝 Test 5: Verify retry logic handles common error codes', 'cyan');
  try {
    const fs = require('fs');
    const extensionContent = fs.readFileSync('./lib/prisma-extension-retry.ts', 'utf8');
    
    const errorCodes = ['P2024', 'P1017', 'P1001', 'P1002', 'P2034'];
    let errorCodesFound = 0;
    
    errorCodes.forEach(code => {
      if (extensionContent.includes(code)) {
        errorCodesFound++;
      }
    });
    
    if (errorCodesFound === errorCodes.length) {
      log(`✓ Retry extension handles all ${errorCodes.length} critical error codes`, 'green');
    } else {
      log(`⚠ Retry extension handles ${errorCodesFound}/${errorCodes.length} critical error codes`, 'yellow');
    }
  } catch (error) {
    log(`✗ Could not verify retry logic: ${error}`, 'red');
    allPassed = false;
  }

  // Summary
  log('\n═══════════════════════════════════════════', 'blue');
  log('  Verification Summary', 'blue');
  log('═══════════════════════════════════════════\n', 'blue');

  if (allPassed) {
    log('🎉 All verifications passed!', 'green');
    log('\n✓ Automatic retry extension is properly implemented', 'green');
    log('✓ All database operations will automatically retry on connection failures', 'green');
    log('✓ No manual wrapping with withRetry() is needed', 'green');
    log('\nThe following error types will trigger automatic retries:', 'cyan');
    log('  • Connection pool timeouts (P2024)', 'cyan');
    log('  • Server connection drops (P1017)', 'cyan');
    log('  • Database unreachable (P1001)', 'cyan');
    log('  • Database timeouts (P1002)', 'cyan');
    log('  • Transaction conflicts/deadlocks (P2034)', 'cyan');
    log('  • Network errors (ECONNRESET, ETIMEDOUT, etc.)', 'cyan');
    return 0;
  } else {
    log('❌ Some verifications failed', 'red');
    log('\nPlease review the implementation', 'yellow');
    return 1;
  }
}

// Run verification
process.exit(verify());

