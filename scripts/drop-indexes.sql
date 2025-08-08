-- Drop the manually created indexes so we can add them via migration
DROP INDEX IF EXISTS "idx_donor_church_phone";
DROP INDEX IF EXISTS "idx_stripe_connect_church";
DROP INDEX IF EXISTS "idx_donation_transaction_stripe";
DROP INDEX IF EXISTS "idx_donor_church_email";
DROP INDEX IF EXISTS "idx_donation_transaction_idempotency";