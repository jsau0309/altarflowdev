-- Add the 'slug' column as nullable TEXT first
ALTER TABLE "Church" ADD COLUMN "slug" TEXT;

-- Populate slugs for existing churches
UPDATE "Church" SET "slug" = 'puerta-de-salvacion' WHERE "id" = '41edea6b-4e24-463c-98be-09e79925838c';
UPDATE "Church" SET "slug" = 'la-roca-eterna' WHERE "id" = 'a0037db2-2cda-4a8e-b5fa-f6d2a980fb8c';
UPDATE "Church" SET "slug" = 'acme-inc' WHERE "id" = 'd679972b-5c90-4321-b59b-22b616c01d9f';

-- After populating slugs for existing rows, make the column NOT NULL
ALTER TABLE "Church" ALTER COLUMN "slug" SET NOT NULL;

-- Add the unique constraint on the 'slug' column
CREATE UNIQUE INDEX "Church_slug_key" ON "Church"("slug");