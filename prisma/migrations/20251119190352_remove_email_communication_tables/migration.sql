-- Migration: remove_email_communication_tables
-- WARNING: This will delete ALL email campaign data

-- Step 1: Drop RLS policies (Supabase-specific)
DROP POLICY IF EXISTS "Users can view their church campaigns" ON "EmailCampaign";
DROP POLICY IF EXISTS "Admin and staff can create campaigns" ON "EmailCampaign";
DROP POLICY IF EXISTS "Admin and staff can update campaigns" ON "EmailCampaign";
DROP POLICY IF EXISTS "Admin can delete campaigns" ON "EmailCampaign";
DROP POLICY IF EXISTS "Users can view campaign recipients" ON "EmailRecipient";
DROP POLICY IF EXISTS "Manage recipients through campaigns" ON "EmailRecipient";
DROP POLICY IF EXISTS "Church can view member preferences" ON "EmailPreference";
DROP POLICY IF EXISTS "Public unsubscribe via token" ON "EmailPreference";
DROP POLICY IF EXISTS "System creates preferences" ON "EmailPreference";
DROP POLICY IF EXISTS "Users can view church quota" ON "EmailQuota";
DROP POLICY IF EXISTS "System manages quota" ON "EmailQuota";
DROP POLICY IF EXISTS "Users can view church email settings" ON "EmailSettings";
DROP POLICY IF EXISTS "Admin manages email settings" ON "EmailSettings";

-- Step 2: Drop foreign key constraints
ALTER TABLE "EmailCampaign" DROP CONSTRAINT IF EXISTS "EmailCampaign_churchId_fkey";
ALTER TABLE "EmailRecipient" DROP CONSTRAINT IF EXISTS "EmailRecipient_campaignId_fkey";
ALTER TABLE "EmailRecipient" DROP CONSTRAINT IF EXISTS "EmailRecipient_memberId_fkey";
ALTER TABLE "EmailPreference" DROP CONSTRAINT IF EXISTS "EmailPreference_memberId_fkey";
ALTER TABLE "EmailQuota" DROP CONSTRAINT IF EXISTS "EmailQuota_churchId_fkey";
ALTER TABLE "EmailSettings" DROP CONSTRAINT IF EXISTS "EmailSettings_churchId_fkey";

-- Step 3: Drop indexes
DROP INDEX IF EXISTS "EmailCampaign_churchId_idx";
DROP INDEX IF EXISTS "EmailCampaign_churchId_createdAt_idx";
DROP INDEX IF EXISTS "EmailCampaign_status_idx";
DROP INDEX IF EXISTS "EmailCampaign_scheduledFor_idx";
DROP INDEX IF EXISTS "idx_campaigns_church_status";
DROP INDEX IF EXISTS "idx_email_campaign_church_status";
DROP INDEX IF EXISTS "EmailRecipient_campaignId_idx";
DROP INDEX IF EXISTS "EmailRecipient_memberId_idx";
DROP INDEX IF EXISTS "idx_email_recipients_campaign_status";
DROP INDEX IF EXISTS "idx_email_recipient_campaign_email";
DROP INDEX IF EXISTS "EmailPreference_unsubscribeToken_idx";
DROP INDEX IF EXISTS "idx_email_prefs_member";
DROP INDEX IF EXISTS "idx_email_preference_member";
DROP INDEX IF EXISTS "idx_email_quota_church";
DROP INDEX IF EXISTS "idx_email_settings_church";

-- Step 4: Drop tables (cascade will remove remaining dependencies)
DROP TABLE IF EXISTS "EmailRecipient" CASCADE;
DROP TABLE IF EXISTS "EmailCampaign" CASCADE;
DROP TABLE IF EXISTS "EmailPreference" CASCADE;
DROP TABLE IF EXISTS "EmailQuota" CASCADE;
DROP TABLE IF EXISTS "EmailSettings" CASCADE;

-- Step 5: Drop enums
DROP TYPE IF EXISTS "EmailStatus";
DROP TYPE IF EXISTS "RecipientStatus";
