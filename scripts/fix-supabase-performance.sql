-- =============================================================================
-- SUPABASE PERFORMANCE AND SECURITY FIXES
-- Generated: 2025-08-09
-- Purpose: Fix all Supabase linter warnings for security and performance
-- =============================================================================

-- =============================================================================
-- SECTION 1: SECURITY FIX - Function Search Path
-- =============================================================================

-- Fix the function search_path issue for get_church_id_from_auth
CREATE OR REPLACE FUNCTION public.get_church_id_from_auth()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  church_id TEXT;
BEGIN
  SELECT c.id INTO church_id
  FROM public."Church" c
  WHERE c."clerkOrgId" = auth.jwt() ->> 'org_id';
  
  RETURN church_id;
END;
$$;

-- =============================================================================
-- SECTION 2: RLS PERFORMANCE - Fix auth function re-evaluation
-- Replace auth.<function>() with (select auth.<function>()) in all policies
-- =============================================================================

-- Drop and recreate policies for Campaign table
DROP POLICY IF EXISTS "Allow church-specific access to campaigns" ON public."Campaign";
CREATE POLICY "Allow church-specific access to campaigns" ON public."Campaign"
  FOR ALL
  USING ("churchId" = (SELECT public.get_church_id_from_auth()));

-- Drop and recreate policies for DonationTransaction table
DROP POLICY IF EXISTS "Allow church-specific access to donation transactions" ON public."DonationTransaction";
CREATE POLICY "Allow church-specific access to donation transactions" ON public."DonationTransaction"
  FOR ALL
  USING ("churchId" = (SELECT public.get_church_id_from_auth()));

-- Drop and recreate policies for DonationType table
DROP POLICY IF EXISTS "Allow church-specific access to donation types" ON public."DonationType";
CREATE POLICY "Allow church-specific access to donation types" ON public."DonationType"
  FOR ALL
  USING ("churchId" = (SELECT public.get_church_id_from_auth()));

-- Drop and recreate policies for Donation table
DROP POLICY IF EXISTS "Allow church-specific access to donations" ON public."Donation";
CREATE POLICY "Allow church-specific access to donations" ON public."Donation"
  FOR ALL
  USING ("churchId" = (SELECT public.get_church_id_from_auth()));

-- Drop and recreate policies for Donor table
DROP POLICY IF EXISTS "Allow church-specific access to donors" ON public."Donor";
CREATE POLICY "Allow church-specific access to donors" ON public."Donor"
  FOR ALL
  USING ("churchId" = (SELECT public.get_church_id_from_auth()));

-- Drop and recreate policies for Expense table
DROP POLICY IF EXISTS "Allow church-specific access to expenses" ON public."Expense";
CREATE POLICY "Allow church-specific access to expenses" ON public."Expense"
  FOR ALL
  USING ("churchId" = (SELECT public.get_church_id_from_auth()));

-- Drop and recreate policies for Flow table
DROP POLICY IF EXISTS "Allow church-specific access to flows" ON public."Flow";
CREATE POLICY "Allow church-specific access to flows" ON public."Flow"
  FOR ALL
  USING ("churchId" = (SELECT public.get_church_id_from_auth()));

-- Drop and recreate policies for Member table
DROP POLICY IF EXISTS "Allow church-specific access to members" ON public."Member";
CREATE POLICY "Allow church-specific access to members" ON public."Member"
  FOR ALL
  USING ("churchId" = (SELECT public.get_church_id_from_auth()));

-- Drop and recreate policies for StripeConnectAccount table
DROP POLICY IF EXISTS "Allow church-specific access to stripe connect accounts" ON public."StripeConnectAccount";
CREATE POLICY "Allow church-specific access to stripe connect accounts" ON public."StripeConnectAccount"
  FOR ALL
  USING ("churchId" = (SELECT public.get_church_id_from_auth()));

-- Drop duplicate policy
DROP POLICY IF EXISTS "Allow church-specific access to stripe accounts" ON public."StripeConnectAccount";

-- Drop and recreate policies for Submission table
DROP POLICY IF EXISTS "Allow church-specific access to submissions" ON public."Submission";
CREATE POLICY "Allow church-specific access to submissions" ON public."Submission"
  FOR ALL
  USING ("flowId" IN (
    SELECT id FROM public."Flow" 
    WHERE "churchId" = (SELECT public.get_church_id_from_auth())
  ));

-- Drop and recreate policies for PayoutSummary table
DROP POLICY IF EXISTS "Allow church-specific access to payout summaries" ON public."PayoutSummary";
CREATE POLICY "Allow church-specific access to payout summaries" ON public."PayoutSummary"
  FOR ALL
  USING ("churchId" = (SELECT public.get_church_id_from_auth()));

-- Fix EmailCampaign policies
DROP POLICY IF EXISTS "Admin and staff can create campaigns" ON public."EmailCampaign";
CREATE POLICY "Admin and staff can create campaigns" ON public."EmailCampaign"
  FOR INSERT
  USING ("churchId" = (SELECT public.get_church_id_from_auth()));

DROP POLICY IF EXISTS "Admin and staff can update campaigns" ON public."EmailCampaign";
CREATE POLICY "Admin and staff can update campaigns" ON public."EmailCampaign"
  FOR UPDATE
  USING ("churchId" = (SELECT public.get_church_id_from_auth()));

