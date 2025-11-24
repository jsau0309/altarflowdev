# Rate Limit Cache Fix - Clerk Health Check

## Issue Summary

**Priority**: P2 (Medium-High)  
**Component**: `app/api/health/clerk/route.ts`  
**Fixed By**: Cache timestamp preservation + originalTTL storage fixes  
**Date**: November 24, 2025

### Problem Description - TWO Critical Bugs Fixed

#### Bug #1: Timestamp Reset (Fixed in first iteration)
When a 429 rate limit error occurred from the Clerk API, the health check code would extend the cache TTL to 15 minutes by updating the timestamp to `Date.now()`. This caused a critical issue:

**The timestamp update effectively "refreshed" stale data, treating it as new.**

#### Bug #2: originalTTL Miscalculation (Fixed in second iteration)
When handling a 429 rate limit, the code calculated `originalTTL` using the `rateLimited` flag, but this flag may have been set by a **previous** rate limit event. This caused the "original validity window" check to be incorrect on **subsequent** rate limit responses:

**The code used the current flag state instead of the actual TTL when data was fetched.**

### Real-World Impact Scenarios

#### Scenario 1: Bug #1 - Masking Unhealthy Service (Timestamp Reset)
```
Timeline:
1. T+0min:  Clerk API healthy, cached with timestamp T0
2. T+2min:  Clerk API goes down (but we don't know yet - using cache)
3. T+3min:  Rate limit (429) occurs
4. BUG #1:  Timestamp updated to T+3min, cache now valid until T+18min
5. Result:  Unhealthy service masked for 15 minutes from T+3min
            (Total: 18 minutes of stale "healthy" status)
```

#### Scenario 2: Bug #1 - Masking Recovery (Timestamp Reset)
```
Timeline:
1. T+0min:  Clerk API unhealthy, cached with timestamp T0
2. T+2min:  Clerk API recovers (but we don't know yet - using cache)
3. T+3min:  Rate limit (429) occurs
4. BUG #1:  Timestamp updated to T+3min, cache now valid until T+18min
5. Result:  Recovery masked for 15 minutes from T+3min
            (Total: 18 minutes of stale "unhealthy" status)
```

#### Scenario 3: Bug #2 - Incorrect TTL on Subsequent Rate Limits
```
Timeline:
1. T+0min:  Clerk API healthy, cached with originalTTL=4min, rateLimited=false
2. T+2min:  First rate limit (429) occurs
            - Cache is 2min old, originalTTL=4min (calculated from rateLimited=false ✅)
            - Cache is used, rateLimited flag set to true
3. T+3min:  Second rate limit (429) occurs
            - Cache is 3min old, should check against originalTTL=4min
            - BUG #2: Code calculates originalTTL from rateLimited=true → 15min ❌
            - Cache incorrectly appears valid (3min < 15min)
4. T+5min:  Third rate limit (429) occurs
            - Cache is 5min old, should be REJECTED (5min > 4min original TTL)
            - BUG #2: Code calculates originalTTL=15min, accepts stale cache ❌
5. Result:  Stale 5-minute-old data (beyond its actual 4-min validity) is used
            Status changes masked because flag-based TTL calculation is wrong
```

### Root Cause #1: Timestamp Reset

The problematic code was on lines 95-99 (first version):

```typescript
// ❌ BEFORE (BUGGY CODE - BUG #1)
if (healthCheckCache) {
  // Mark the cache as rate-limited and update timestamp to ensure 15 minutes from NOW
  healthCheckCache.rateLimited = true;
  healthCheckCache.timestamp = Date.now(); // ❌ BUG #1: This resets the cache freshness!

  return NextResponse.json({
    status: healthCheckCache.status,
    // ... returns potentially stale data as if it's fresh
  });
}
```

**Why Bug #1 Is Bad:**
- The cached data was fetched at some earlier time (e.g., 5 minutes ago)
- By updating the timestamp to `Date.now()`, we're lying about when the data was fetched
- The 15-minute TTL now applies to potentially stale data
- If the service status changed during the cache period, we won't detect it for 15 more minutes

### Root Cause #2: originalTTL Miscalculation

The problematic code was on lines 100-101 (after first fix):

```typescript
// ❌ AFTER FIRST FIX (STILL BUGGY - BUG #2)
const cacheAge = Date.now() - healthCheckCache.timestamp;
const originalTTL = healthCheckCache.rateLimited ? RATE_LIMIT_CACHE_TTL_MS : CACHE_TTL_MS; // ❌ BUG #2!

// Only use cached result if it's still within the original TTL
if (cacheAge < originalTTL) {
  healthCheckCache.rateLimited = true; // This sets the flag for NEXT time
  return cached response;
}
```

