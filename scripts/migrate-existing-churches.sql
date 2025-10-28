-- Migration Script: Update Existing Churches for New Pricing Model
-- Date: 2025-10-28
-- Purpose: Grandfather existing churches without disrupting their current status

-- IMPORTANT: Run this ONLY ONCE on each database (dev, then production)

BEGIN;

-- Step 1: Update all existing churches with setupFeePaid = true
-- (This prevents them from being forced into trial mode)
UPDATE "Church"
SET
  "setupFeePaid" = true,
  "setupFeeAmount" = 15000,  -- $150 in cents (historical setup fee)
  "setupFeePaidAt" = "createdAt"  -- Use creation date as payment date
WHERE
  "setupFeePaid" = false
  AND id NOT IN (
    -- Exclude the new church that's already on trial
    '0e29ac6e-ec6f-4ff8-8faa-602541f47f1a'
  );

-- Step 2: OPTIONAL - Give free churches a 30-day trial
-- (Only if you want to give existing free churches the trial benefit)
UPDATE "Church"
SET
  "freeTrialStartedAt" = NOW(),
  "trialEndsAt" = NOW() + INTERVAL '30 days',
  "subscriptionStatus" = 'trial'
WHERE
  "subscriptionStatus" = 'free'
  AND "setupFeePaid" = true  -- Just updated above
  AND "freeTrialStartedAt" IS NULL
  AND id NOT IN (
    -- Exclude the new church
    '0e29ac6e-ec6f-4ff8-8faa-602541f47f1a'
  );

-- Step 3: Verify the changes
SELECT
  id,
  name,
  "subscriptionStatus",
  "setupFeePaid",
  "setupFeeAmount",
  "freeTrialStartedAt",
  "trialEndsAt",
  "createdAt"
FROM "Church"
ORDER BY "createdAt" DESC;

COMMIT;

-- Expected Results:
-- 1. Centro Cristiano Restauracion - No change (already on trial with subscription)
-- 2. Iglesia Puerta de Salvacion - setupFeePaid=true, status stays 'active'
-- 3. Puerta de Salvación GP - setupFeePaid=true, status stays 'active'
-- 4. Miami Church - setupFeePaid=true, status changes to 'trial' (gets 30 days free)
-- 5. Altarflow Church [Demo] - setupFeePaid=true, status stays 'active'
