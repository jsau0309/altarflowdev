-- Add performance indexes for Stripe Connect integration
-- These indexes are critical for donation flow performance

-- Index for finding donors by phone within a church
-- Used during OTP verification to quickly check if donor exists
CREATE INDEX IF NOT EXISTS "idx_donor_church_phone" 
ON "Donor"("churchId", "phone");

-- Index for finding Stripe Connect account by church
-- Used during donation initiation to get church's payment account
CREATE INDEX IF NOT EXISTS "idx_stripe_connect_church" 
ON "StripeConnectAccount"("churchId");

-- Index for finding donation transactions by Stripe Payment Intent ID
-- Used by webhook handler to quickly update transaction status
CREATE INDEX IF NOT EXISTS "idx_donation_transaction_stripe" 
ON "DonationTransaction"("stripePaymentIntentId");

-- Additional index for donor email lookups within a church
-- Used when checking for existing donors by email
CREATE INDEX IF NOT EXISTS "idx_donor_church_email"
ON "Donor"("churchId", "email");

-- Index for finding donation transactions by idempotency key
-- Prevents duplicate donations
CREATE INDEX IF NOT EXISTS "idx_donation_transaction_idempotency"
ON "DonationTransaction"("idempotencyKey");