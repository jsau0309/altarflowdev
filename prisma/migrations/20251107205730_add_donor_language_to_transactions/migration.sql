-- Add donorLanguage field to DonationTransaction table
ALTER TABLE "DonationTransaction" ADD COLUMN "donorLanguage" TEXT DEFAULT 'en';
