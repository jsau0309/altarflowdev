-- AlterTable
ALTER TABLE "Church" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
ADD COLUMN IF NOT EXISTS "subscriptionEndsAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "subscriptionId" TEXT,
ADD COLUMN IF NOT EXISTS "subscriptionPlan" TEXT,
ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT NOT NULL DEFAULT 'pending_payment',
ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Church_stripeCustomerId_key" ON "Church"("stripeCustomerId");

-- CreateIndex  
CREATE UNIQUE INDEX IF NOT EXISTS "Church_subscriptionId_key" ON "Church"("subscriptionId");