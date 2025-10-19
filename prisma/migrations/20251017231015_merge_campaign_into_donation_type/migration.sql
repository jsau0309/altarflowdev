-- =========================================
-- Migration: Merge Campaign into DonationType
-- =========================================

-- Step 1: Add campaign fields to DonationType (if not already added)
DO $$
BEGIN
  -- Add isCampaign column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'DonationType' AND column_name = 'isCampaign'
  ) THEN
    ALTER TABLE "DonationType" ADD COLUMN "isCampaign" BOOLEAN DEFAULT false NOT NULL;
  END IF;

  -- Add goalAmount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'DonationType' AND column_name = 'goalAmount'
  ) THEN
    ALTER TABLE "DonationType" ADD COLUMN "goalAmount" DECIMAL(10,2);
  END IF;

  -- Add startDate column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'DonationType' AND column_name = 'startDate'
  ) THEN
    ALTER TABLE "DonationType" ADD COLUMN "startDate" TIMESTAMP(3);
  END IF;

  -- Add endDate column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'DonationType' AND column_name = 'endDate'
  ) THEN
    ALTER TABLE "DonationType" ADD COLUMN "endDate" TIMESTAMP(3);
  END IF;

  -- Add isActive column (or update default if exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'DonationType' AND column_name = 'isActive'
  ) THEN
    ALTER TABLE "DonationType" ADD COLUMN "isActive" BOOLEAN DEFAULT true NOT NULL;
  END IF;

  -- Add isSystemType column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'DonationType' AND column_name = 'isSystemType'
  ) THEN
    ALTER TABLE "DonationType" ADD COLUMN "isSystemType" BOOLEAN DEFAULT false NOT NULL;
  END IF;

  -- Add isDeletable column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'DonationType' AND column_name = 'isDeletable'
  ) THEN
    ALTER TABLE "DonationType" ADD COLUMN "isDeletable" BOOLEAN DEFAULT true NOT NULL;
  END IF;
END $$;

-- Step 2: Add index for campaign queries
CREATE INDEX IF NOT EXISTS "DonationType_churchId_isCampaign_idx"
ON "DonationType"("churchId", "isCampaign");

-- Step 3: Check for name collisions (should be zero)
DO $$
DECLARE collision_count INT;
BEGIN
  SELECT COUNT(*) INTO collision_count
  FROM "Campaign" c
  INNER JOIN "DonationType" dt
    ON c."churchId" = dt."churchId"
    AND LOWER(TRIM(c."name")) = LOWER(TRIM(dt."name"));

  IF collision_count > 0 THEN
    RAISE EXCEPTION 'Name collision detected: % conflicts found between Campaign and DonationType', collision_count;
  END IF;

  RAISE NOTICE 'Pre-flight check passed: No name collisions found';
END $$;

-- Step 4: Migrate Campaign data to DonationType
DO $$
DECLARE
  campaign_count INT;
  migrated_count INT;
BEGIN
  -- Count existing campaigns
  SELECT COUNT(*) INTO campaign_count FROM "Campaign";

  IF campaign_count > 0 THEN
    RAISE NOTICE 'Migrating % campaign(s) to DonationType table...', campaign_count;

    -- Insert campaigns as donation types
    INSERT INTO "DonationType" (
      "id",
      "churchId",
      "name",
      "description",
      "isRecurringAllowed",
      "isCampaign",
      "goalAmount",
      "startDate",
      "endDate",
      "isActive",
      "isSystemType",
      "isDeletable",
      "createdAt",
      "updatedAt"
    )
    SELECT
      c."id",
      c."churchId",
      c."name",
      c."description",
      false,  -- campaigns don't allow recurring
      true,   -- isCampaign = true
      c."goalAmount",
      c."startDate",
      c."endDate",
      COALESCE(c."isActive", true),  -- Use existing value or default to true
      false,  -- not a system type
      true,   -- campaigns are deletable
      c."createdAt",
      c."updatedAt"
    FROM "Campaign" c
    ON CONFLICT ("id") DO NOTHING;  -- Skip if already migrated

    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE 'Migrated % campaign(s) successfully', migrated_count;
  ELSE
    RAISE NOTICE 'No campaigns to migrate';
  END IF;
END $$;

-- Step 5: Update DonationTransaction references
DO $$
DECLARE updated_count INT;
BEGIN
  UPDATE "DonationTransaction" dt
  SET "donationTypeId" = dt."campaignId"
  WHERE dt."campaignId" IS NOT NULL
    AND dt."donationTypeId" IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count > 0 THEN
    RAISE NOTICE 'Updated % transaction(s) to reference migrated campaigns', updated_count;
  ELSE
    RAISE NOTICE 'No transactions to update';
  END IF;
END $$;

-- Step 6: Verify no orphaned references
DO $$
DECLARE orphaned_count INT;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM "DonationTransaction"
  WHERE "campaignId" IS NOT NULL
    AND "donationTypeId" IS NULL;

  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Migration verification failed: % orphaned transactions found', orphaned_count;
  END IF;

  RAISE NOTICE 'Verification passed: No orphaned transactions';
END $$;

-- Step 7: Backfill existing Tithe/Offering with system type flags
UPDATE "DonationType"
SET
  "isSystemType" = true,
  "isDeletable" = false,
  "isCampaign" = false,
  "isActive" = true
WHERE LOWER(TRIM("name")) IN (
  'tithe', 'tithes', 'offering', 'offerings',
  'diezmo', 'diezmos', 'ofrenda', 'ofrendas'
);

-- Step 8: Drop campaignId column from DonationTransaction
DO $$
BEGIN
  -- Drop foreign key constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'DonationTransaction_campaignId_fkey'
  ) THEN
    ALTER TABLE "DonationTransaction" DROP CONSTRAINT "DonationTransaction_campaignId_fkey";
    RAISE NOTICE 'Dropped foreign key constraint DonationTransaction_campaignId_fkey';
  END IF;

  -- Drop index
  DROP INDEX IF EXISTS "DonationTransaction_campaignId_idx";
  RAISE NOTICE 'Dropped index DonationTransaction_campaignId_idx';

  -- Drop column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'DonationTransaction' AND column_name = 'campaignId'
  ) THEN
    ALTER TABLE "DonationTransaction" DROP COLUMN "campaignId";
    RAISE NOTICE 'Dropped campaignId column from DonationTransaction';
  END IF;
END $$;

-- Step 9: Drop Campaign table
DROP TABLE IF EXISTS "Campaign" CASCADE;

-- Step 10: Add CHECK constraint for recurring enforcement (optional but recommended)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'campaign_no_recurring'
  ) THEN
    ALTER TABLE "DonationType"
    ADD CONSTRAINT "campaign_no_recurring"
    CHECK ("isCampaign" = false OR "isRecurringAllowed" = false);
    RAISE NOTICE 'Added CHECK constraint: campaign_no_recurring';
  END IF;
END $$;

-- Migration completed successfully
