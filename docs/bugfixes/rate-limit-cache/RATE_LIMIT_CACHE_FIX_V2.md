# Rate Limit Cache Fix V2 - originalTTL Bug

## Summary

**Fix Version**: V2 (Second iteration)  
**Bug Fixed**: originalTTL miscalculation on subsequent rate limits  
**Priority**: P1 (Critical)  
**Date**: November 24, 2025

## The Bug

After fixing Bug #1 (timestamp reset), a second subtle bug remained:

```typescript
// ❌ BUGGY CODE (After first fix, before second fix)
const cacheAge = Date.now() - healthCheckCache.timestamp;
const originalTTL = healthCheckCache.rateLimited ? RATE_LIMIT_CACHE_TTL_MS : CACHE_TTL_MS;

if (cacheAge < originalTTL) {
  healthCheckCache.rateLimited = true; // Sets flag for NEXT request
  return cached response;
}
```

### The Problem

The `originalTTL` calculation uses the **current** `rateLimited` flag state, but this flag may have been set by a **previous** rate limit event. This causes incorrect validation on subsequent rate limits.

### Real-World Failure Scenario

```
T+0min:  Data fetched, cached with 4-min TTL, rateLimited=false
T+2min:  First rate limit (429)
         → rateLimited=false, so originalTTL=4min ✅ Correct
         → Cache used, rateLimited set to true
         
T+3min:  Second rate limit (429)
         → rateLimited=true, so originalTTL=15min ❌ WRONG!
         → Cache is 3min old, checked against 15min window
         → Incorrectly appears valid
         
T+5min:  Third rate limit (429)
         → rateLimited=true, so originalTTL=15min ❌ WRONG!
         → Cache is 5min old (beyond actual 4min validity)
         → But checked against 15min window
         → Stale cache incorrectly accepted ❌
```

**Result**: Data fetched at T+0 with a 4-minute TTL is incorrectly used at T+5 (beyond its validity) because the TTL is calculated from a flag set by a previous rate limit, not from when the data was actually fetched.

## The Fix

### Solution: Store originalTTL at Fetch Time

Instead of calculating `originalTTL` from the flag, **store it** when the data is fetched:

```typescript
// ✅ FIXED CODE

// 1. Add to interface
interface HealthCheckCache {
  // ... existing fields
  originalTTL: number; // Store the TTL that was in effect when data was fetched
}

// 2. Store when caching (both healthy and unhealthy)
healthCheckCache = {
  status: 'healthy',
  timestamp: Date.now(),
  responseTime,
  rateLimited: false,
  originalTTL: CACHE_TTL_MS, // ✅ Store actual TTL at fetch time
};

// 3. Use stored value on rate limit
if (healthCheckCache) {
  const cacheAge = Date.now() - healthCheckCache.timestamp;
  const originalTTL = healthCheckCache.originalTTL; // ✅ Use stored value
  
  if (cacheAge < originalTTL) {
    healthCheckCache.rateLimited = true;
    return cached response;
  }
  
  logger.warn('Cached result expired', {
    cacheAge: `${Math.round(cacheAge / 1000)}s`,
    originalTTL: `${Math.round(originalTTL / 1000)}s`,
  });
}
```

## Why This Works

### Before Fix (Buggy)
```
Fetch time: originalTTL = 4min (stored as rateLimited=false)
First RL:   originalTTL = 4min (calculated from rateLimited=false) ✅
            Sets rateLimited=true for next time
Second RL:  originalTTL = 15min (calculated from rateLimited=true) ❌ WRONG!
```

### After Fix (Correct)
```
Fetch time: originalTTL = 4min (stored in originalTTL field)
First RL:   originalTTL = 4min (read from originalTTL field) ✅
            Sets rateLimited=true (but doesn't affect originalTTL)
Second RL:  originalTTL = 4min (read from originalTTL field) ✅ CORRECT!
Third RL:   originalTTL = 4min (read from originalTTL field) ✅ CORRECT!
```

The `rateLimited` flag now only affects cache validity at the **top** of the function (lines 38-40), not in the 429 handler.

## Files Changed

### Modified
- `app/api/health/clerk/route.ts`
  - Lines 20-27: Added `originalTTL` to `HealthCheckCache` interface
  - Lines 100-107: Changed to use stored `originalTTL` instead of calculating from flag
  - Line 133: Added `originalTTL` to error logging
  - Line 153: Store `originalTTL: CACHE_TTL_MS` when caching healthy result
  - Line 201: Store `originalTTL: CACHE_TTL_MS` when caching unhealthy result

### Updated
- `scripts/test-clerk-rate-limit-cache.ts`
  - Added `originalTTL` to interface
  - Updated all test cases to include `originalTTL` field
  - Added **Test 6**: Validates cache against originalTTL on subsequent rate limits
  - Added **Test 7**: Verifies expired cache is rejected despite `rateLimited=true`
  - These tests would **FAIL** without the fix

- `docs/RATE_LIMIT_CACHE_FIX.md`
  - Updated to document both Bug #1 and Bug #2
  - Added Scenario 3 showing Bug #2 failure
  - Updated test results to show 8 tests passing

## Test Results

All 8 tests pass, including 2 new critical tests for Bug #2:

```bash
$ npx tsx scripts/test-clerk-rate-limit-cache.ts

Total:  8
Passed: 8 ✅
Failed: 0

Test 6: CRITICAL - originalTTL validation on subsequent rate limits ✅
Test 7: CRITICAL - Expired cache rejected despite rateLimited=true ✅
```

## Impact

### Before Fix V2
- Subsequent rate limits after first rate limit would use incorrect TTL
- Stale data (beyond its actual validity) could be used
- Status changes masked for longer than intended

### After Fix V2
- All rate limits use the correct original TTL
- Cache expiration is accurate regardless of how many rate limits occur
- Status changes detected within intended time windows

## Key Insight

**The `rateLimited` flag should only affect cache validity at the top of the function (normal cache check), NOT in the 429 handler.**

The 429 handler needs to validate against the **actual TTL when data was fetched**, not a TTL calculated from a flag that may have been modified by previous requests.

## Verification

To verify the fix is working:

1. Check the cache interface has `originalTTL: number` field
2. Check cache creation stores `originalTTL: CACHE_TTL_MS`
3. Check 429 handler uses `healthCheckCache.originalTTL` directly
4. Run tests: `npx tsx scripts/test-clerk-rate-limit-cache.ts`
5. Verify Tests 6 and 7 pass (these specifically test Bug #2)

## Related Documentation

- `docs/RATE_LIMIT_CACHE_FIX.md` - Complete documentation of both bugs
- `scripts/test-clerk-rate-limit-cache.ts` - Test suite with 8 tests
- `app/api/health/clerk/route.ts` - Implementation

---

**Lesson Learned**: When storing cached data, store **all** metadata about that cache entry (timestamp, TTL, status, etc.) at the time of caching. Don't calculate metadata from mutable flags that may change on subsequent requests.

