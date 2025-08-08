-- DropIndex
DROP INDEX "idx_donation_transaction_idempotency";

-- DropIndex
DROP INDEX "idx_donor_church_email";

-- DropIndex
DROP INDEX "idx_donor_church_phone";

-- AlterTable
ALTER TABLE "DonationTransaction" ADD COLUMN     "amountReceived" INTEGER,
ADD COLUMN     "paymentMethodDetails" JSONB,
ADD COLUMN     "stripeFee" INTEGER,
ADD COLUMN     "stripePayoutId" TEXT;
