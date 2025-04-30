/*
  Warnings:

  - You are about to drop the column `churchId` on the `Profile` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_churchId_fkey";

-- DropIndex
DROP INDEX "Profile_churchId_idx";

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "churchId";