DROP POLICY IF EXISTS "Admin can delete campaigns" ON public."EmailCampaign";
CREATE POLICY "Admin can delete campaigns" ON public."EmailCampaign"
  FOR DELETE
  USING ("churchId" = (SELECT public.get_church_id_from_auth()));

-- Fix Church policies
DROP POLICY IF EXISTS "Churches are viewable by organization members" ON public."Church";
CREATE POLICY "Churches are viewable by organization members" ON public."Church"
  FOR SELECT
  USING ("clerkOrgId" = (SELECT auth.jwt() ->> 'org_id'));

DROP POLICY IF EXISTS "Churches are updatable by organization members" ON public."Church";
CREATE POLICY "Churches are updatable by organization members" ON public."Church"
  FOR UPDATE
  USING ("clerkOrgId" = (SELECT auth.jwt() ->> 'org_id'));

-- Fix Profile policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public."Profile";
CREATE POLICY "Users can view their own profile" ON public."Profile"
  FOR SELECT
  USING ("clerkUserId" = (SELECT auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "Users can update their own profile" ON public."Profile";
CREATE POLICY "Users can update their own profile" ON public."Profile"
  FOR UPDATE
  USING ("clerkUserId" = (SELECT auth.jwt() ->> 'sub'));

-- Fix EmailRecipient policies
DROP POLICY IF EXISTS "Manage recipients through campaigns" ON public."EmailRecipient";
CREATE POLICY "Manage recipients through campaigns" ON public."EmailRecipient"
  FOR ALL
  USING ("campaignId" IN (
    SELECT id FROM public."EmailCampaign" 
    WHERE "churchId" = (SELECT public.get_church_id_from_auth())
  ));

DROP POLICY IF EXISTS "Users can view campaign recipients" ON public."EmailRecipient";

-- Fix EmailQuota policies - consolidate multiple policies
DROP POLICY IF EXISTS "Allow church-specific access to email quotas" ON public."EmailQuota";
DROP POLICY IF EXISTS "System manages quota" ON public."EmailQuota";
DROP POLICY IF EXISTS "Users can view church quota" ON public."EmailQuota";

-- Create single comprehensive policy for EmailQuota
CREATE POLICY "Church email quota access" ON public."EmailQuota"
  FOR ALL
  USING (
    "churchId" = (SELECT public.get_church_id_from_auth())
    OR 
    EXISTS (
      SELECT 1 FROM public."Church" c 
      WHERE c.id = "churchId" 
      AND c."clerkOrgId" = (SELECT auth.jwt() ->> 'org_id')
    )
  );

-- Fix EmailSettings policies - consolidate multiple policies
DROP POLICY IF EXISTS "Admin manages email settings" ON public."EmailSettings";
DROP POLICY IF EXISTS "Allow church-specific access to email settings" ON public."EmailSettings";
DROP POLICY IF EXISTS "Users can view church email settings" ON public."EmailSettings";

-- Create single comprehensive policy for EmailSettings
CREATE POLICY "Church email settings access" ON public."EmailSettings"
  FOR ALL
  USING ("churchId" = (SELECT public.get_church_id_from_auth()));

-- Fix EmailPreference policies - consolidate multiple policies
DROP POLICY IF EXISTS "Allow church-specific access to email preferences" ON public."EmailPreference";
DROP POLICY IF EXISTS "System creates preferences" ON public."EmailPreference";
DROP POLICY IF EXISTS "Church can view member preferences" ON public."EmailPreference";
DROP POLICY IF EXISTS "Public unsubscribe via token" ON public."EmailPreference";

-- Create consolidated policies for EmailPreference
CREATE POLICY "Church email preference management" ON public."EmailPreference"
  FOR ALL
  USING (
    "churchId" = (SELECT public.get_church_id_from_auth())
    OR
    "unsubscribeToken" IS NOT NULL
  );

-- =============================================================================
-- SECTION 3: ADD CRITICAL PERFORMANCE INDEXES
-- =============================================================================

-- Critical indexes for most common queries
CREATE INDEX IF NOT EXISTS idx_donations_church_date 
ON public."DonationTransaction"("churchId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_members_church_status 
ON public."Member"("churchId", "status");

CREATE INDEX IF NOT EXISTS idx_campaigns_church_status 
ON public."EmailCampaign"("churchId", "status");

CREATE INDEX IF NOT EXISTS idx_email_recipients_campaign 
ON public."EmailRecipient"("campaignId", "status");

CREATE INDEX IF NOT EXISTS idx_members_email 
ON public."Member"("churchId", "email");

CREATE INDEX IF NOT EXISTS idx_donations_fund 
ON public."DonationTransaction"("churchId", "donationTypeId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_church_date 
ON public."Expense"("churchId", "date" DESC);

CREATE INDEX IF NOT EXISTS idx_email_prefs_member 
ON public."EmailPreference"("memberId", "churchId");

-- =============================================================================
-- SECTION 4: DROP UNUSED INDEXES (based on Supabase analysis)
-- =============================================================================

-- Drop indexes that have never been used
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

-- =============================================================================
-- SECTION 5: ANALYZE TABLES FOR QUERY PLANNER
-- =============================================================================

ANALYZE public."Church";
ANALYZE public."DonationTransaction";
ANALYZE public."Member";
ANALYZE public."EmailCampaign";
ANALYZE public."EmailRecipient";
ANALYZE public."Expense";

-- =============================================================================
-- END OF PERFORMANCE FIXES
-- =============================================================================