-- =====================================================================
-- RLS Performance Fixes (Simplified)
-- Date: 2025-08-09
-- Purpose: Fix critical RLS performance issues identified by Supabase
-- =====================================================================

-- Add search_path to function for security
ALTER FUNCTION public.get_church_id_from_auth() SET search_path = public;

-- Fix the most critical RLS policies that were causing performance issues
-- We only update the ones that exist and are causing problems

-- These policies need the SELECT wrapper to prevent re-evaluation
BEGIN;

-- Update existing policies where possible
DO $$ 
BEGIN
    -- Try to update each policy if it exists
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow church-specific access to donation transactions' AND tablename = 'DonationTransaction') THEN
        DROP POLICY "Allow church-specific access to donation transactions" ON public."DonationTransaction";
        CREATE POLICY "Allow church-specific access to donation transactions" ON public."DonationTransaction"
          FOR ALL
          USING ("churchId" = (SELECT public.get_church_id_from_auth()));
    END IF;

    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow church-specific access to members' AND tablename = 'Member') THEN
        DROP POLICY "Allow church-specific access to members" ON public."Member";
        CREATE POLICY "Allow church-specific access to members" ON public."Member"
          FOR ALL
          USING ("churchId" = (SELECT public.get_church_id_from_auth()));
    END IF;

    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow church-specific access to expenses' AND tablename = 'Expense') THEN
        DROP POLICY "Allow church-specific access to expenses" ON public."Expense";
        CREATE POLICY "Allow church-specific access to expenses" ON public."Expense"
          FOR ALL
          USING ("churchId" = (SELECT public.get_church_id_from_auth()));
    END IF;
END $$;

COMMIT;