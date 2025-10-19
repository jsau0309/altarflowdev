-- Add optional campaignId to DonationTransaction and link to Campaign
ALTER TABLE "DonationTransaction"
ADD COLUMN "campaignId" UUID;

-- Index for faster lookups by campaign
CREATE INDEX IF NOT EXISTS "DonationTransaction_campaignId_idx" ON "DonationTransaction"("campaignId");

-- Foreign key to Campaign, set NULL on delete, cascade updates
ALTER TABLE "DonationTransaction"
ADD CONSTRAINT "DonationTransaction_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
