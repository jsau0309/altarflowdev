-- Add new columns first
ALTER TABLE "Donor"
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT;

-- Copy data from old columns to new columns
-- Note: If there are duplicate phoneNumbers, the subsequent unique index creation on 'phone' might fail.
-- The same applies to 'email'. Prisma has warned about this.
UPDATE "Donor" SET "phone" = "phoneNumber";
UPDATE "Donor" SET "city" = "addressCity";
UPDATE "Donor" SET "state" = "addressState";
UPDATE "Donor" SET "postalCode" = "addressPostalCode";
UPDATE "Donor" SET "country" = "addressCountry";
-- "addressLine1" was already correct. "addressLine2" is new, so no data to copy.
-- "isPhoneVerified" defaults to false, will be updated by application logic later.
-- "stripeCustomerId" is new.

-- Drop the old index for phoneNumber
DROP INDEX IF EXISTS "Donor_phoneNumber_key"; -- Use IF EXISTS for safety

-- Drop old columns
ALTER TABLE "Donor"
DROP COLUMN "addressCity",
DROP COLUMN "addressCountry",
DROP COLUMN "addressPostalCode",
DROP COLUMN "addressState",
DROP COLUMN "phoneNumber";

-- Create new unique indexes
-- If there are duplicate values in 'email' or 'phone' columns after copying, these will fail.
CREATE UNIQUE INDEX "Donor_email_key" ON "Donor"("email");
CREATE UNIQUE INDEX "Donor_phone_key" ON "Donor"("phone");