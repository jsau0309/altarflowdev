/*
  Warnings:

  - The `membershipStatus` column on the `Member` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('Visitor', 'Member', 'Inactive');

-- AlterTable
ALTER TABLE "Member" DROP COLUMN "membershipStatus",
ADD COLUMN     "membershipStatus" "MembershipStatus";
