/**
 * Migration script for lib/stripe-reconciliation.ts
 * Migrates 16 console.log instances to structured logging
 */

import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'lib/stripe-reconciliation.ts');

const migrations = [
  // Line 38
  {
    old: /console\.log\(`\[Reconciliation\] Starting reconciliation for payout \$\{payoutId\}`\);/,
    new: "logger.info('Starting payout reconciliation', { operation: 'stripe.reconciliation.start', payoutId, stripeAccountId });"
  },
  // Line 44
  {
    old: /console\.warn\(`\[Reconciliation\] No balance transactions found for payout \$\{payoutId\}`\);/,
    new: "logger.warn('No balance transactions found for payout', { operation: 'stripe.reconciliation.no_transactions', payoutId });"
  },
  // Line 51
  {
    old: /console\.log\(`\[Reconciliation\] Found \$\{balanceTransactions\.length\} transactions for payout \$\{payoutId\}`\);/,
    new: "logger.info('Found balance transactions for payout', { operation: 'stripe.reconciliation.transactions_found', payoutId, transactionCount: balanceTransactions.length });"
  },
  // Line 70
  {
    old: /console\.log\(`\[Reconciliation\] Successfully reconciled payout \$\{payoutId\}`\);/,
    new: "logger.info('Successfully reconciled payout', { operation: 'stripe.reconciliation.success', payoutId });"
  },
  // Line 71
  {
    old: /console\.log\(`\[Reconciliation\] Summary:\`, summary\);/,
    new: "logger.info('Reconciliation summary', { operation: 'stripe.reconciliation.summary', payoutId, ...summary });"
  },
  // Line 79
  {
    old: /console\.error\(`\[Reconciliation\] Error reconciling payout \$\{payoutId\}:\`, error\);/,
    new: "logger.error('Error reconciling payout', { operation: 'stripe.reconciliation.error', payoutId }, error instanceof Error ? error : new Error(String(error)));"
  },
  // Line 163
  {
    old: /console\.log\(`\[Reconciliation\] Unexpected transaction type: \$\{transaction\.type\}`, \{/,
    new: "logger.warn('Unexpected transaction type', { operation: 'stripe.reconciliation.unexpected_type', transactionType: transaction.type, "
  },
  // Line 196
  {
    old: /console\.error\(`\[Reconciliation\] No Stripe account found for church \$\{churchId\}`\);/,
    new: "logger.error('No Stripe account found for church', { operation: 'stripe.reconciliation.no_account', churchId });"
  },
  // Line 209
  {
    old: /console\.log\(`\[Reconciliation\] Found \$\{pendingPayouts\.length\} pending payouts for church \$\{church\.name\}`\);/,
    new: "logger.info('Found pending payouts for church', { operation: 'stripe.reconciliation.pending_payouts', churchId: church.id, churchName: church.name, payoutCount: pendingPayouts.length });"
  },
  // Line 222
  {
    old: /console\.log\(`\[Reconciliation\] Completed reconciliation for church \$\{church\.name\}`\);/,
    new: "logger.info('Completed reconciliation for church', { operation: 'stripe.reconciliation.church_complete', churchId: church.id, churchName: church.name });"
  },
  // Line 225
  {
    old: /console\.error\(`\[Reconciliation\] Error reconciling payouts for church \$\{churchId\}:\`, error\);/,
    new: "logger.error('Error reconciling payouts for church', { operation: 'stripe.reconciliation.church_error', churchId }, error instanceof Error ? error : new Error(String(error)));"
  },
  // Line 235
  {
    old: /console\.log\('\[Reconciliation\] Starting global payout reconciliation\.\.\.'\);/,
    new: "logger.info('Starting global payout reconciliation', { operation: 'stripe.reconciliation.global_start' });"
  },
  // Line 250
  {
    old: /console\.log\(`\[Reconciliation\] Found \$\{churchesWithPendingPayouts\.length\} churches with pending payouts`\);/,
    new: "logger.info('Found churches with pending payouts', { operation: 'stripe.reconciliation.global_churches', churchCount: churchesWithPendingPayouts.length });"
  },
  // Line 254
  {
    old: /console\.log\(`\[Reconciliation\] Processing church: \$\{church\.name\}`\);/,
    new: "logger.info('Processing church reconciliation', { operation: 'stripe.reconciliation.processing_church', churchId: church.id, churchName: church.name });"
  },
  // Line 258
  {
    old: /console\.log\('\[Reconciliation\] Global reconciliation completed'\);/,
    new: "logger.info('Global reconciliation completed', { operation: 'stripe.reconciliation.global_complete' });"
  },
  // Line 261
  {
    old: /console\.error\('\[Reconciliation\] Error in global reconciliation:', error\);/,
    new: "logger.error('Error in global reconciliation', { operation: 'stripe.reconciliation.global_error' }, error instanceof Error ? error : new Error(String(error)));"
  },
];

function migrate() {
  let content = fs.readFileSync(filePath, 'utf-8');

  let migratedCount = 0;
  migrations.forEach((migration) => {
    const before = content;
    content = content.replace(migration.old, migration.new);
    if (content !== before) {
      migratedCount++;
    }
  });

  fs.writeFileSync(filePath, content, 'utf-8');

  console.log(`✅ Migrated ${migratedCount}/16 console instances in stripe-reconciliation.ts`);
}

migrate();
