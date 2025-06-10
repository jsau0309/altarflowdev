/*
  Warnings:

  - You are about to drop the column `ministryInvolvement` on the `Member` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Member" DROP COLUMN "ministryInvolvement",
ADD COLUMN     "life_stage" TEXT,
ADD COLUMN     "ministry_interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "preferred_service_times" TEXT[] DEFAULT ARRAY[]::TEXT[];
