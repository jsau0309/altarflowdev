-- Query Performance Optimization Indexes
-- This script adds critical indexes to improve query performance

-- Index on Church.clerkOrgId (already exists as unique, but ensuring it's optimal)
-- Church table queries by clerkOrgId are very frequent

-- Index on Church.slug (already exists as unique, but ensuring it's optimal) 
-- Church queries by slug are frequent for public pages

-- Compound index on Donor table for name searches with church filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Donor_churchId_firstName_lastName_idx" 
ON "Donor"("churchId", "firstName", "lastName");

-- Index on Donor table for recent donors query (churchId + creation time)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Donor_churchId_createdAt_idx" 
ON "Donor"("churchId", "createdAt");

-- Compound index on EmailCampaign for ID + churchId queries (improves campaign detail fetches)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "EmailCampaign_id_churchId_idx" 
ON "EmailCampaign"("id", "churchId");

-- Index on DonationTransaction status for filtering successful transactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS "DonationTransaction_status_idx" 
ON "DonationTransaction"("status");

-- Additional compound indexes for common dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "DonationTransaction_churchId_status_transactionDate_idx" 
ON "DonationTransaction"("churchId", "status", "transactionDate");

-- Index for Member queries with join date filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Member_churchId_joinDate_membershipStatus_idx" 
ON "Member"("churchId", "joinDate", "membershipStatus");