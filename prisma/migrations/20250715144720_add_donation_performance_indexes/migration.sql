-- CreateIndex
CREATE INDEX "DonationTransaction_churchId_transactionDate_idx" ON "DonationTransaction"("churchId", "transactionDate");

-- CreateIndex
CREATE INDEX "DonationTransaction_paymentMethodType_idx" ON "DonationTransaction"("paymentMethodType");

-- CreateIndex
CREATE INDEX "DonationTransaction_status_idx" ON "DonationTransaction"("status");
