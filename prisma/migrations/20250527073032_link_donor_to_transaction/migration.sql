-- AlterTable
ALTER TABLE "DonationTransaction" ADD COLUMN     "donorId" TEXT;

-- CreateIndex
CREATE INDEX "DonationTransaction_donorId_idx" ON "DonationTransaction"("donorId");

-- AddForeignKey
ALTER TABLE "DonationTransaction" ADD CONSTRAINT "DonationTransaction_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
