-- Migration: Add platform fee tracking + Remove unused fields
-- Date: 2025-11-04
-- Issue: ALT-64
-- Purpose:
--   1. Add platformFeeAmount to track 1% platform fee revenue
--   2. Remove 5 unused fields (donorClerkId + 4 abandoned fee tracking fields)

-- Remove 5 unused fields (schema cleanup)
ALTER TABLE "DonationTransaction"
  DROP COLUMN IF EXISTS "donorClerkId",
  DROP COLUMN IF EXISTS "amountReceived",
  DROP COLUMN IF EXISTS "paymentMethodDetails",
  DROP COLUMN IF EXISTS "stripeFee",
  DROP COLUMN IF EXISTS "stripePayoutId";

-- Add platform fee tracking
ALTER TABLE "DonationTransaction"
  ADD COLUMN "platformFeeAmount" INTEGER DEFAULT 0;
