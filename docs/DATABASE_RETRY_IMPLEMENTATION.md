# Database Retry Implementation

## Overview

This document describes the automatic database retry implementation for handling connection failures and transient errors in the AltarFlow application.

## Problem Statement

Previously, the application used Prisma 4.x's `$use()` middleware API to handle database connection errors automatically. When the codebase was upgraded to Prisma 5.x, this middleware was removed because:

1. Prisma 5.x deprecated the `$use()` middleware API
2. The middleware was replaced with optional `withRetry()` utility functions
3. However, these utility functions were **not used anywhere** in the codebase
4. This meant that all 249+ database operations across API routes and server actions lost automatic retry handling

## Solution

We implemented a **Prisma Client Extension** that automatically applies retry logic to all database operations without requiring manual wrapping.

### Implementation Components

#### 1. Retry Extension (`lib/prisma-extension-retry.ts`)

A Prisma Client Extension that:
- Intercepts all database operations across all models
- Automatically retries operations that fail due to retryable errors
- Uses exponential backoff with jitter for retry delays
- Logs retry attempts and failures for monitoring

**Retryable Error Types:**
- `P2024` - Connection pool timeout
- `P1017` - Server closed connection
- `P1001` - Database server unreachable
- `P1002` - Database server timeout
- `P2034` - Transaction conflict/deadlock
- Network errors (ECONNRESET, ETIMEDOUT, etc.)

**Retry Configuration:**
- Max retries: 3 attempts
- Base delay: 100ms
- Exponential backoff: 2.5x multiplier + random jitter

#### 2. Updated Database Client (`lib/db.ts`)

The Prisma client now:
- Imports and applies the retry extension automatically
- Extends the base Prisma client with `$extends(retryExtension)`
- Applies to ALL operations without exception

#### 3. Legacy Compatibility

The `withRetry()` and `withRetryTransaction()` utility functions are retained for:
- Backwards compatibility with any existing code that uses them
- No breaking changes for any part of the codebase
- New code should use `prisma.*` directly - retries are automatic

### Benefits

1. **Automatic Protection**: All 249+ database operations are now protected
2. **Zero Code Changes Required**: Existing code continues to work
3. **Consistent Behavior**: Every operation gets the same retry logic
4. **Better Reliability**: Handles transient connection issues gracefully
5. **Observable**: Logs all retry attempts for monitoring and debugging

## Usage

### For New Code

Simply use the Prisma client normally - retry logic is automatic:

```typescript
import { prisma } from '@/lib/db';

// This will automatically retry on connection failures
const churches = await prisma.church.findMany();

// Transactions also get automatic retries
await prisma.$transaction(async (tx) => {
  await tx.donation.create({ data: {...} });
  await tx.donationTransaction.create({ data: {...} });
});
```

### For Existing Code

No changes needed! All existing database operations now have automatic retry handling.

### Manual Retry (Legacy)

If you need custom retry logic (different max attempts, etc.), you can still use the legacy utilities:

```typescript
import { withRetry, withRetryTransaction } from '@/lib/db';

// Custom retry with different parameters
const result = await withRetry(
  async () => prisma.church.findUnique({ where: { id } }),
  maxRetries: 5,
  baseDelay: 200
);
```

## Testing

Run the verification script to confirm the implementation:

```bash
npx tsx scripts/verify-retry-implementation.ts
```

This verifies:
- ✓ Retry extension is properly defined
- ✓ Extension can be applied to Prisma client
- ✓ db.ts is correctly configured
- ✓ All critical error codes are handled

## Monitoring

Retry attempts are logged with the following information:
- Operation name (e.g., `church.findMany`)
- Attempt number
- Error code and message
- Whether max retries was exceeded

Search logs for:
- `operation: 'database.retry_attempt'` - Individual retry attempts
- `operation: 'database.max_retries_exceeded'` - Failed after all retries

## Migration Notes

### From Prisma 4.x Middleware

**Before (Prisma 4.x):**
```typescript
client.$use(connectionErrorMiddleware);
```

**After (Prisma 5.x):**
```typescript
const client = baseClient.$extends(retryExtension);
```

### Why This Approach?

1. **Prisma 5.x Compatibility**: Uses the official replacement for middleware
2. **Automatic**: No need to wrap every operation manually
3. **Type-Safe**: Maintains full Prisma type safety
4. **Scalable**: Works for all operations, including future ones

## Related Files

- `lib/prisma-extension-retry.ts` - Extension definition
- `lib/db.ts` - Client configuration with extension
- `lib/prisma-middleware.ts` - Deprecated (kept for reference only)
- `scripts/verify-retry-implementation.ts` - Verification script
- `scripts/test-db-retry.ts` - Integration test (requires DATABASE_URL)

## Troubleshooting

### Issue: Operations failing immediately without retry

**Check:**
1. Verify `lib/db.ts` imports `retryExtension`
2. Verify `prisma` is exported as `baseClient.$extends(retryExtension)`
3. Run verification script

### Issue: Custom error codes not being retried

**Solution:**
Add the error code to `isRetryableError()` in `lib/prisma-extension-retry.ts`:

```typescript
const retryableCodes = new Set([
  'P2024',
  'P1017',
  'PXXXX', // Add your code here
]);
```

## Future Improvements

1. Add circuit breaker pattern for repeated failures
2. Add metrics for retry success/failure rates
3. Make retry configuration environment-specific
4. Add health check endpoint that reports retry statistics

