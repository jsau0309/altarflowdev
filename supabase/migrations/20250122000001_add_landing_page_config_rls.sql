-- Migration: Add RLS policies for LandingPageConfig table
-- Date: 2025-01-22
-- Purpose: Secure landing page configuration data with proper Row Level Security

-- Enable RLS on LandingPageConfig table
ALTER TABLE "LandingPageConfig" ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read their own church's landing config
-- This ensures users can only see landing configs for churches they belong to
CREATE POLICY "Users can read their own church's landing config"
ON "LandingPageConfig"
FOR SELECT
USING (
  "churchId" IN (
    SELECT "id" FROM "Church"
    WHERE "clerkOrgId" = auth.jwt() ->> 'org_id'
  )
);

-- Policy: Allow authenticated users to modify their own church's landing config
-- This includes INSERT, UPDATE, and DELETE operations
CREATE POLICY "Users can modify their own church's landing config"
ON "LandingPageConfig"
FOR ALL
USING (
  "churchId" IN (
    SELECT "id" FROM "Church"
    WHERE "clerkOrgId" = auth.jwt() ->> 'org_id'
  )
);

-- Policy: Allow public read access for landing pages
-- This is required for the public landing page routes to work
-- Public users can read any church's landing config to display the page
CREATE POLICY "Public can read landing configs"
ON "LandingPageConfig"
FOR SELECT
USING (true);

-- Note: The public read policy is safe because:
-- 1. Landing pages are meant to be publicly accessible (like a church website)
-- 2. Only SELECT is allowed - public users cannot modify data
-- 3. Sensitive data (like internal settings) should not be stored in this table
-- 4. Authenticated modification is still protected by the "Users can modify" policy
