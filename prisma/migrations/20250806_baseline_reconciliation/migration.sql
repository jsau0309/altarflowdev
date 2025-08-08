-- Manual migration to baseline schema after removing fee tracking and adding payout reconciliation

-- Remove fee tracking columns from DonationTransaction (if they still exist)
ALTER TABLE "DonationTransaction" 
DROP COLUMN IF EXISTS "amountReceived",
DROP COLUMN IF EXISTS "paymentMethodDetails", 
DROP COLUMN IF EXISTS "stripeFee",
DROP COLUMN IF EXISTS "stripePayoutId";

-- Add refund tracking columns to DonationTransaction (if they don't exist)
ALTER TABLE "DonationTransaction"
ADD COLUMN IF NOT EXISTS "refundedAmount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "disputeStatus" TEXT,
ADD COLUMN IF NOT EXISTS "disputeReason" TEXT,
ADD COLUMN IF NOT EXISTS "disputedAt" TIMESTAMP(3);

-- Add indexes for refund and dispute tracking
CREATE INDEX IF NOT EXISTS "DonationTransaction_refundedAt_idx" ON "DonationTransaction"("refundedAt");
CREATE INDEX IF NOT EXISTS "DonationTransaction_disputeStatus_idx" ON "DonationTransaction"("disputeStatus");

-- CreateTable PayoutSummary for reconciliation
CREATE TABLE IF NOT EXISTS "PayoutSummary" (
    "id" TEXT NOT NULL,
    "stripePayoutId" TEXT NOT NULL,
    "churchId" UUID NOT NULL,
    "payoutDate" TIMESTAMP(3) NOT NULL,
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "grossVolume" INTEGER NOT NULL DEFAULT 0,
    "totalFees" INTEGER NOT NULL DEFAULT 0,
    "totalRefunds" INTEGER NOT NULL DEFAULT 0,
    "totalDisputes" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "failureReason" TEXT,
    "payoutSchedule" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "bankReference" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PayoutSummary_stripePayoutId_key" ON "PayoutSummary"("stripePayoutId");
CREATE INDEX IF NOT EXISTS "PayoutSummary_churchId_idx" ON "PayoutSummary"("churchId");
CREATE INDEX IF NOT EXISTS "PayoutSummary_payoutDate_idx" ON "PayoutSummary"("payoutDate");
CREATE INDEX IF NOT EXISTS "PayoutSummary_status_idx" ON "PayoutSummary"("status");
CREATE INDEX IF NOT EXISTS "PayoutSummary_churchId_payoutDate_idx" ON "PayoutSummary"("churchId", "payoutDate");

-- AddForeignKey
ALTER TABLE "PayoutSummary" ADD CONSTRAINT "PayoutSummary_churchId_fkey" 
FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;