# Email Campaign Performance Improvements

## Current Issues
- Sending 10 emails takes ~28 seconds
- Too many database transactions
- N+1 query problems

## Quick Wins (Can implement now):

### 1. Batch EmailPreference Creation
Instead of creating preferences one by one:
```typescript
// Current (slow)
for (const recipient of recipients) {
  await prisma.emailPreference.findUnique(...)
  await prisma.emailPreference.create(...)
}

// Better (fast)
await prisma.emailPreference.createMany({
  data: recipients.map(r => ({...})),
  skipDuplicates: true
})
```

### 2. Use Prisma Transactions Properly
```typescript
// Wrap all operations in one transaction
await prisma.$transaction(async (tx) => {
  // Update campaign
  // Create all preferences
  // Update all recipients
})
```

### 3. Enable Prisma Query Logging Only in Development
Add to your `.env`:
```
# Disable in production for better performance
DATABASE_LOG=false
```

### 4. Add Database Indexes
The following indexes would help:
```sql
CREATE INDEX idx_email_recipient_campaign_email ON "EmailRecipient"(campaignId, email);
CREATE INDEX idx_email_preference_member ON "EmailPreference"(memberId);
```

## Supabase Suggestions:

### 1. Connection Pooling
If Supabase suggested connection pooling, ensure you're using:
- Pooler endpoint for serverless functions
- Direct connection for long-running processes

### 2. Prepared Statements
The logs show "DEALLOCATE ALL" frequently, which impacts performance.

### 3. Consider Edge Functions
For email sending, consider moving to Supabase Edge Functions for better performance.

## For Testing:
Continue with your testing. The performance issue doesn't affect functionality, just user experience. We can optimize after completing the security testing.