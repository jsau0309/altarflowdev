-- AlterTable
ALTER TABLE "LandingPageConfig"
ADD COLUMN "customTitle" TEXT,
ADD COLUMN "titleFont" TEXT NOT NULL DEFAULT 'Modern',
ADD COLUMN "titleSize" TEXT NOT NULL DEFAULT 'Large',
ADD COLUMN "titleColor" TEXT NOT NULL DEFAULT '#1F2937';
