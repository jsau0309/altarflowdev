-- =====================================================================
-- Performance Indexes based on Supabase recommendations
-- Date: 2025-08-09
-- =====================================================================

-- Critical indexes for most common queries
CREATE INDEX IF NOT EXISTS "idx_donations_church_date" 
ON "DonationTransaction"("churchId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_members_church_status" 
ON "Member"("churchId", "membershipStatus");

CREATE INDEX IF NOT EXISTS "idx_campaigns_church_status" 
ON "EmailCampaign"("churchId", "status");

CREATE INDEX IF NOT EXISTS "idx_email_recipients_campaign_status" 
ON "EmailRecipient"("campaignId", "status");

CREATE INDEX IF NOT EXISTS "idx_members_church_email" 
ON "Member"("churchId", "email");

CREATE INDEX IF NOT EXISTS "idx_donations_church_fund_date" 
ON "DonationTransaction"("churchId", "donationTypeId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_expenses_church_date" 
ON "Expense"("churchId", "expenseDate" DESC);

CREATE INDEX IF NOT EXISTS "idx_email_prefs_member" 
ON "EmailPreference"("memberId");

-- Drop unused indexes identified by Supabase
DROP INDEX IF EXISTS "DonationTransaction_refundedAt_idx";
DROP INDEX IF EXISTS "PayoutSummary_churchId_idx";
DROP INDEX IF EXISTS "PayoutSummary_status_idx";
DROP INDEX IF EXISTS "idx_stripe_connect_church";
DROP INDEX IF EXISTS "DonationTransaction_donorClerkId_idx";
DROP INDEX IF EXISTS "DonationTransaction_stripePaymentIntentId_idx";
DROP INDEX IF EXISTS "DonationTransaction_stripeSubscriptionId_idx";
DROP INDEX IF EXISTS "DonationType_churchId_idx";
DROP INDEX IF EXISTS "Donation_campaignId_idx";
DROP INDEX IF EXISTS "Expense_approverId_idx";
DROP INDEX IF EXISTS "Flow_churchId_idx";
DROP INDEX IF EXISTS "Flow_churchId_slug_idx";
DROP INDEX IF EXISTS "StripeConnectAccount_churchId_idx";
DROP INDEX IF EXISTS "Submission_memberId_idx";
DROP INDEX IF EXISTS "idempotency_cache_expiresAt_idx";
DROP INDEX IF EXISTS "DonationTransaction_status_idx";
DROP INDEX IF EXISTS "Expense_status_idx";
DROP INDEX IF EXISTS "Member_churchId_membershipStatus_idx";
DROP INDEX IF EXISTS "EmailRecipient_campaignId_idx";
DROP INDEX IF EXISTS "EmailRecipient_email_idx";
DROP INDEX IF EXISTS "EmailPreference_email_idx";
DROP INDEX IF EXISTS "EmailQuota_churchId_idx";