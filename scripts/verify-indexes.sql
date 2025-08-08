-- Verify that all Stripe performance indexes exist
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_donor_church_phone',
    'idx_stripe_connect_church',
    'idx_donation_transaction_stripe',
    'idx_donor_church_email',
    'idx_donation_transaction_idempotency'
)
ORDER BY tablename, indexname;