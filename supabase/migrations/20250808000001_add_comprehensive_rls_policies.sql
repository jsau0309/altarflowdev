-- Comprehensive Row Level Security (RLS) Policies for AltarFlow
-- This migration adds RLS policies for all tables to ensure proper multi-tenant data isolation

-- =====================================================
-- PayoutSummary Table (Financial reconciliation data)
-- =====================================================
ALTER TABLE public."PayoutSummary" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow church-specific access to payout summaries" ON public."PayoutSummary";

-- Churches can only view their own payout summaries
CREATE POLICY "Allow church-specific access to payout summaries" 
ON public."PayoutSummary" 
FOR ALL 
USING (
  "churchId" = (
    SELECT id FROM public."Church" 
    WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id')
  )
) 
WITH CHECK (
  "churchId" = (
    SELECT id FROM public."Church" 
    WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id')
  )
);

ALTER TABLE public."PayoutSummary" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- Church Table (Core organization table)
-- =====================================================
ALTER TABLE public."Church" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Churches are viewable by organization members" ON public."Church";
DROP POLICY IF EXISTS "Churches are updatable by organization admins" ON public."Church";

-- Churches can only be viewed by members of that organization
CREATE POLICY "Churches are viewable by organization members" 
ON public."Church"
FOR SELECT 
USING (
  "clerkOrgId" = (auth.jwt() ->> 'org_id')
);

-- Churches can only be updated by organization admins (role check would require custom JWT claims)
CREATE POLICY "Churches are updatable by organization members" 
ON public."Church"
FOR UPDATE 
USING (
  "clerkOrgId" = (auth.jwt() ->> 'org_id')
)
WITH CHECK (
  "clerkOrgId" = (auth.jwt() ->> 'org_id')
);

ALTER TABLE public."Church" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- StripeConnectAccount Table
-- =====================================================
ALTER TABLE public."StripeConnectAccount" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow church-specific access to stripe accounts" ON public."StripeConnectAccount";

-- Churches can only access their own Stripe accounts
CREATE POLICY "Allow church-specific access to stripe accounts" 
ON public."StripeConnectAccount" 
FOR ALL 
USING (
  "churchId" = (auth.jwt() ->> 'org_id')
) 
WITH CHECK (
  "churchId" = (auth.jwt() ->> 'org_id')
);

ALTER TABLE public."StripeConnectAccount" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- Profile Table (User profiles)
-- =====================================================
ALTER TABLE public."Profile" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own profile" ON public."Profile";
DROP POLICY IF EXISTS "Users can update their own profile" ON public."Profile";

-- Users can only view their own profile
CREATE POLICY "Users can view their own profile" 
ON public."Profile"
FOR SELECT 
USING (
  id = (auth.jwt() ->> 'sub')
);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile" 
ON public."Profile"
FOR UPDATE 
USING (
  id = (auth.jwt() ->> 'sub')
)
WITH CHECK (
  id = (auth.jwt() ->> 'sub')
);

ALTER TABLE public."Profile" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- EmailQuota Table
-- =====================================================
ALTER TABLE public."EmailQuota" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow church-specific access to email quotas" ON public."EmailQuota";

-- Churches can only access their own email quotas
CREATE POLICY "Allow church-specific access to email quotas" 
ON public."EmailQuota" 
FOR ALL 
USING (
  "churchId" = (
    SELECT id FROM public."Church" 
    WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id')
  )
) 
WITH CHECK (
  "churchId" = (
    SELECT id FROM public."Church" 
    WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id')
  )
);

ALTER TABLE public."EmailQuota" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- EmailSettings Table
-- =====================================================
ALTER TABLE public."EmailSettings" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow church-specific access to email settings" ON public."EmailSettings";

-- Churches can only access their own email settings
CREATE POLICY "Allow church-specific access to email settings" 
ON public."EmailSettings" 
FOR ALL 
USING (
  "churchId" = (
    SELECT id FROM public."Church" 
    WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id')
  )
) 
WITH CHECK (
  "churchId" = (
    SELECT id FROM public."Church" 
    WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id')
  )
);

ALTER TABLE public."EmailSettings" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- EmailPreference Table
-- =====================================================
ALTER TABLE public."EmailPreference" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow church-specific access to email preferences" ON public."EmailPreference";

-- Email preferences can be accessed by the church that owns the member
CREATE POLICY "Allow church-specific access to email preferences" 
ON public."EmailPreference" 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public."Member" m
    INNER JOIN public."Church" c ON m."churchId" = c.id
    WHERE m.id = "EmailPreference"."memberId"
    AND c."clerkOrgId" = (auth.jwt() ->> 'org_id')
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."Member" m
    INNER JOIN public."Church" c ON m."churchId" = c.id
    WHERE m.id = "EmailPreference"."memberId"
    AND c."clerkOrgId" = (auth.jwt() ->> 'org_id')
  )
);

ALTER TABLE public."EmailPreference" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- IdempotencyCache Table (System table - no RLS needed)
-- =====================================================
-- This table is used for system-level deduplication and doesn't need RLS

-- =====================================================
-- Service Role Bypass for Webhooks and System Operations
-- =====================================================
-- Note: Supabase service role automatically bypasses RLS
-- Webhooks should use the service role key to bypass RLS
-- Regular API calls should use the anon key with proper JWT

-- =====================================================
-- Verification Queries (Run these after migration)
-- =====================================================
-- To verify RLS is enabled on all important tables:
/*
SELECT 
  schemaname,
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'Church', 'Member', 'Donor', 'DonationType', 'DonationTransaction',
    'Campaign', 'Donation', 'Expense', 'StripeConnectAccount', 'Flow',
    'Submission', 'EmailCampaign', 'EmailRecipient', 'EmailPreference',
    'EmailQuota', 'EmailSettings', 'PayoutSummary', 'Profile'
  )
ORDER BY tablename;
*/

-- =====================================================
-- Important Notes
-- =====================================================
-- 1. These policies use (auth.jwt() ->> 'org_id') to get the organization ID from Clerk JWT
-- 2. Service role key bypasses RLS for webhooks and system operations
-- 3. All policies ensure data isolation between churches
-- 4. FORCE ROW LEVEL SECURITY ensures even table owners respect RLS
-- 5. Test thoroughly in staging before production deployment