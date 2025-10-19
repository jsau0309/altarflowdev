-- Migration: Remove Donation model from Prisma schema
-- This migration syncs the schema with the database state after the Donation table was dropped
-- The Donation table was already dropped in migration 20251018064500_drop_unused_donation_table
-- This migration just removes the model definition from schema.prisma to eliminate drift

-- No SQL changes needed - table was already dropped
