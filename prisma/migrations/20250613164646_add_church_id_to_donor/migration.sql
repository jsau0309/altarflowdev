-- AlterTable
ALTER TABLE "Donor" ADD COLUMN     "churchId" UUID;

-- CreateIndex
CREATE INDEX "Donor_churchId_idx" ON "Donor"("churchId");

-- AddForeignKey
ALTER TABLE "Donor" ADD CONSTRAINT "Donor_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE SET NULL ON UPDATE CASCADE;
