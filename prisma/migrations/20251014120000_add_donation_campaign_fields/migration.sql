-- Add campaign fields to DonationType
ALTER TABLE "DonationType" ADD COLUMN IF NOT EXISTS "isCampaign" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DonationType" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DonationType" ADD COLUMN IF NOT EXISTS "goalAmount" DECIMAL(10,2);
ALTER TABLE "DonationType" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "DonationType" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "DonationType" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- Ensure existing records are marked as defaults and active
UPDATE "DonationType" SET "isCampaign" = false, "isActive" = true WHERE "isCampaign" IS DISTINCT FROM false OR "isActive" IS DISTINCT FROM true;

-- Add composite index for active campaigns/types by church
CREATE INDEX IF NOT EXISTS "DonationType_churchId_isActive_isCampaign_idx"
  ON "DonationType"("churchId", "isActive", "isCampaign");
