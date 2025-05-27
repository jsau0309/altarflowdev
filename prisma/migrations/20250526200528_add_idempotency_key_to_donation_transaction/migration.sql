/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `DonationTransaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DonationTransaction" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DonationTransaction_idempotencyKey_key" ON "DonationTransaction"("idempotencyKey");
