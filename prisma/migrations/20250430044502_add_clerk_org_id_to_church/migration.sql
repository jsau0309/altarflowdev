/*
  Warnings:

  - A unique constraint covering the columns `[clerkOrgId]` on the table `Church` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Church" ADD COLUMN     "clerkOrgId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Church_clerkOrgId_key" ON "Church"("clerkOrgId");