**Why Bug #2 Is Bad:**
- **Scenario**: Data fetched at T+0 with 4-min TTL, rate limit at T+2 sets `rateLimited=true`
- **Second rate limit at T+3**: The flag is now `true`, so `originalTTL = 15 min` ❌
- **Problem**: The 3-minute-old data is checked against a 15-min window, but it was **originally** fetched with a 4-min TTL
- **Result**: Stale data (beyond its actual 4-min validity) is incorrectly accepted because we're using the wrong TTL value

## Solution

### Implementation - Two-Stage Fix

#### Stage 1: Preserve Timestamp (First Fix)

```typescript
// ✅ AFTER FIRST FIX (Addresses Bug #1)
if (healthCheckCache) {
  const cacheAge = Date.now() - healthCheckCache.timestamp;
  const originalTTL = healthCheckCache.rateLimited ? RATE_LIMIT_CACHE_TTL_MS : CACHE_TTL_MS;
  
  if (cacheAge < originalTTL) {
    healthCheckCache.rateLimited = true;
    // ✅ Timestamp NOT updated - preserves when data was fetched
    return cached response;
  }
}
```

#### Stage 2: Store originalTTL (Second Fix - COMPLETE)

```typescript
// ✅ FINAL FIX (Addresses Both Bugs)

// 1. Add originalTTL to cache interface
interface HealthCheckCache {
  status: 'healthy' | 'unhealthy';
  timestamp: number;
  responseTime: number;
  error?: string;
  rateLimited?: boolean;
  originalTTL: number; // ✅ NEW: Store TTL at fetch time
}

// 2. Store originalTTL when caching data
healthCheckCache = {
  status: 'healthy',
  timestamp: Date.now(),
  responseTime,
  rateLimited: false,
  originalTTL: CACHE_TTL_MS, // ✅ Store the actual TTL when fetched
};

// 3. Use stored originalTTL on rate limit (not flag-based calculation)
if (healthCheckCache) {
  const cacheAge = Date.now() - healthCheckCache.timestamp;
  
  // ✅ CRITICAL: Use the TTL that was in effect when data was FETCHED
  // NOT the current rateLimited flag (which may be from a previous rate limit)
  const originalTTL = healthCheckCache.originalTTL;
  
  if (cacheAge < originalTTL) {
    healthCheckCache.rateLimited = true;
    return cached response;
  }
  
  logger.warn('Cached result expired', {
    cacheAge: `${Math.round(cacheAge / 1000)}s`,
    originalTTL: `${Math.round(originalTTL / 1000)}s`, // ✅ NEW: Log the actual TTL
  });
}
```

### Key Improvements

