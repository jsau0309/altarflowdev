-- AlterTable
ALTER TABLE "Flow" ADD COLUMN "customSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Flow_customSlug_key" ON "Flow"("customSlug");