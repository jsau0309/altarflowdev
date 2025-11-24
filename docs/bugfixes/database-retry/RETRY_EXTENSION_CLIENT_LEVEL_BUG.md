# Retry Extension Client-Level Operations Bug Analysis

## Issue Summary

**Priority**: P1 (High Priority)  
**Reported By**: @chatgpt-codex-connector  
**Date**: November 24, 2025

The retry logic in `lib/prisma-extension-retry.ts` only wraps model-level operations via `$allModels.$allOperations`, but does **not** cover client-level operations such as:
- `prisma.$queryRaw`
- `prisma.$queryRawUnsafe`
- `prisma.$executeRaw`
- `prisma.$executeRawUnsafe`
- `prisma.$transaction`

This means these operations can still throw connection errors (P2024, P1017, P1001, P1002, P2034) without retry protection.

## Affected Code Locations

### Current Implementation (Lines 141-159 in prisma-extension-retry.ts)

```typescript
export function createRetryExtension(options: RetryOptions = {}) {
  const config = { ...defaultOptions, ...options };
  
  return Prisma.defineExtension({
    name: 'retry-extension',
    query: {
      $allModels: {
        // ❌ Only covers model operations (User.findMany, Church.create, etc.)
        async $allOperations({ operation, model, args, query }) {
          // ... retry logic
        },
      },
    },
  });
}
```

### Known Vulnerable Call Sites

1. **`lib/db.ts:166`** - `checkDatabaseHealth()`
   ```typescript
   await prisma.$queryRaw`SELECT 1`;
   ```

2. **`app/api/health/route.ts:52`** - Health check endpoint
   ```typescript
   await prisma.$queryRaw`SELECT 1`;
   ```

3. **`app/api/health/supabase/route.ts:22`** - Supabase health check
   ```typescript
   await prisma.$queryRaw`SELECT 1`;
   ```

4. **`app/api/webhooks/stripe/health/route.ts:29`** - Stripe webhook health check
   ```typescript
   await prisma.$queryRaw`SELECT 1`;
   ```

5. **Multiple transaction operations** across the codebase:
   - `app/api/webhooks/stripe/route.ts` (lines 190, 706, 932, 997, 1092)
   - `app/api/members/[memberId]/route.ts:189`
   - `app/api/campaigns/[campaignId]/route.ts:202`
   - `lib/actions/fundraising-campaigns.actions.ts:257`

6. **Dashboard analytics queries** in `lib/actions/dashboard-optimized.actions.ts`:
   - Line 69: `$queryRaw` for donation stats
   - Line 108: `$queryRaw` for expense stats
   - Line 127: `$queryRaw` for member stats

## Impact Analysis

### Severity: HIGH

1. **Health Check Failures**: All health check endpoints are vulnerable to transient connection errors
2. **Critical Webhooks**: Stripe webhooks handling payments can fail without retry
3. **Analytics Queries**: Dashboard statistics can fail intermittently
4. **Transaction Operations**: Complex multi-step operations can fail midway

### Real-World Scenario

```
1. Supabase connection pool experiences momentary exhaustion (P2024)
2. Health check endpoint calls prisma.$queryRaw`SELECT 1`
3. Error is thrown immediately without retry
4. Health check reports system as unhealthy
5. Monitoring alerts are triggered unnecessarily
```

## Root Cause

Prisma Client Extensions with the `query` property only intercept model-level operations. Client-level methods like `$queryRaw` and `$transaction` are called directly on the Prisma client instance and bypass the query interception hooks.

### Why This Happens

From Prisma documentation:
- `query.$allModels.$allOperations` → Intercepts `prisma.user.findMany()`, `prisma.church.create()`, etc.
- Does NOT intercept `prisma.$queryRaw()`, `prisma.$transaction()`, etc.

## Solution

Implement a client-level extension using the `client` property to wrap these operations:

```typescript
export function createRetryExtension(options: RetryOptions = {}) {
  const config = { ...defaultOptions, ...options };
  
  return Prisma.defineExtension({
    name: 'retry-extension',
    query: {
      $allModels: {
        // Existing model-level retry logic
        async $allOperations({ operation, model, args, query }) {
          // ... existing code
        },
      },
    },
    // ✅ ADD THIS: Client-level operation wrapping
    client: {
      async $queryRaw(...args: any[]) {
        return executeWithRetry(
          () => (this as any).$queryRaw(...args),
          '$queryRaw',
          config
        );
      },
      async $queryRawUnsafe(...args: any[]) {
        return executeWithRetry(
          () => (this as any).$queryRawUnsafe(...args),
          '$queryRawUnsafe',
          config
        );
      },
      async $executeRaw(...args: any[]) {
        // Skip retry for execute operations (data modification)
        return (this as any).$executeRaw(...args);
      },
      async $executeRawUnsafe(...args: any[]) {
        // Skip retry for execute operations (data modification)
        return (this as any).$executeRawUnsafe(...args);
      },
      async $transaction(...args: any[]) {
        return executeWithRetry(
          () => (this as any).$transaction(...args),
          '$transaction',
          config
        );
      },
    },
  });
}
```

## Testing Strategy

1. **Unit Tests**: Test each client-level method with simulated connection failures
2. **Integration Tests**: Test health check endpoints with actual database connection issues
3. **Stress Tests**: Simulate connection pool exhaustion and verify retries occur

## References

- [Prisma Client Extensions Documentation](https://www.prisma.io/docs/orm/prisma-client/client-extensions)
- [Extending Client Operations](https://www.prisma.io/docs/orm/prisma-client/client-extensions/client)
- Related Issue: [prisma/prisma#18276](https://github.com/prisma/prisma/issues/18276)

## Action Items

- [ ] Update `lib/prisma-extension-retry.ts` to include client-level operation wrapping
- [ ] Add tests for client-level retry behavior
- [ ] Update documentation in `docs/DATABASE_RETRY_IMPLEMENTATION.md`
- [ ] Verify all health check endpoints work correctly
- [ ] Test Stripe webhook handlers under connection stress