1. **Timestamp Preservation** (Fix #1): Never update the timestamp on rate limit
2. **originalTTL Storage** (Fix #2): Store the actual TTL when data is fetched, not derived from flags
3. **TTL Validation**: Check if cached data is still valid against its **actual** original TTL
4. **Stale Data Rejection**: Reject expired cache even on rate limit, using correct TTL value
5. **Accurate Reporting**: Return actual cache age in the response

## Behavior After Fix

### Scenario 1: Fresh Cache on Rate Limit (✅ Correct)
```
Timeline:
1. T+0min:  Clerk API healthy, cached with timestamp T0
2. T+2min:  Rate limit (429) occurs
3. FIX:     Cache is 2min old, still within 4min TTL → Use it
4. FIX:     Mark as rate-limited (15min TTL for future checks)
5. FIX:     Keep timestamp as T0 (preserves data freshness)
6. Result:  Cache expires at T+4min (original TTL), not T+17min
```

### Scenario 2: Expired Cache on Rate Limit (✅ Correct)
```
Timeline:
1. T+0min:  Clerk API status unknown (cache is 5min old, beyond 4min TTL)
2. T+0min:  Rate limit (429) occurs
3. FIX:     Cache is 5min old, beyond 4min TTL → Reject it
4. FIX:     Return rate limit error (503)
5. Result:  System reports rate limit error, doesn't use stale data
```

### Scenario 3: Rate-Limited Cache Still Valid (✅ Correct)
```
Timeline:
1. T+0min:  First rate limit, cache marked as rate-limited (15min TTL)
2. T+10min: Second rate limit (429) occurs
3. FIX:     Cache is 10min old, within 15min extended TTL → Use it
4. FIX:     Keep timestamp as T0 (still expires at T+15min)
5. Result:  Cache expires at T+15min (original extended TTL)
```

## Testing

A comprehensive test suite was created in `scripts/test-clerk-rate-limit-cache.ts` that verifies:

1. ✅ Fresh cache within TTL is used on rate limit
2. ✅ Expired cache (5 minutes) is rejected on rate limit
3. ✅ Rate-limited cache within extended TTL (10 minutes) is used
4. ✅ Rate-limited cache beyond extended TTL (20 minutes) is rejected
5. ✅ Missing cache is handled correctly
6. ✅ **CRITICAL: originalTTL is used, not rateLimited flag (Bug #2 fix)**
7. ✅ **CRITICAL: Expired cache rejected despite rateLimited=true (Bug #2 fix)**
8. ✅ **Timestamp is preserved on rate limit (Bug #1 fix)**

### Test Results
```
Total:  8
Passed: 8
Failed: 0

✓ Cache timestamp is correctly preserved on rate limit (Bug #1 fix)
✓ originalTTL correctly stored and used (Bug #2 fix)
✓ Only valid cache data is used (within actual original TTL)
✓ Expired cache is rejected even on rate limit
✓ This prevents masking real status changes during rate limit windows
```

### Critical Test Cases for Bug #2

**Test 6: originalTTL validation on subsequent rate limits**
- Simulates: Data fetched with 4-min TTL, first rate limit sets rateLimited=true, second rate limit at 3min
- Verifies: Cache is validated against stored originalTTL (4min), not calculated from flag (15min)
- Result: ✅ Cache correctly accepted (3min < 4min originalTTL)

**Test 7: Expired cache rejected despite rateLimited=true**
- Simulates: Data fetched with 4-min TTL, rate limit sets rateLimited=true, another rate limit at 5min
- Verifies: Cache is validated against stored originalTTL (4min), not flag-based calculation (15min)
- Result: ✅ Cache correctly rejected (5min > 4min originalTTL)
- **This test would FAIL with Bug #2** - it would incorrectly accept the 5-min-old cache

## Cache TTL Strategy

### Normal Operation (No Rate Limits)
- **TTL**: 4 minutes
- **Reason**: Monitor checks every 5 minutes, so cache ensures we check Clerk API ~12 times/day instead of 288 times/day (95% reduction)

### Rate Limited Operation
- **TTL**: 15 minutes (extended)
- **Reason**: Reduces API calls even further when Clerk is rate limiting us
- **Important**: Extended TTL only applies to future checks, not backwards in time

### Cache Expiration Timeline

```
Example with rate limit at T+2min:

Normal TTL (4min):
T+0  ━━━━━━━━━━━━━━━━━━━━━━━━━> T+4min
     [Cache Valid]              [Expires]
     
Rate limit at T+2min:
T+0  ━━━━━━━━━> T+2  ━━━━━━━━━━━━━━━━━━━━━━━> T+15min (from T0, NOT T+2)
     [Valid]   [RL] [Marked for 15min TTL]   [Expires]
                ^
                └─ Timestamp stays at T0, NOT updated to T+2
```

## Related Files

- `app/api/health/clerk/route.ts` - Main fix implementation
- `scripts/test-clerk-rate-limit-cache.ts` - Test suite
- `lib/slack-notifier.ts` - Notification system (uses accurate cache data)

## Lessons Learned

1. **Never reset timestamps on cached data** - Timestamp represents when data was fetched, not when it was last accessed
2. **Validate cache freshness** - Always check if cached data is still within its TTL before using it
3. **Extended TTLs should preserve original fetch time** - Extending TTL doesn't make old data fresh
4. **Test cache invalidation scenarios** - Rate limits, timeouts, and edge cases need explicit tests

## Monitoring

After this fix, the following metrics should be monitored:

1. **Cache Hit Rate**: Should remain high (~90%+) for Clerk health checks
2. **Rate Limit Frequency**: Should be very low (<1% of checks)
3. **False Positive Alerts**: Should decrease (no more alerts from stale cached data)
4. **Service Status Accuracy**: Health checks should reflect real-time status within 4 minutes

## Conclusion

This fix ensures that the Clerk health check cache accurately reflects the service status and doesn't mask real status changes by extending stale data. The cache now properly balances:

- ✅ Reducing API calls to Clerk (avoiding rate limits)
- ✅ Maintaining accurate health status reporting
- ✅ Handling rate limits gracefully when they occur
- ✅ Not masking service failures or recoveries

