-- Add campaign fields to DonationType
ALTER TABLE "DonationType" ADD COLUMN IF NOT EXISTS "isCampaign" BOOLEAN DEFAULT false;
ALTER TABLE "DonationType" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "DonationType" ADD COLUMN IF NOT EXISTS "goalAmount" DECIMAL(10,2);
ALTER TABLE "DonationType" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP;
ALTER TABLE "DonationType" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP DEFAULT now();
ALTER TABLE "DonationType" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER DEFAULT 0;

-- Backfill defaults for existing records
UPDATE "DonationType" SET "isCampaign" = false WHERE "isCampaign" IS NULL;
UPDATE "DonationType" SET "isActive" = true WHERE "isActive" IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "DonationType_churchId_isActive_isCampaign_idx"
  ON "DonationType"("churchId", "isActive", "isCampaign");
