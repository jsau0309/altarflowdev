-- AlterTable
ALTER TABLE "StripeConnectAccount" ADD COLUMN     "paymentDomainsRegistered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentDomainsRegisteredAt" TIMESTAMP(3),
ADD COLUMN     "registeredDomains" TEXT[] DEFAULT ARRAY[]::TEXT[];