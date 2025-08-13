# Email Campaign Retry Feature - V2 Proposal

## Problem
Currently, if an email campaign fails during sending (due to quota issues, API errors, etc.), it gets marked as FAILED and cannot be retried. Users must recreate the entire campaign from scratch.

## Proposed Solution for V2

### 1. Add Retry Capability for Failed Campaigns
- Add a "Retry Send" button for campaigns with status FAILED
- Only show this button within 24 hours of failure
- Maintain the original design and recipient list

### 2. Enhanced Status Model
```typescript
enum EmailStatus {
  DRAFT
  SCHEDULED
  SENDING
  SENT
  FAILED
  PARTIALLY_SENT  // New: Some emails sent, some failed
}
```

### 3. Better Error Tracking
```typescript
model EmailCampaign {
  // ... existing fields
  failureReason    String?     // Why it failed
  failedAt         DateTime?   // When it failed
  retryCount       Int @default(0)
  maxRetries       Int @default(3)
  successfulSends  Int @default(0)  // Track partial sends
}
```

### 4. UI Improvements
- Show detailed failure reason to users
- Display retry button with countdown (e.g., "Retry (2 attempts left)")
- For PARTIALLY_SENT: Show "X of Y emails sent successfully"
- Allow retrying only failed recipients

### 5. Implementation Steps
1. Update Prisma schema with new fields
2. Modify send endpoint to handle retries
3. Track individual recipient success/failure
4. Add retry logic that only sends to failed recipients
5. Update UI to show retry options

### 6. Additional Considerations
- Implement exponential backoff for retries
- Add webhook to notify admin of repeated failures
- Consider automatic retry for transient errors (rate limits, API timeouts)
- Log all retry attempts for debugging

### 7. Benefits
- Better user experience - no need to recreate campaigns
- Reduced support tickets for failed sends
- Ability to handle partial failures gracefully
- Clear visibility into what went wrong

## Quick Win for V1.5
As an interim solution, consider allowing campaigns in FAILED status to be "cloned" - creating a new DRAFT with the same content and settings.