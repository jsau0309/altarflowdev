-- Remove color field from DonationType (if it was added)
ALTER TABLE "DonationType" DROP COLUMN IF EXISTS "color";

-- Create DonationPaymentMethod table
CREATE TABLE "DonationPaymentMethod" (
    "id" TEXT NOT NULL,
    "churchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#10B981',
    "isSystemMethod" BOOLEAN NOT NULL DEFAULT false,
    "isDeletable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- Add paymentMethodId to DonationTransaction
ALTER TABLE "DonationTransaction" ADD COLUMN "paymentMethodId" TEXT;

-- Create indexes for DonationPaymentMethod
CREATE UNIQUE INDEX "DonationPaymentMethod_churchId_name_key" ON "DonationPaymentMethod"("churchId", "name");
CREATE INDEX "DonationPaymentMethod_churchId_idx" ON "DonationPaymentMethod"("churchId");

-- Create index for paymentMethodId in DonationTransaction
CREATE INDEX "DonationTransaction_paymentMethodId_idx" ON "DonationTransaction"("paymentMethodId");

-- Add foreign key constraints
ALTER TABLE "DonationPaymentMethod" ADD CONSTRAINT "DonationPaymentMethod_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DonationTransaction" ADD CONSTRAINT "DonationTransaction_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "DonationPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
