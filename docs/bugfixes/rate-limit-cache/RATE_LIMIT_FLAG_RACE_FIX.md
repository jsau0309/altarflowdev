# Rate Limit Flag Race Condition Fix

## Issue Summary

**Date:** November 24, 2025  
**Severity:** Medium  
**Component:** Clerk Health Check (`app/api/health/clerk/route.ts`)

### Problem

The `rateLimited` flag was being reset to `false` on every cache hit, creating a race condition where subsequent requests arriving milliseconds later would use the wrong TTL calculation.

#### Timeline of the Bug

```
T+0min:  Cache marked as rate-limited (rateLimited=true)
         Intended behavior: Use 15-minute TTL
         
T+1min:  Request A arrives
         - Reads cache with rateLimited=true
         - Uses 15-minute TTL (correct)
         - Resets flag to false (BUG!)
         - Returns cached response
         
T+1min + 5ms: Request B arrives
         - Reads cache with rateLimited=false (wrong!)
         - Uses 4-minute TTL (should be 15-minute)
         - Cache expires in 3 minutes instead of 14 minutes
         
Result: Extended TTL defeated immediately after being set
```

### Impact

1. **Reduced Cache Effectiveness**: Extended 15-minute TTL was reduced to 4 minutes immediately after first cache hit
2. **Increased API Calls**: More API calls to Clerk than intended during rate limit periods
3. **Inconsistent Behavior**: Different requests milliseconds apart would use different TTL calculations

## Root Cause

Lines 45-48 in `route.ts` were resetting the flag on every cache read:

```typescript
// BUGGY CODE (removed)
const wasRateLimited = healthCheckCache.rateLimited;
if (wasRateLimited) {
  healthCheckCache.rateLimited = false; // BUG: Reset on every cache hit!
}
```

### Why This Was Wrong

The flag was being treated as a "one-time use" indicator, but it should persist for the entire extended TTL period. The intent was to:
1. Mark cache as rate-limited when 429 occurs
2. Extend TTL to 15 minutes
3. Use extended TTL for all requests during that 15-minute window

But the implementation was:
1. Mark cache as rate-limited when 429 occurs ✅
2. First request uses 15-minute TTL ✅
3. First request resets flag ❌
4. Subsequent requests use 4-minute TTL ❌

## Solution

Removed the flag reset logic from cache hits. The flag should **only** be reset when the cache is refreshed with new data.

### Fixed Code

```typescript
// FIXED CODE
// FIX: Do NOT reset rateLimited flag on cache hit
// The flag should only be reset when cache is refreshed with new data (lines 179, 253)
// Resetting on every cache hit creates a race condition where subsequent requests
// milliseconds later would use the wrong TTL calculation (4-min instead of 15-min)

logger.debug('Returning cached Clerk health check result', {
  operation: 'health.clerk.cache_hit',
  cacheAge: Date.now() - healthCheckCache.timestamp,
  status: healthCheckCache.status,
  rateLimited: healthCheckCache.rateLimited, // Log current rate limit state
});
```

### Where Flag IS Reset (Correct)

The flag is properly reset when creating new cache entries:

1. **Line 179** - Successful API call:
```typescript
healthCheckCache = {
  status: 'healthy',
  timestamp: Date.now(),
  responseTime,
  rateLimited: false, // ✅ Reset on refresh
  originalTTL: CACHE_TTL_MS,
};
```

2. **Line 253** - Failed API call:
```typescript
healthCheckCache = {
  status: 'unhealthy',
  timestamp: Date.now(),
  responseTime,
  error: errorMessage,
  rateLimited: false, // ✅ Reset on refresh
  originalTTL: CACHE_TTL_MS,
};
```

## Testing

Created comprehensive test suite to verify the fix:

### Test 1: Race Condition Detection
**File:** `scripts/test-rate-limit-flag-race.ts`

Tests that demonstrate the race condition existed in the old code and is fixed in the new code.

