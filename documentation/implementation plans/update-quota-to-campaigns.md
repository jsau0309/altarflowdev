# Quota System Update Plan

## Current State
- EmailQuota model tracks `emailsSent` (individual emails)
- quotaLimit is set to 4 (which was meant for campaigns)

## Changes Needed

### 1. Database Schema Update
```prisma
model EmailQuota {
  id              String    @id @default(cuid())
  churchId        String    @db.Uuid @unique
  monthYear       String    // Format: "2025-01"
  campaignsSent   Int       @default(0)  // Changed from emailsSent
  quotaLimit      Int       @default(9999) // Unlimited for beta
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  church          Church    @relation(fields: [churchId], references: [id], onDelete: Cascade)
  
  @@unique([churchId, monthYear])
  @@index([churchId])
}
```

### 2. API Updates Required
- /api/communication/quota/route.ts - Update to use campaignsSent
- /api/communication/campaigns/[id]/send/route.ts - Increment campaign count instead of email count
- Campaign list UI - Update to show "X/Y campaigns" instead of emails

### 3. Migration Steps
1. Add new field `campaignsSent` 
2. Update existing records to set campaignsSent based on actual campaigns sent
3. Remove `emailsSent` field
4. Update all API endpoints