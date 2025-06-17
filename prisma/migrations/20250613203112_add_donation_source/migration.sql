-- AlterTable
ALTER TABLE "DonationTransaction" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'stripe';