```bash
npx tsx scripts/test-rate-limit-flag-race.ts
```

**Results:**
- ❌ Current Behavior: Race condition confirmed
- ✅ Fixed Behavior: Correct TTL preservation

### Test 2: Integration Verification
**File:** `scripts/verify-rate-limit-flag-fix.ts`

Simulates the actual route behavior with multiple sequential requests:

```bash
npx tsx scripts/verify-rate-limit-flag-fix.ts
```

**Results:**
- ✅ All requests use 15-min TTL
- ✅ All caches valid
- ✅ Flag preserved across hits
- ✅ Flag reset on refresh

## Expected Behavior After Fix

### Scenario: Rate Limit Occurs

```
T+0min:  Clerk API healthy, cached (rateLimited=false, 4-min TTL)
T+4min:  Cache expires, new request made
T+4min:  Clerk returns 429 (rate limit)
         Cache marked as rateLimited=true
         Next expiry: T+19min (15-min TTL from original timestamp)
         
T+5min:  Request A arrives
         - rateLimited=true
         - Uses 15-min TTL
         - Flag PRESERVED ✅
         - Returns cached response
         
T+5min + 5ms: Request B arrives
         - rateLimited=true ✅ (not reset)
         - Uses 15-min TTL ✅
         - Flag PRESERVED ✅
         - Returns cached response
         
T+10min: Request C arrives
         - rateLimited=true ✅
         - Uses 15-min TTL ✅
         - Returns cached response
         
T+19min: Cache expires, new request made
         Clerk API hopefully recovered
         New cache created with rateLimited=false
```

## Verification Checklist

- [x] Bug identified and root cause understood
- [x] Fix implemented (remove flag reset on cache hit)
- [x] Test suite created to verify fix
- [x] Integration tests pass
- [x] No linting errors
- [x] Documentation updated
- [x] Flag reset locations verified (lines 179, 253)

## Related Files

- `app/api/health/clerk/route.ts` - Health check endpoint (FIXED)
- `scripts/test-rate-limit-flag-race.ts` - Race condition detection test
- `scripts/verify-rate-limit-flag-fix.ts` - Integration verification test
- `docs/bugfixes/rate-limit-cache/RATE_LIMIT_CACHE_FIX.md` - Original cache timestamp fix
- `docs/bugfixes/HEALTH_CHECK_NOTIFICATION_FIX.md` - Related notification fix

## Related Issues

This fix builds on previous rate limit cache fixes:
1. **RATE_LIMIT_CACHE_FIX.md** - Fixed timestamp preservation on rate limit
2. **HEALTH_CHECK_NOTIFICATION_FIX.md** - Fixed notification spam on rate limit
3. **This fix** - Fixed flag reset race condition

Together, these fixes ensure the rate limit caching mechanism works correctly and reliably.

## Performance Impact

### Before Fix
- Extended TTL defeated immediately
- More API calls during rate limit periods
- Inconsistent cache behavior

### After Fix
- Extended TTL works as intended
- Reduced API calls during rate limit periods
- Consistent cache behavior across all requests

## Next Steps

1. ✅ Deploy fix to production
2. Monitor Clerk health check behavior
3. Verify extended TTL works correctly during rate limits
4. Watch for any false positive/negative alerts

## Lessons Learned

1. **Cache flags should be stateful** - Don't reset state on reads, only on writes
2. **Race conditions can happen at millisecond scale** - Consider concurrent access patterns
3. **Test concurrent scenarios** - Simulate multiple requests in quick succession
4. **Document intended behavior clearly** - Make TTL extension logic explicit

## Author Notes

This was a subtle race condition that would be difficult to catch without explicit testing. The bug would manifest as:
- Cache hits resetting the rate limit extension
- Subsequent requests using wrong TTL
- Extended cache period not working as intended

The fix ensures that once a cache is marked as rate-limited, it stays that way for the entire extended TTL period, only resetting when new data is fetched from the API.

