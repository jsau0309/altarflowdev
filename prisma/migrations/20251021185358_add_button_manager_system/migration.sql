-- AlterTable
ALTER TABLE "LandingPageConfig" ADD COLUMN     "buttonBackgroundColor" TEXT DEFAULT '#FFFFFF',
ADD COLUMN     "buttonTextColor" TEXT DEFAULT '#1F2937',
ADD COLUMN     "buttons" JSONB;

-- Comment: New button manager system allows churches to customize button colors and manage sortable buttons (preset + custom)
