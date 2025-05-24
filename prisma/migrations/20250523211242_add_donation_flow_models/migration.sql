-- CreateTable
CREATE TABLE "DonationType" (
    "id" TEXT NOT NULL,
    "churchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isRecurringAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationTransaction" (
    "id" TEXT NOT NULL,
    "churchId" UUID NOT NULL,
    "donationTypeId" TEXT NOT NULL,
    "donorClerkId" TEXT,
    "donorName" TEXT,
    "donorEmail" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paymentMethodType" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "stripePaymentIntentId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "DonationTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DonationType_churchId_idx" ON "DonationType"("churchId");

-- CreateIndex
CREATE UNIQUE INDEX "DonationType_churchId_name_key" ON "DonationType"("churchId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "DonationTransaction_stripePaymentIntentId_key" ON "DonationTransaction"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "DonationTransaction_stripeSubscriptionId_key" ON "DonationTransaction"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "DonationTransaction_churchId_idx" ON "DonationTransaction"("churchId");

-- CreateIndex
CREATE INDEX "DonationTransaction_donationTypeId_idx" ON "DonationTransaction"("donationTypeId");

-- CreateIndex
CREATE INDEX "DonationTransaction_donorClerkId_idx" ON "DonationTransaction"("donorClerkId");

-- CreateIndex
CREATE INDEX "DonationTransaction_stripePaymentIntentId_idx" ON "DonationTransaction"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "DonationTransaction_stripeSubscriptionId_idx" ON "DonationTransaction"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "DonationType" ADD CONSTRAINT "DonationType_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationTransaction" ADD CONSTRAINT "DonationTransaction_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationTransaction" ADD CONSTRAINT "DonationTransaction_donationTypeId_fkey" FOREIGN KEY ("donationTypeId") REFERENCES "DonationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
