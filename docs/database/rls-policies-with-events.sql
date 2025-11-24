-- =====================================================
-- AltarFlow Development Database - Complete RLS Restoration
-- Generated: 2025-11-10 (Updated with Event table)
-- Purpose: Restore all RLS policies after database reset
-- =====================================================

-- =====================================================
-- STEP 1: Create Helper Functions
-- =====================================================

-- Helper function to get church ID from JWT (user_metadata approach)
CREATE OR REPLACE FUNCTION get_church_id_from_auth()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'church_id')::UUID
$$;

-- Cached church ID getter (optimized version)
CREATE OR REPLACE FUNCTION get_user_church_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'church_id')::uuid
$$;

-- Helper function to get org ID (for tables that use clerkOrgId)
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (auth.jwt() ->> 'org_id')::text
$$;

-- Helper function to get my church ID (alternative name)
CREATE OR REPLACE FUNCTION get_my_church_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (auth.jwt() -> 'user_metadata' ->> 'church_id')::UUID;
END;
$$;

COMMENT ON FUNCTION get_user_church_id() IS 'Cached function to get user church ID from JWT, prevents re-evaluation on every row. Critical for performance - reduces email sending from 28s to 2-3s';
COMMENT ON FUNCTION get_user_org_id() IS 'Cached function to get user org ID from JWT for tables that use clerkOrgId';

-- =====================================================
-- STEP 2: Enable RLS on All Tables
-- =====================================================

ALTER TABLE "Church" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Donor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DonationType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DonationTransaction" ENABLE ROW LEVEL SECURITY;
-- Campaign table merged into DonationType - no longer exists
-- ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;
-- Donation table dropped in migration 20251018064500 - no longer exists
-- ALTER TABLE "Donation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Flow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Submission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StripeConnectAccount" ENABLE ROW LEVEL SECURITY;
-- InviteToken table removed in migration 20250430072555 - no longer exists
-- ALTER TABLE "InviteToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayoutSummary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailCampaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailQuota" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LandingPageConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Church Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Churches are viewable by organization members" ON "Church";
DROP POLICY IF EXISTS "Churches are updatable by organization members" ON "Church";
DROP POLICY IF EXISTS "Users can view their own church" ON "Church";
DROP POLICY IF EXISTS "Users can update their own church" ON "Church";

CREATE POLICY "Users can view their own church" ON "Church"
    FOR SELECT
    USING ("clerkOrgId" = (SELECT get_user_org_id()));

CREATE POLICY "Users can update their own church" ON "Church"
    FOR UPDATE
    USING ("clerkOrgId" = (SELECT get_user_org_id()));

ALTER TABLE "Church" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: Profile Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Allow users to view their own profile" ON "Profile";
DROP POLICY IF EXISTS "Allow users to update their own profile" ON "Profile";
DROP POLICY IF EXISTS "Users can view their own profile" ON "Profile";
DROP POLICY IF EXISTS "Users can update their own profile" ON "Profile";

-- Profile.id is TEXT, auth.uid() returns UUID, so we need to cast
CREATE POLICY "Allow users to view their own profile" ON "Profile"
    FOR SELECT
    USING (id = auth.uid()::TEXT);

CREATE POLICY "Allow users to update their own profile" ON "Profile"
    FOR UPDATE
    USING (id = auth.uid()::TEXT)
    WITH CHECK (id = auth.uid()::TEXT);

ALTER TABLE "Profile" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: Member Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Allow church-specific access to members" ON "Member";
DROP POLICY IF EXISTS "Users can view members of their church" ON "Member";
DROP POLICY IF EXISTS "Users can insert members for their church" ON "Member";
DROP POLICY IF EXISTS "Users can update members of their church" ON "Member";
DROP POLICY IF EXISTS "Users can delete members of their church" ON "Member";

CREATE POLICY "Users can view members of their church" ON "Member"
    FOR SELECT
    USING ("churchId" = (SELECT get_user_church_id()));

CREATE POLICY "Users can insert members for their church" ON "Member"
    FOR INSERT
    WITH CHECK ("churchId" = (SELECT get_user_church_id()));

CREATE POLICY "Users can update members of their church" ON "Member"
    FOR UPDATE
    USING ("churchId" = (SELECT get_user_church_id()));

CREATE POLICY "Users can delete members of their church" ON "Member"
    FOR DELETE
    USING ("churchId" = (SELECT get_user_church_id()));

ALTER TABLE "Member" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 6: Donor Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Allow church-specific access to donors" ON "Donor";
DROP POLICY IF EXISTS "Users can view donors of their church" ON "Donor";
DROP POLICY IF EXISTS "Users can manage donors of their church" ON "Donor";

