-- Fix Member email unique constraint
-- This migration changes the email field from globally unique to unique per church

-- Step 1: Drop the existing unique constraint on email
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_email_key";

-- Step 2: Add a compound unique constraint on churchId and email
-- This allows different churches to have members with the same email
ALTER TABLE "Member" ADD CONSTRAINT "Member_churchId_email_key" UNIQUE ("churchId", "email");