-- AlterTable
ALTER TABLE "Donor" ADD COLUMN     "memberId" UUID;

-- CreateIndex
CREATE INDEX "Donor_memberId_idx" ON "Donor"("memberId");

-- AddForeignKey
ALTER TABLE "Donor" ADD CONSTRAINT "Donor_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
