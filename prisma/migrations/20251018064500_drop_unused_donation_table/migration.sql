-- Drop unused Donation table
-- This table was replaced by DonationTransaction and is no longer used in the application

-- Step 1: Verify table is empty (safety check)
DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count FROM "Donation";

  IF record_count > 0 THEN
    RAISE EXCEPTION 'Donation table has % records - cannot drop safely!', record_count;
  END IF;

  RAISE NOTICE 'Donation table is empty - safe to drop';
END $$;

-- Step 2: Drop the table
DROP TABLE IF EXISTS "Donation" CASCADE;
