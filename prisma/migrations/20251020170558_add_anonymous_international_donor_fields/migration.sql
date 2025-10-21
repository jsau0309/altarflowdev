-- AlterTable
ALTER TABLE "DonationTransaction" ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isInternational" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "donorCountry" TEXT;