CREATE POLICY "Users can view donors of their church" ON "Donor"
    FOR SELECT
    USING ("churchId" = (SELECT get_user_church_id()));

CREATE POLICY "Users can manage donors of their church" ON "Donor"
    FOR ALL
    USING ("churchId" = (SELECT get_user_church_id()));

ALTER TABLE "Donor" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 7: DonationType Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Allow church-specific access to donation types" ON "DonationType";
DROP POLICY IF EXISTS "Users can view donation types of their church" ON "DonationType";
DROP POLICY IF EXISTS "Users can manage donation types of their church" ON "DonationType";

CREATE POLICY "Users can view donation types of their church" ON "DonationType"
    FOR SELECT
    USING ("churchId" = (SELECT get_user_church_id()));

CREATE POLICY "Users can manage donation types of their church" ON "DonationType"
    FOR ALL
    USING ("churchId" = (SELECT get_user_church_id()));

ALTER TABLE "DonationType" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 8: DonationTransaction Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Allow church-specific access to donation transactions" ON "DonationTransaction";
DROP POLICY IF EXISTS "Users can view donation transactions of their church" ON "DonationTransaction";
DROP POLICY IF EXISTS "Users can manage donation transactions of their church" ON "DonationTransaction";

CREATE POLICY "Users can view donation transactions of their church" ON "DonationTransaction"
    FOR SELECT
    USING ("churchId" = (SELECT get_user_church_id()));

CREATE POLICY "Users can manage donation transactions of their church" ON "DonationTransaction"
    FOR ALL
    USING ("churchId" = (SELECT get_user_church_id()));

ALTER TABLE "DonationTransaction" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 9: Campaign Table Policies (REMOVED - merged into DonationType)
-- =====================================================
-- Campaign table was merged into DonationType in migration 20251017231015
-- No policies needed here

-- =====================================================
-- STEP 10: Donation Table Policies (REMOVED - table dropped)
-- =====================================================
-- Donation table was dropped in migration 20251018064500_drop_unused_donation_table
-- All donation data is now in DonationTransaction table
-- No policies needed here

-- =====================================================
-- STEP 11: Expense Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Allow church-specific access to expenses" ON "Expense";
DROP POLICY IF EXISTS "Users can view expenses of their church" ON "Expense";
DROP POLICY IF EXISTS "Users can manage expenses of their church" ON "Expense";

CREATE POLICY "Users can view expenses of their church" ON "Expense"
    FOR SELECT
    USING ("churchId" = (SELECT get_user_church_id()));

CREATE POLICY "Users can manage expenses of their church" ON "Expense"
    FOR ALL
    USING ("churchId" = (SELECT get_user_church_id()));

ALTER TABLE "Expense" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 12: Flow Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Allow church-specific access to flows" ON "Flow";

CREATE POLICY "Allow church-specific access to flows" ON "Flow"
    FOR ALL
    USING (
        "churchId" = (
            SELECT id FROM "Church"
            WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id')
        )
    )
    WITH CHECK (
        "churchId" = (
            SELECT id FROM "Church"
            WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id')
        )
    );

ALTER TABLE "Flow" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 13: Submission Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Allow church-specific access to submissions" ON "Submission";

CREATE POLICY "Allow church-specific access to submissions" ON "Submission"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "Flow" f
            WHERE f.id = "Submission"."flowId"
            AND f."churchId" = (
                SELECT c.id FROM "Church" c
                WHERE c."clerkOrgId" = (auth.jwt() ->> 'org_id')
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Flow" f
            WHERE f.id = "Submission"."flowId"
            AND f."churchId" = (
                SELECT c.id FROM "Church" c
                WHERE c."clerkOrgId" = (auth.jwt() ->> 'org_id')
            )
        )
    );

ALTER TABLE "Submission" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 14: StripeConnectAccount Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Allow church-specific access to stripe connect accounts" ON "StripeConnectAccount";
DROP POLICY IF EXISTS "Allow church-specific access to stripe accounts" ON "StripeConnectAccount";
DROP POLICY IF EXISTS "Users can view their church Stripe account" ON "StripeConnectAccount";
DROP POLICY IF EXISTS "Users can manage their church Stripe account" ON "StripeConnectAccount";

CREATE POLICY "Users can view their church Stripe account" ON "StripeConnectAccount"
    FOR SELECT
    USING ("churchId" = (SELECT get_user_org_id()));

CREATE POLICY "Users can manage their church Stripe account" ON "StripeConnectAccount"
    FOR ALL
    USING ("churchId" = (SELECT get_user_org_id()));

