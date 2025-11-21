/**
 * Automated migration script for donors.actions.ts console.log statements
 * Converts unsafe console.log to structured logger calls
 */

import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'lib/actions/donors.actions.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Count initial console.log instances
const initialCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;
console.log(`Initial console.log count: ${initialCount}`);

// Migration patterns
const migrations = [
  // Pattern 1: console.error with simple message and error object
  {
    pattern: /console\.error\('Failed to fetch donors:', error\);/g,
    replacement: "logger.error('Failed to fetch donors', { operation: 'donors.fetch.error' }, error instanceof Error ? error : new Error(String(error)));"
  },

  // Pattern 2: console.error with [getDonorDetails] prefix and simple message
  {
    pattern: /console\.error\("\[getDonorDetails\] Error: ([^"]+)"\);/g,
    replacement: "logger.error('$1', { operation: 'donors.get_details.error' });"
  },

  // Pattern 3: console.error with [getDonorDetails] Authorization failed
  {
    pattern: /console\.error\("\[getDonorDetails\] Authorization failed:", ([^)]+)\);/g,
    replacement: "logger.error('Authorization failed', { operation: 'donors.get_details.auth_error', error: $1 });"
  },

  // Pattern 4: console.error with [getDonorDetails] No orgId found
  {
    pattern: /console\.error\("\[getDonorDetails\] No orgId found in auth"\);/g,
    replacement: "logger.error('No orgId found in auth', { operation: 'donors.get_details.no_org' });"
  },

  // Pattern 5: console.error with [getDonorDetails] Church not found for orgId
  {
    pattern: /console\.error\("\[getDonorDetails\] Church not found for orgId:", orgId\);/g,
    replacement: "logger.error('Church not found for orgId', { operation: 'donors.get_details.no_church', orgId });"
  },

  // Pattern 6: console.error Failed to fetch donor details
  {
    pattern: /console\.error\("Failed to fetch donor details:", error\);/g,
    replacement: "logger.error('Failed to fetch donor details', { operation: 'donors.fetch_details.error' }, error instanceof Error ? error : new Error(String(error)));"
  },

  // Pattern 7: console.log Warning about duplicate name
  {
    pattern: /console\.log\(`Warning: A donor with the name \$\{payload\.firstName\} \$\{payload\.lastName\} already exists in this church\.\`\);/g,
    replacement: "logger.warn('Donor with same name already exists in church', { operation: 'donors.create.duplicate_name_warning', firstName: payload.firstName, lastName: payload.lastName });"
  },

  // Pattern 8: console.error Failed to create donor
  {
    pattern: /console\.error\("Failed to create donor:", error\);/g,
    replacement: "logger.error('Failed to create donor', { operation: 'donors.create.error' }, error instanceof Error ? error : new Error(String(error)));"
  },

  // Pattern 9: console.error No organization ID found for manual donation donors
  {
    pattern: /console\.error\("No organization ID found for manual donation donors"\);/g,
    replacement: "logger.error('No organization ID found for manual donation donors', { operation: 'donors.manual_donation.no_org' });"
  },

  // Pattern 10: console.error Church not found for manual donation donors
  {
    pattern: /console\.error\("Church not found for manual donation donors"\);/g,
    replacement: "logger.error('Church not found for manual donation donors', { operation: 'donors.manual_donation.no_church' });"
  },

  // Pattern 11: console.error Failed to fetch donors for manual donation
  {
    pattern: /console\.error\("Failed to fetch donors for manual donation:", error\);/g,
    replacement: "logger.error('Failed to fetch donors for manual donation', { operation: 'donors.manual_donation.error' }, error instanceof Error ? error : new Error(String(error)));"
  },

  // Pattern 12: console.error [updateDonorDetails] Donor ID is required
  {
    pattern: /console\.error\("\[updateDonorDetails\] Donor ID is required\."\);/g,
    replacement: "logger.error('Donor ID is required', { operation: 'donors.update_details.no_id' });"
  },

  // Pattern 13: console.log [updateDonorDetails] No fields to update
  {
    pattern: /console\.log\(`\[updateDonorDetails\] No fields to update for donor \$\{donorId\} other than potentially memberId, or payload was empty\. Fetching current details\.\`\);/g,
    replacement: "logger.debug('No fields to update for donor, fetching current details', { operation: 'donors.update_details.no_changes', donorId });"
  },

  // Pattern 14: console.error Failed to update donor details
  {
    pattern: /console\.error\("Failed to update donor details:", error\);/g,
    replacement: "logger.error('Failed to update donor details', { operation: 'donors.update_details.error' }, error instanceof Error ? error : new Error(String(error)));"
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
