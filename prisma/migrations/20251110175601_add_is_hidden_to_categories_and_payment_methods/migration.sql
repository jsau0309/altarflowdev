-- AlterTable
ALTER TABLE "DonationPaymentMethod" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ExpenseCategory" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;