ALTER TABLE "StripeConnectAccount" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 15: InviteToken Table Policies (REMOVED - table dropped)
-- =====================================================
-- InviteToken table was removed in migration 20250430072555_remove_invite_token_model
-- Invitation system now uses Clerk's built-in invitations
-- No policies needed here

-- =====================================================
-- STEP 16: PayoutSummary Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Allow church-specific access to payout summaries" ON "PayoutSummary";
DROP POLICY IF EXISTS "Users can view payout summaries of their church" ON "PayoutSummary";
DROP POLICY IF EXISTS "Users can manage payout summaries of their church" ON "PayoutSummary";

CREATE POLICY "Users can view payout summaries of their church" ON "PayoutSummary"
    FOR SELECT
    USING ("churchId" = (SELECT get_user_church_id()));

CREATE POLICY "Users can manage payout summaries of their church" ON "PayoutSummary"
    FOR ALL
    USING ("churchId" = (SELECT get_user_church_id()));

ALTER TABLE "PayoutSummary" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 17: EmailCampaign Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view their church campaigns" ON "EmailCampaign";
DROP POLICY IF EXISTS "Admin and staff can create campaigns" ON "EmailCampaign";
DROP POLICY IF EXISTS "Admin and staff can update campaigns" ON "EmailCampaign";
DROP POLICY IF EXISTS "Admin can delete campaigns" ON "EmailCampaign";
DROP POLICY IF EXISTS "Users can view campaigns of their church" ON "EmailCampaign";
DROP POLICY IF EXISTS "Users can insert campaigns for their church" ON "EmailCampaign";
DROP POLICY IF EXISTS "Users can update campaigns of their church" ON "EmailCampaign";
DROP POLICY IF EXISTS "Users can delete campaigns of their church" ON "EmailCampaign";

CREATE POLICY "Users can view campaigns of their church" ON "EmailCampaign"
    FOR SELECT
    USING ("churchId" = (SELECT get_user_church_id()));

CREATE POLICY "Users can insert campaigns for their church" ON "EmailCampaign"
    FOR INSERT
    WITH CHECK ("churchId" = (SELECT get_user_church_id()));

CREATE POLICY "Users can update campaigns of their church" ON "EmailCampaign"
    FOR UPDATE
    USING ("churchId" = (SELECT get_user_church_id()));

CREATE POLICY "Users can delete campaigns of their church" ON "EmailCampaign"
    FOR DELETE
    USING ("churchId" = (SELECT get_user_church_id()));

ALTER TABLE "EmailCampaign" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 18: EmailRecipient Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view campaign recipients" ON "EmailRecipient";
DROP POLICY IF EXISTS "Manage recipients through campaigns" ON "EmailRecipient";
DROP POLICY IF EXISTS "Users can view recipients of their church campaigns" ON "EmailRecipient";
DROP POLICY IF EXISTS "Users can manage recipients of their church campaigns" ON "EmailRecipient";

CREATE POLICY "Users can view recipients of their church campaigns" ON "EmailRecipient"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "EmailCampaign" ec
            WHERE ec.id = "EmailRecipient"."campaignId"
            AND ec."churchId" = (SELECT get_user_church_id())
        )
    );

CREATE POLICY "Users can manage recipients of their church campaigns" ON "EmailRecipient"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "EmailCampaign" ec
            WHERE ec.id = "EmailRecipient"."campaignId"
            AND ec."churchId" = (SELECT get_user_church_id())
        )
    );

ALTER TABLE "EmailRecipient" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 19: EmailPreference Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Church can view member preferences" ON "EmailPreference";
DROP POLICY IF EXISTS "Public unsubscribe via token" ON "EmailPreference";
DROP POLICY IF EXISTS "System creates preferences" ON "EmailPreference";
DROP POLICY IF EXISTS "Allow church-specific access to email preferences" ON "EmailPreference";
DROP POLICY IF EXISTS "Users can view email preferences of their church members" ON "EmailPreference";
DROP POLICY IF EXISTS "Users can manage email preferences of their church members" ON "EmailPreference";

CREATE POLICY "Users can view email preferences of their church members" ON "EmailPreference"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "Member" m
            WHERE m.id = "EmailPreference"."memberId"
            AND m."churchId" = (SELECT get_user_church_id())
        )
    );

CREATE POLICY "Users can manage email preferences of their church members" ON "EmailPreference"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "Member" m
            WHERE m.id = "EmailPreference"."memberId"
            AND m."churchId" = (SELECT get_user_church_id())
        )
    );

-- Public unsubscribe via token (allows updates without authentication)
CREATE POLICY "Public unsubscribe via token" ON "EmailPreference"
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

