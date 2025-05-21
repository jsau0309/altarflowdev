-- DropForeignKey
ALTER TABLE "StripeConnectAccount" DROP CONSTRAINT "StripeConnectAccount_churchId_fkey";

-- AlterTable
ALTER TABLE "StripeConnectAccount" ALTER COLUMN "churchId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "StripeConnectAccount" ADD CONSTRAINT "StripeConnectAccount_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("clerkOrgId") ON DELETE CASCADE ON UPDATE CASCADE;
