-- AlterTable
ALTER TABLE "DonationTransaction" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "editHistory" JSONB,
ADD COLUMN     "editReason" TEXT,
ADD COLUMN     "lastEditedAt" TIMESTAMP(3),
ADD COLUMN     "lastEditedBy" TEXT,
ADD COLUMN     "originalAmount" INTEGER;