ALTER TABLE "EmailPreference" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 20: EmailQuota Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view church quota" ON "EmailQuota";
DROP POLICY IF EXISTS "System manages quota" ON "EmailQuota";
DROP POLICY IF EXISTS "Allow church-specific access to email quotas" ON "EmailQuota";
DROP POLICY IF EXISTS "Users can view their church email quota" ON "EmailQuota";
DROP POLICY IF EXISTS "Users can select their church email quota" ON "EmailQuota";
DROP POLICY IF EXISTS "Users can update their church email quota" ON "EmailQuota";
DROP POLICY IF EXISTS "Users can manage their church email quota" ON "EmailQuota";

CREATE POLICY "Users can view their church email quota" ON "EmailQuota"
    FOR SELECT
    USING ("churchId" = (SELECT get_user_church_id()));

CREATE POLICY "Users can manage their church email quota" ON "EmailQuota"
    FOR ALL
    USING ("churchId" = (SELECT get_user_church_id()));

ALTER TABLE "EmailQuota" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 21: EmailSettings Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view church email settings" ON "EmailSettings";
DROP POLICY IF EXISTS "Admin manages email settings" ON "EmailSettings";
DROP POLICY IF EXISTS "Allow church-specific access to email settings" ON "EmailSettings";
DROP POLICY IF EXISTS "Users can view their church email settings" ON "EmailSettings";
DROP POLICY IF EXISTS "Users can select their church email settings" ON "EmailSettings";
DROP POLICY IF EXISTS "Users can manage their church email settings" ON "EmailSettings";

CREATE POLICY "Users can view their church email settings" ON "EmailSettings"
    FOR SELECT
    USING ("churchId" = (SELECT get_user_church_id()));

CREATE POLICY "Users can manage their church email settings" ON "EmailSettings"
    FOR ALL
    USING ("churchId" = (SELECT get_user_church_id()));

ALTER TABLE "EmailSettings" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 22: LandingPageConfig Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can read their own church's landing config" ON "LandingPageConfig";
DROP POLICY IF EXISTS "Users can modify their own church's landing config" ON "LandingPageConfig";
DROP POLICY IF EXISTS "Public can read landing configs" ON "LandingPageConfig";

CREATE POLICY "Users can read their own church's landing config"
    ON "LandingPageConfig"
    FOR SELECT
    USING (
        "churchId" IN (
            SELECT "id" FROM "Church"
            WHERE "clerkOrgId" = auth.jwt() ->> 'org_id'
        )
    );

CREATE POLICY "Users can modify their own church's landing config"
    ON "LandingPageConfig"
    FOR ALL
    USING (
        "churchId" IN (
            SELECT "id" FROM "Church"
            WHERE "clerkOrgId" = auth.jwt() ->> 'org_id'
        )
    );

CREATE POLICY "Public can read landing configs"
    ON "LandingPageConfig"
    FOR SELECT
    USING (true);

ALTER TABLE "LandingPageConfig" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 23: Event Table Policies (NEW)
-- =====================================================

DROP POLICY IF EXISTS "Users can view events of their church" ON "Event";
DROP POLICY IF EXISTS "Users can insert events for their church" ON "Event";
DROP POLICY IF EXISTS "Users can update events of their church" ON "Event";
DROP POLICY IF EXISTS "Users can delete events of their church" ON "Event";
DROP POLICY IF EXISTS "Public can view published events" ON "Event";

-- Authenticated users can manage their church's events
-- Note: churchId is stored as UUID text, so we cast get_user_church_id() to text
CREATE POLICY "Users can view events of their church" ON "Event"
    FOR SELECT
    USING ("churchId"::uuid = (SELECT get_user_church_id()));

CREATE POLICY "Users can insert events for their church" ON "Event"
    FOR INSERT
    WITH CHECK ("churchId"::uuid = (SELECT get_user_church_id()));

CREATE POLICY "Users can update events of their church" ON "Event"
    FOR UPDATE
    USING ("churchId"::uuid = (SELECT get_user_church_id()));

CREATE POLICY "Users can delete events of their church" ON "Event"
    FOR DELETE
    USING ("churchId"::uuid = (SELECT get_user_church_id()));

-- Public users can view published events (for landing pages)
CREATE POLICY "Public can view published events" ON "Event"
    FOR SELECT
    USING ("isPublished" = true);

ALTER TABLE "Event" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 24: Performance Indexes
-- =====================================================

-- Email-related indexes for faster campaign sending
CREATE INDEX IF NOT EXISTS idx_email_recipient_campaign_email
    ON "EmailRecipient"("campaignId", "email");

CREATE INDEX IF NOT EXISTS idx_email_preference_member
    ON "EmailPreference"("memberId");

