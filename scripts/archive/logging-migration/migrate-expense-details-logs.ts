/**
 * Automated migration script for expenses/[expenseId]/route.ts console.log statements
 * Converts unsafe console.log to structured logger calls
 */

import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'app/api/expenses/[expenseId]/route.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Count initial console.log instances
const initialCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;
console.log(`Initial console.log count: ${initialCount}`);

// Migration patterns
const migrations = [
  // Pattern 1: console.error with signed URL generation error
  {
    pattern: /console\.error\('Error generating signed URL after upload:', signedUrlError\);/g,
    replacement: "logger.error('Error generating signed URL after upload', { operation: 'expense.receipt.signed_url_error' }, signedUrlError instanceof Error ? signedUrlError : new Error(String(signedUrlError)));"
  },

  // Pattern 2: console.warn with Failed to delete existing receipt
  {
    pattern: /console\.warn\(`Failed to delete existing receipt at \$\{path\}:`, error\);/g,
    replacement: "logger.warn('Failed to delete existing receipt', { operation: 'expense.receipt.delete_failed', path, error: error instanceof Error ? error.message : String(error) });"
  },

  // Pattern 3: console.error with Unexpected error deleting receipt
  {
    pattern: /console\.error\(`Unexpected error deleting receipt at \$\{path\}:`, deleteError\);/g,
    replacement: "logger.error('Unexpected error deleting receipt', { operation: 'expense.receipt.delete_error', path }, deleteError instanceof Error ? deleteError : new Error(String(deleteError)));"
  },

  // Pattern 4: console.error with User attempted GET without active org
  {
    pattern: /console\.error\(`User \$\{userId\} attempted GET on expense \$\{expenseId\} without active org\.\`\);/g,
    replacement: "logger.error('User attempted GET on expense without active org', { operation: 'expense.get.no_org', userId, expenseId });"
  },

  // Pattern 5: console.error with Error fetching expense
  {
    pattern: /console\.error\(`Error fetching expense \$\{expenseId\}:`, error\);/g,
    replacement: "logger.error('Error fetching expense', { operation: 'expense.get.error', expenseId }, error instanceof Error ? error : new Error(String(error)));"
  },

  // Pattern 6: console.error with User attempted PATCH without active org
  {
    pattern: /console\.error\(`User \$\{userId\} attempted PATCH on expense \$\{expenseId\} without active org\.\`\);/g,
    replacement: "logger.error('User attempted PATCH on expense without active org', { operation: 'expense.patch.no_org', userId, expenseId });"
  },

  // Pattern 7: console.warn with Failed to parse receipt metadata JSON
  {
    pattern: /console\.warn\('Failed to parse receipt metadata JSON:', parseError\);/g,
    replacement: "logger.warn('Failed to parse receipt metadata JSON', { operation: 'expense.receipt.metadata_parse_error', error: parseError instanceof Error ? parseError.message : String(parseError) });"
  },

  // Pattern 8: console.error with Receipt upload failed during update
  {
    pattern: /console\.error\('Receipt upload failed during update:', uploadError\);/g,
    replacement: "logger.error('Receipt upload failed during update', { operation: 'expense.patch.upload_failed' }, uploadError instanceof Error ? uploadError : new Error(String(uploadError)));"
  },

  // Pattern 9: console.warn with PATCH failed for expense
  {
    pattern: /console\.warn\(`PATCH failed for expense \$\{expenseId\} by user \$\{userId\}\. Count: \$\{updateResult\.count\}`\);/g,
    replacement: "logger.warn('PATCH failed for expense', { operation: 'expense.patch.failed', expenseId, userId, updateCount: updateResult.count });"
  },

  // Pattern 10: console.error with Error updating expense
  {
    pattern: /console\.error\(`Error updating expense \$\{expenseId\}:`, error\);/g,
    replacement: "logger.error('Error updating expense', { operation: 'expense.patch.error', expenseId }, error instanceof Error ? error : new Error(String(error)));"
  },

  // Pattern 11: console.error with User attempted DELETE without active org
  {
    pattern: /console\.error\(`User \$\{userId\} attempted DELETE on expense \$\{expenseId\} without active org\.\`\);/g,
    replacement: "logger.error('User attempted DELETE on expense without active org', { operation: 'expense.delete.no_org', userId, expenseId });"
  },

  // Pattern 12: console.log with Attempting to delete storage file
  {
    pattern: /console\.log\(`Attempting to delete storage file: \$\{existingExpense\.receiptPath\}`\);/g,
    replacement: "logger.debug('Attempting to delete storage file', { operation: 'expense.delete.storage_delete_attempt', receiptPath: existingExpense.receiptPath });"
  },

  // Pattern 13: console.log with Storage deletion response - Data
  {
    pattern: /console\.log\(`Storage deletion response - Data:`, storageData\);/g,
    replacement: "logger.debug('Storage deletion response data', { operation: 'expense.delete.storage_response', storageData });"
  },

  // Pattern 14: console.log with Storage deletion response - Error
  {
    pattern: /console\.log\(`Storage deletion response - Error:`, storageError\);/g,
    replacement: "logger.debug('Storage deletion response error', { operation: 'expense.delete.storage_response_error', storageError });"
  },

  // Pattern 15: console.warn with Failed to delete storage file
  {
    pattern: /console\.warn\(`Failed to delete storage file \$\{existingExpense\.receiptPath\}:`, storageError\);/g,
    replacement: "logger.warn('Failed to delete storage file', { operation: 'expense.delete.storage_delete_failed', receiptPath: existingExpense.receiptPath, error: storageError });"
  },

  // Pattern 16: console.log with Successfully deleted storage file
  {
    pattern: /console\.log\(`Successfully deleted storage file or file did not exist: \$\{existingExpense\.receiptPath\}`\);/g,
    replacement: "logger.info('Successfully deleted storage file or file did not exist', { operation: 'expense.delete.storage_deleted', receiptPath: existingExpense.receiptPath });"
  },

  // Pattern 17: console.error with Unexpected error deleting storage file
  {
    pattern: /console\.error\(`Unexpected error deleting storage file \$\{existingExpense\.receiptPath\}:`, storageCatchError\);/g,
    replacement: "logger.error('Unexpected error deleting storage file', { operation: 'expense.delete.storage_error', receiptPath: existingExpense.receiptPath }, storageCatchError instanceof Error ? storageCatchError : new Error(String(storageCatchError)));"
  },

  // Pattern 18: console.log with Expense deleted successfully
  {
    pattern: /console\.log\(`\[API\] Expense deleted successfully\. Invalidating cache for org: \$\{orgId\}`\);/g,
    replacement: "logger.info('Expense deleted successfully, invalidating cache', { operation: 'expense.delete.success', orgId });"
  },

  // Pattern 19: console.warn with DELETE inconsistency
  {
    pattern: /console\.warn\(`DELETE inconsistency for expense \$\{expenseId\} by user \$\{userId\}\. Count: \$\{deleteResult\.count\}`\);/g,
    replacement: "logger.warn('DELETE inconsistency for expense', { operation: 'expense.delete.inconsistency', expenseId, userId, deleteCount: deleteResult.count });"
  },

  // Pattern 20: console.log with Successfully deleted expense record
  {
    pattern: /console\.log\(`Successfully deleted expense record: \$\{expenseId\}`\);/g,
    replacement: "logger.info('Successfully deleted expense record', { operation: 'expense.delete.record_deleted', expenseId });"
  },

  // Pattern 21: console.error with Error deleting expense
  {
    pattern: /console\.error\(`Error deleting expense \$\{expenseId\}:`, error\);/g,
    replacement: "logger.error('Error deleting expense', { operation: 'expense.delete.error', expenseId }, error instanceof Error ? error : new Error(String(error)));"
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
