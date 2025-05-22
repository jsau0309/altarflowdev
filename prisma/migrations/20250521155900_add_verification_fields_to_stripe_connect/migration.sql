-- AlterTable
ALTER TABLE "StripeConnectAccount" ADD COLUMN     "requirementsCurrentlyDue" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "requirementsDisabledReason" TEXT,
ADD COLUMN     "requirementsEventuallyDue" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tosAcceptanceDate" TIMESTAMP(3),
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'unverified';
