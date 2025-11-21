/**
 * Automated migration script for clerk-webhook/route.ts console.log statements
 * Converts unsafe console.log to structured logger calls
 */

import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'app/api/clerk-webhook/route.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Count initial console.log instances
const initialCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;
console.log(`Initial console.log count: ${initialCount}`);

// Migration patterns
const migrations = [
  // Pattern 1: console.error with missing webhook headers
  {
    pattern: /console\.error\('Missing webhook headers:', \{[^}]+\}\);/g,
    replacement: "logger.error('Missing webhook headers', { operation: 'webhook.clerk.missing_headers', has_svix_id: !!svix_id, has_svix_timestamp: !!svix_timestamp, has_svix_signature: !!svix_signature });"
  },

  // Pattern 2: console.error with webhook verification error
  {
    pattern: /console\.error\('Error verifying webhook:', err\);/g,
    replacement: "logger.error('Error verifying webhook', { operation: 'webhook.clerk.verification_error' }, err instanceof Error ? err : new Error(String(err)));"
  },

  // Pattern 3: console.error with webhook verification details
  {
    pattern: /console\.error\('Webhook verification details:', \{[\s\S]*?\}\);/g,
    replacement: "logger.error('Webhook verification details', { operation: 'webhook.clerk.verification_details', webhook_secret_length: WEBHOOK_SECRET.length, webhook_secret_prefix: WEBHOOK_SECRET.substring(0, 10), svix_id, svix_timestamp, signature_length: svix_signature?.length });"
  },

  // Pattern 4: console.log with Webhook received
  {
    pattern: /console\.log\(`Webhook received: \$\{eventType\}`\)/g,
    replacement: "logger.info('Webhook received', { operation: 'webhook.clerk.received', eventType });"
  },

  // Pattern 5: console.log with Processing user.created
  {
    pattern: /console\.log\(`Processing user\.created for user ID: \$\{id\}`\);/g,
    replacement: "logger.info('Processing user.created event', { operation: 'webhook.clerk.user_created', userId: id });"
  },

  // Pattern 6: console.log with Successfully created/updated profile
  {
    pattern: /console\.log\(`Successfully created\/updated profile for user \$\{id\}`\);/g,
    replacement: "logger.info('Successfully created/updated profile', { operation: 'webhook.clerk.profile_upserted', userId: id });"
  },

  // Pattern 7: console.error with Error creating/updating profile
  {
    pattern: /console\.error\(`Error creating\/updating profile for user \$\{id\}:`, error\);/g,
    replacement: "logger.error('Error creating/updating profile', { operation: 'webhook.clerk.profile_upsert_error', userId: id }, error instanceof Error ? error : new Error(String(error)));"
  },

  // Pattern 8: console.log with Processing user.updated
  {
    pattern: /console\.log\(`Processing user\.updated for user ID: \$\{id\}`\);/g,
    replacement: "logger.info('Processing user.updated event', { operation: 'webhook.clerk.user_updated', userId: id });"
  },

  // Pattern 9: console.log with Successfully updated profile
  {
    pattern: /console\.log\(`Successfully updated profile for user \$\{id\}`\);/g,
    replacement: "logger.info('Successfully updated profile', { operation: 'webhook.clerk.profile_updated', userId: id });"
  },

  // Pattern 10: console.error with Error updating profile
  {
    pattern: /console\.error\(`Error updating profile for user \$\{id\}:`, error\);/g,
    replacement: "logger.error('Error updating profile', { operation: 'webhook.clerk.profile_update_error', userId: id }, error instanceof Error ? error : new Error(String(error)));"
  },

  // Pattern 11: console.log with Processing organization.created
  {
    pattern: /console\.log\(`Processing organization\.created for Org ID: \$\{orgId\}`\);/g,
    replacement: "logger.info('Processing organization.created event', { operation: 'webhook.clerk.org_created', orgId });"
  },

  // Pattern 12: console.error with User already has a church
  {
    pattern: /console\.error\(`User \$\{createdByUserId\} already has a church \(is ADMIN\)\. Preventing duplicate organization creation\.\`\);/g,
    replacement: "logger.warn('User already has a church, preventing duplicate', { operation: 'webhook.clerk.org_duplicate', userId: createdByUserId });"
  },

  // Pattern 13: console.error with Church already exists for Org ID
  {
    pattern: /console\.error\(`Church already exists for Org ID: \$\{orgId\}\. Skipping duplicate creation\.\`\);/g,
    replacement: "logger.warn('Church already exists, skipping duplicate creation', { operation: 'webhook.clerk.church_duplicate', orgId });"
  },

  // Pattern 14: console.log with Successfully created church
  {
    pattern: /console\.log\(`Successfully created church for Org ID: \$\{orgId\} with internal ID: \$\{newChurch\.id\} - 30-day trial started`\);/g,
    replacement: "logger.info('Successfully created church with trial', { operation: 'webhook.clerk.church_created', orgId, churchId: newChurch.id, trial: '30-day' });"
  },

  // Pattern 15: console.log with Successfully created default donation types
  {
    pattern: /console\.log\(`Successfully created default donation types for church ID: \$\{newChurch\.id\}`\);/g,
    replacement: "logger.info('Successfully created default donation types', { operation: 'webhook.clerk.donation_types_created', churchId: newChurch.id });"
  },

  // Pattern 16: console.log with Successfully created default donation payment methods
  {
    pattern: /console\.log\(`Successfully created default donation payment methods for church ID: \$\{newChurch\.id\}`\);/g,
    replacement: "logger.info('Successfully created default payment methods', { operation: 'webhook.clerk.payment_methods_created', churchId: newChurch.id });"
  },

  // Pattern 17: console.log with Successfully created default expense categories
  {
    pattern: /console\.log\(`Successfully created default expense categories for church ID: \$\{newChurch\.id\}`\);/g,
    replacement: "logger.info('Successfully created default expense categories', { operation: 'webhook.clerk.expense_categories_created', churchId: newChurch.id });"
  },

  // Pattern 18: console.log with Updated organization creator to ADMIN role
  {
    pattern: /console\.log\(`Updated organization creator \$\{createdByUserId\} to ADMIN role`\);/g,
    replacement: "logger.info('Updated organization creator to ADMIN role', { operation: 'webhook.clerk.creator_promoted', userId: createdByUserId });"
  },

  // Pattern 19: console.warn with Could not update creator's role immediately
  {
    pattern: /console\.warn\(`Could not update creator's role immediately \(profile might not exist yet\):`, profileError\);/g,
    replacement: "logger.warn('Could not update creator role immediately', { operation: 'webhook.clerk.creator_role_delay' }, profileError instanceof Error ? profileError : new Error(String(profileError)));"
  },

  // Pattern 20: console.error with Error in organization.created processing
  {
    pattern: /console\.error\(`Error in organization\.created processing for Org ID \$\{orgId\} \(church or default donation types\):`, error\);/g,
    replacement: "logger.error('Error in organization.created processing', { operation: 'webhook.clerk.org_created_error', orgId }, error instanceof Error ? error : new Error(String(error)));"
  },

  // Pattern 21: console.error with User ID missing in organizationMembership.created
  {
    pattern: /console\.error\('User ID missing in organizationMembership\.created event'\);/g,
    replacement: "logger.error('User ID missing in organizationMembership.created event', { operation: 'webhook.clerk.membership_created_no_user' });"
  },

  // Pattern 22: console.log with Processing organizationMembership.created
  {
    pattern: /console\.log\(`Processing organizationMembership\.created for Org ID: \$\{orgId\}, User ID: \$\{userId\}`\);/g,
    replacement: "logger.info('Processing organizationMembership.created event', { operation: 'webhook.clerk.membership_created', orgId, userId });"
  },

  // Pattern 23: console.error with Church not found for Org ID
  {
    pattern: /console\.error\(`Church not found for Org ID: \$\{orgId\}`\);/g,
    replacement: "logger.error('Church not found for organization', { operation: 'webhook.clerk.church_not_found', orgId });"
  },

  // Pattern 24: console.log with Retry attempt
  {
    pattern: /console\.log\(`Retry attempt \$\{attempt \+ 1\}\/\$\{maxRetries\} for Org ID: \$\{orgId\}`\);/g,
    replacement: "logger.debug('Retrying church lookup', { operation: 'webhook.clerk.church_lookup_retry', orgId, attempt: attempt + 1, maxRetries });"
  },

  // Pattern 25: console.log with Church found on retry
  {
    pattern: /console\.log\(`Church found on retry attempt \$\{attempt \+ 1\}`\);/g,
    replacement: "logger.info('Church found on retry', { operation: 'webhook.clerk.church_found_retry', attempt: attempt + 1 });"
  },

  // Pattern 26: console.log with Church not yet created after retries
  {
    pattern: /console\.log\(`Church not yet created for Org ID: \$\{orgId\} after \$\{maxRetries\} retries\. Returning 202 for Clerk retry\.\`\);/g,
    replacement: "logger.warn('Church not yet created after retries', { operation: 'webhook.clerk.church_retry_exhausted', orgId, maxRetries });"
  },

  // Pattern 27: console.log with Successfully updated/created profile
  {
    pattern: /console\.log\(`Successfully updated\/created profile for User ID: \$\{userId\} in Org ID: \$\{orgId\}`\);/g,
    replacement: "logger.info('Successfully updated/created profile for membership', { operation: 'webhook.clerk.membership_profile_upserted', userId, orgId });"
  },

  // Pattern 28: console.error with Error updating profile for User ID
  {
    pattern: /console\.error\(`Error updating profile for User ID \$\{userId\} in Org ID \$\{orgId\}:`, error\);/g,
    replacement: "logger.error('Error updating profile for membership', { operation: 'webhook.clerk.membership_profile_error', userId, orgId }, error instanceof Error ? error : new Error(String(error)));"
  },

  // Pattern 29: console.warn with Profile not found (race condition)
  {
    pattern: /console\.warn\(`Profile for User ID \$\{userId\} not found\. Might be a race condition\. Webhook will likely retry\.\`\);/g,
    replacement: "logger.warn('Profile not found, possible race condition', { operation: 'webhook.clerk.profile_race_condition', userId });"
  },

  // Pattern 30: console.error with organization.updated event missing organization id
  {
    pattern: /console\.error\('organization\.updated event missing organization id'\);/g,
    replacement: "logger.error('organization.updated event missing organization id', { operation: 'webhook.clerk.org_updated_no_id' });"
  },

  // Pattern 31: console.log with Processing organization.updated
  {
    pattern: /console\.log\(`Processing organization\.updated for Org ID: \$\{orgId\}`\);/g,
    replacement: "logger.info('Processing organization.updated event', { operation: 'webhook.clerk.org_updated', orgId });"
  },

  // Pattern 32: console.warn with Church not found during organization.updated
  {
    pattern: /console\.warn\(`Church not found for Org ID: \$\{orgId\} during organization\.updated\. Returning 202 for retry\.\`\);/g,
    replacement: "logger.warn('Church not found for organization update', { operation: 'webhook.clerk.org_update_church_not_found', orgId });"
  },

  // Pattern 33: console.log with No changes needed for church
  {
    pattern: /console\.log\(`No changes needed for church \$\{church\.id\} on organization\.updated`\);/g,
    replacement: "logger.debug('No changes needed for church on org update', { operation: 'webhook.clerk.org_update_no_changes', churchId: church.id });"
  },

  // Pattern 34: console.log with Successfully updated church from organization.updated
  {
    pattern: /console\.log\(`Successfully updated church \$\{church\.id\} from organization\.updated event`\);/g,
    replacement: "logger.info('Successfully updated church from org update', { operation: 'webhook.clerk.church_updated', churchId: church.id });"
  },

  // Pattern 35: console.error with Error processing organization.updated
  {
    pattern: /console\.error\(`Error processing organization\.updated for Org ID \$\{orgId\}:`, error\);/g,
    replacement: "logger.error('Error processing organization.updated', { operation: 'webhook.clerk.org_update_error', orgId }, error instanceof Error ? error : new Error(String(error)));"
  },

  // Pattern 36: console.error with User ID missing in organizationMembership.updated
  {
    pattern: /console\.error\('User ID missing in organizationMembership\.updated event'\);/g,
    replacement: "logger.error('User ID missing in organizationMembership.updated event', { operation: 'webhook.clerk.membership_updated_no_user' });"
  },

  // Pattern 37: console.log with Processing organizationMembership.updated
  {
    pattern: /console\.log\(`Processing organizationMembership\.updated for Org ID: \$\{orgId\}, User ID: \$\{userId\}, New Role: \$\{role\}`\);/g,
    replacement: "logger.info('Processing organizationMembership.updated event', { operation: 'webhook.clerk.membership_updated', orgId, userId, newRole: role });"
  },

  // Pattern 38: console.error with Church not found in organizationMembership.updated
  {
    pattern: /console\.error\(`Church not found for Org ID: \$\{orgId\} in organizationMembership\.updated`\);/g,
    replacement: "logger.error('Church not found for membership update', { operation: 'webhook.clerk.membership_update_church_not_found', orgId });"
  },

  // Pattern 39: console.log with Successfully updated role
  {
    pattern: /console\.log\(`Successfully updated role for User ID: \$\{userId\} to \$\{prismaRole\}`\);/g,
    replacement: "logger.info('Successfully updated user role', { operation: 'webhook.clerk.role_updated', userId, newRole: prismaRole });"
  },

  // Pattern 40: console.error with Error updating role for User ID
  {
    pattern: /console\.error\(`Error updating role for User ID \$\{userId\}:`, error\);/g,
    replacement: "logger.error('Error updating user role', { operation: 'webhook.clerk.role_update_error', userId }, error instanceof Error ? error : new Error(String(error)));"
  },

  // Pattern 41: console.warn with Profile not found (membership update)
  {
    pattern: /console\.warn\(`Profile for User ID \$\{userId\} not found\. Might be a race condition\.\`\);/g,
    replacement: "logger.warn('Profile not found for role update, possible race condition', { operation: 'webhook.clerk.role_update_race_condition', userId });"
  },

  // Pattern 42: console.error with User ID missing in organizationMembership.deleted
  {
    pattern: /console\.error\('User ID missing in organizationMembership\.deleted event'\);/g,
    replacement: "logger.error('User ID missing in organizationMembership.deleted event', { operation: 'webhook.clerk.membership_deleted_no_user' });"
  },

  // Pattern 43: console.log with Processing organizationMembership.deleted
  {
    pattern: /console\.log\(`Processing organizationMembership\.deleted for Org ID: \$\{orgId \|\| 'N\/A'\}, User ID: \$\{userId\}`\);/g,
    replacement: "logger.info('Processing organizationMembership.deleted event', { operation: 'webhook.clerk.membership_deleted', orgId: orgId || 'N/A', userId });"
  },

  // Pattern 44: console.log with Successfully deleted profile
  {
    pattern: /console\.log\(`Successfully deleted profile for User ID: \$\{userId\} due to org membership deletion\.\`\);/g,
    replacement: "logger.info('Successfully deleted profile for membership deletion', { operation: 'webhook.clerk.profile_deleted', userId });"
  },

  // Pattern 45: console.warn with Profile deletion skipped
  {
    pattern: /console\.warn\(`Profile deletion skipped: Profile for User ID \$\{userId\} not found \(might be already deleted\)\.\`\);/g,
    replacement: "logger.warn('Profile deletion skipped, already deleted', { operation: 'webhook.clerk.profile_delete_skip', userId });"
  },

  // Pattern 46: console.error with Error deleting profile
  {
    pattern: /console\.error\(`Error deleting profile for User ID \$\{userId\} after org membership deletion:`, error\);/g,
    replacement: "logger.error('Error deleting profile for membership deletion', { operation: 'webhook.clerk.profile_delete_error', userId }, error instanceof Error ? error : new Error(String(error)));"
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