CREATE INDEX IF NOT EXISTS idx_member_church_email
    ON "Member"("churchId", "email");

CREATE INDEX IF NOT EXISTS idx_email_campaign_church_status
    ON "EmailCampaign"("churchId", "status");

CREATE INDEX IF NOT EXISTS idx_email_quota_church
    ON "EmailQuota"("churchId");

CREATE INDEX IF NOT EXISTS idx_email_settings_church
    ON "EmailSettings"("churchId");

-- Donation table dropped - using DonationTransaction instead
-- CREATE INDEX IF NOT EXISTS idx_donation_church_date ON "Donation"("churchId", "donationDate");

-- Financial indexes
CREATE INDEX IF NOT EXISTS idx_donation_transaction_church
    ON "DonationTransaction"("churchId");

CREATE INDEX IF NOT EXISTS idx_donation_type_church
    ON "DonationType"("churchId");

-- Expense indexes
CREATE INDEX IF NOT EXISTS idx_expense_church_date
    ON "Expense"("churchId", "createdAt");

-- Member and donor indexes
CREATE INDEX IF NOT EXISTS idx_donor_church
    ON "Donor"("churchId");

-- Campaign merged into DonationType - no separate index needed
-- CREATE INDEX IF NOT EXISTS idx_campaign_church ON "Campaign"("churchId");

-- Stripe and payout indexes
CREATE INDEX IF NOT EXISTS idx_stripe_connect_church
    ON "StripeConnectAccount"("churchId");

CREATE INDEX IF NOT EXISTS idx_payout_summary_church
    ON "PayoutSummary"("churchId");

-- Event indexes (NEW) - these already exist from migration
-- CREATE INDEX IF NOT EXISTS idx_event_church
--     ON "Event"("churchId");
--
-- CREATE INDEX IF NOT EXISTS idx_event_church_date
--     ON "Event"("churchId", "eventDate");

-- =====================================================
-- STEP 25: Grant Permissions
-- =====================================================

GRANT ALL ON "EmailCampaign" TO authenticated;
GRANT ALL ON "EmailRecipient" TO authenticated;
GRANT ALL ON "EmailPreference" TO authenticated;
GRANT ALL ON "EmailQuota" TO authenticated;
GRANT ALL ON "EmailSettings" TO authenticated;
GRANT ALL ON "Event" TO authenticated;

-- Allow service role full access for system operations
GRANT ALL ON "EmailCampaign" TO service_role;
GRANT ALL ON "EmailRecipient" TO service_role;
GRANT ALL ON "EmailPreference" TO service_role;
GRANT ALL ON "EmailQuota" TO service_role;
GRANT ALL ON "EmailSettings" TO service_role;
GRANT ALL ON "Event" TO service_role;

-- Allow anon role to read published events (for public landing pages)
GRANT SELECT ON "Event" TO anon;

-- =====================================================
-- STEP 26: Analyze Tables for Query Optimization
-- =====================================================

ANALYZE "Church";
ANALYZE "Profile";
ANALYZE "Member";
ANALYZE "Donor";
ANALYZE "DonationType";
ANALYZE "DonationTransaction";
-- ANALYZE "Campaign"; -- Table no longer exists (merged into DonationType)
-- ANALYZE "Donation"; -- Table no longer exists (dropped in 20251018064500)
ANALYZE "Expense";
ANALYZE "Flow";
ANALYZE "Submission";
ANALYZE "StripeConnectAccount";
-- ANALYZE "InviteToken"; -- Table no longer exists (removed in 20250430072555)
ANALYZE "PayoutSummary";
ANALYZE "EmailCampaign";
ANALYZE "EmailRecipient";
ANALYZE "EmailPreference";
ANALYZE "EmailQuota";
ANALYZE "EmailSettings";
ANALYZE "LandingPageConfig";
ANALYZE "Event";

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify RLS is enabled on all important tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'Church', 'Profile', 'Member', 'Donor', 'DonationType',
    'DonationTransaction', 'Expense',
    'Flow', 'Submission', 'StripeConnectAccount',
    'PayoutSummary', 'EmailCampaign', 'EmailRecipient',
    'EmailPreference', 'EmailQuota', 'EmailSettings', 'LandingPageConfig',
    'Event'
  )
ORDER BY tablename;

-- Count policies per table
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies restoration complete!';
  RAISE NOTICE '✅ Event table policies configured!';
  RAISE NOTICE '✅ Performance indexes created!';
  RAISE NOTICE '✅ Helper functions configured!';
  RAISE NOTICE '✅ Run the verification queries above to confirm!';
END $$;
