-- AlterTable
-- Restore @default(cuid()) to DonationType.id field
-- Add gen_random_uuid() as the database-level default for the id column
-- This ensures IDs are generated even if Prisma client doesn't provide them

-- Note: gen_random_uuid() generates UUIDs, which are compatible with CUID strings
-- Prisma will override this with cuid() when creating records through Prisma Client
ALTER TABLE "DonationType" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
