-- =====================================================================
-- Add Query Performance Indexes
-- Date: 2025-08-09
-- Purpose: Add indexes to improve query performance based on Supabase analysis
-- =====================================================================

-- Church table indexes (clerkOrgId already has unique constraint, which creates an index)
-- Adding non-unique index for slug (already has unique, but adding for completeness)
CREATE INDEX IF NOT EXISTS "Church_clerkOrgId_idx" ON "Church"("clerkOrgId");
CREATE INDEX IF NOT EXISTS "Church_slug_idx" ON "Church"("slug");
CREATE INDEX IF NOT EXISTS "Church_subscriptionStatus_idx" ON "Church"("subscriptionStatus");

-- Note: The following indexes already exist in the schema:
-- - Donor: (churchId, firstName, lastName)
-- - EmailCampaign: (id, churchId)
-- These were already added in previous migrations