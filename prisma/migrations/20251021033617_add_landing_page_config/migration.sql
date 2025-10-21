-- CreateEnum
CREATE TYPE "BackgroundType" AS ENUM ('PRESET', 'GRADIENT', 'SOLID', 'IMAGE');

-- CreateTable
CREATE TABLE "LandingPageConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "churchId" UUID NOT NULL,
    "logoUrl" TEXT,
    "logoPath" TEXT,
    "description" TEXT,
    "backgroundType" "BackgroundType" NOT NULL DEFAULT 'PRESET',
    "backgroundValue" TEXT,
    "socialLinks" JSON,
    "showDonateButton" BOOLEAN NOT NULL DEFAULT false,
    "showConnectButton" BOOLEAN NOT NULL DEFAULT false,
    "donateButtonText" TEXT NOT NULL DEFAULT 'Donate',
    "connectButtonText" TEXT NOT NULL DEFAULT 'Connect',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingPageConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LandingPageConfig_churchId_key" ON "LandingPageConfig"("churchId");

-- CreateIndex
CREATE INDEX "LandingPageConfig_churchId_idx" ON "LandingPageConfig"("churchId");

-- AddForeignKey
ALTER TABLE "LandingPageConfig" ADD CONSTRAINT "LandingPageConfig_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
