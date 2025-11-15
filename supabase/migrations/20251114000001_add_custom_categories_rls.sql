-- =====================================================================
-- Add RLS Policies for Custom Categories Tables
-- Date: 2025-11-14
-- Purpose: Enable RLS for DonationPaymentMethod, ExpenseCategory, Event
-- Pattern: Matches existing RLS using auth.jwt() ->> 'org_id' from Clerk
-- =====================================================================

-- =====================================================
-- DonationPaymentMethod Table
-- =====================================================
ALTER TABLE public."DonationPaymentMethod" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow church-specific access to donation payment methods" ON public."DonationPaymentMethod";

-- Churches can only view/modify their own payment methods
CREATE POLICY "Allow church-specific access to donation payment methods"
ON public."DonationPaymentMethod"
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

ALTER TABLE public."DonationPaymentMethod" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- ExpenseCategory Table
-- =====================================================
ALTER TABLE public."ExpenseCategory" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow church-specific access to expense categories" ON public."ExpenseCategory";

-- Churches can only view/modify their own expense categories
CREATE POLICY "Allow church-specific access to expense categories"
ON public."ExpenseCategory"
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

ALTER TABLE public."ExpenseCategory" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- Event Table
-- =====================================================
ALTER TABLE public."Event" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow church-specific access to events" ON public."Event";

-- Churches can only view/modify their own events
CREATE POLICY "Allow church-specific access to events"
ON public."Event"
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

ALTER TABLE public."Event" FORCE ROW LEVEL SECURITY;

-- =====================================================================
-- Summary
-- =====================================================================
-- This migration:
-- ✅ Enables RLS on 3 tables (DonationPaymentMethod, ExpenseCategory, Event)
-- ✅ Uses Clerk JWT pattern: auth.jwt() ->> 'org_id'
-- ✅ Enforces church isolation at database level
-- ✅ Uses FORCE ROW LEVEL SECURITY for additional protection
-- ✅ Single policy per table (FOR ALL) for simplicity and performance
--
-- Security model:
-- - Users can only access data for their Clerk organization (orgId)
-- - Database-level enforcement prevents cross-tenant data leakage
-- - Application layer still enforces role-based permissions (ADMIN/STAFF)
-- - Application layer still enforces isDeletable checks
--
-- Pattern matches:
-- - supabase/migrations/20250808000001_add_comprehensive_rls_policies.sql
-- - Uses same Clerk JWT authentication approach
-- =====================================================================
