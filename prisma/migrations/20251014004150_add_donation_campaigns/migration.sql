-- =====================================================================
-- Add Campaign Fields to DonationType
-- Date: 2025-10-14
-- Purpose: Extend DonationType model to support fundraising campaigns
-- =====================================================================

-- Add campaign fields to DonationType
ALTER TABLE "DonationType" ADD COLUMN "isCampaign" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DonationType" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DonationType" ADD COLUMN "goalAmount" DECIMAL(10,2);
ALTER TABLE "DonationType" ADD COLUMN "endDate" TIMESTAMP(3);
ALTER TABLE "DonationType" ADD COLUMN "startDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "DonationType" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- Update existing records (mark all as permanent default types, not campaigns)
UPDATE "DonationType" SET "isCampaign" = false, "isActive" = true WHERE "isCampaign" IS NULL;

-- Add index for performance
CREATE INDEX "DonationType_churchId_isActive_isCampaign_idx" ON "DonationType"("churchId", "isActive", "isCampaign");
