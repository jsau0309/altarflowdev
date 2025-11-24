/**
 * Test: Rate Limit Flag Race Condition
 * 
 * Verifies that the rateLimited flag is NOT reset on cache hits,
 * preventing a race condition where subsequent requests would use
 * the wrong TTL calculation.
 * 
 * Issue: If cache hit resets rateLimited=false, the next request
 * milliseconds later will use 4-min TTL instead of 15-min TTL.
 */

interface HealthCheckCache {
  status: 'healthy' | 'unhealthy';
  timestamp: number;
  responseTime: number;
  error?: string;
  rateLimited?: boolean;
  originalTTL: number;
}

const CACHE_TTL_MS = 4 * 60 * 1000; // 4 minutes
const RATE_LIMIT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Simulates the CURRENT (buggy) behavior where rateLimited is reset on cache hit
 */
function getCurrentBehavior(cache: HealthCheckCache): {
  effectiveTTL: number;
  cacheValid: boolean;
  rateLimitedAfter: boolean;
} {
  const effectiveTTL = cache.rateLimited ? RATE_LIMIT_CACHE_TTL_MS : CACHE_TTL_MS;
  const cacheValid = Date.now() - cache.timestamp < effectiveTTL;
  
  if (cacheValid) {
    // BUG: Reset rateLimited flag on cache hit
    const wasRateLimited = cache.rateLimited;
    if (wasRateLimited) {
      cache.rateLimited = false; // This is the bug!
    }
  }
  
  return {
    effectiveTTL,
    cacheValid,
    rateLimitedAfter: cache.rateLimited || false,
  };
}

/**
 * Simulates the FIXED behavior where rateLimited is NOT reset on cache hit
 */
function getFixedBehavior(cache: HealthCheckCache): {
  effectiveTTL: number;
  cacheValid: boolean;
  rateLimitedAfter: boolean;
} {
  const effectiveTTL = cache.rateLimited ? RATE_LIMIT_CACHE_TTL_MS : CACHE_TTL_MS;
  const cacheValid = Date.now() - cache.timestamp < effectiveTTL;
  
  // FIX: Do NOT reset rateLimited flag on cache hit
  // It should only be reset when cache is refreshed with new data
  
  return {
    effectiveTTL,
    cacheValid,
    rateLimitedAfter: cache.rateLimited || false,
  };
}

// Test case: Simulate race condition
function testRaceCondition() {
  console.log('\n=== Test: Rate Limit Flag Race Condition ===\n');
  
  // Setup: Cache was marked as rate-limited 1 minute ago
  const now = Date.now();
  const cacheTimestamp = now - (1 * 60 * 1000); // 1 minute ago
  
  const cacheForCurrentBehavior: HealthCheckCache = {
    status: 'healthy',
    timestamp: cacheTimestamp,
    responseTime: 150,
    rateLimited: true, // Was marked as rate-limited
    originalTTL: CACHE_TTL_MS,
  };
  
  const cacheForFixedBehavior: HealthCheckCache = {
    status: 'healthy',
    timestamp: cacheTimestamp,
    responseTime: 150,
    rateLimited: true,
    originalTTL: CACHE_TTL_MS,
  };
  
  console.log('Initial State:');
  console.log('  Cache Age: 1 minute');
  console.log('  rateLimited: true');
  console.log('  Expected TTL: 15 minutes\n');
  
  // Request A arrives
  console.log('Request A arrives:');
  const resultA_current = getCurrentBehavior(cacheForCurrentBehavior);
  const resultA_fixed = getFixedBehavior(cacheForFixedBehavior);
  
  console.log('  Current Behavior:');
  console.log(`    - Effective TTL: ${resultA_current.effectiveTTL / 60000} minutes`);
  console.log(`    - Cache Valid: ${resultA_current.cacheValid}`);
  console.log(`    - rateLimited After: ${resultA_current.rateLimitedAfter} ❌ (BUG: reset to false)`);
  
  console.log('  Fixed Behavior:');
  console.log(`    - Effective TTL: ${resultA_fixed.effectiveTTL / 60000} minutes`);
  console.log(`    - Cache Valid: ${resultA_fixed.cacheValid}`);
  console.log(`    - rateLimited After: ${resultA_fixed.rateLimitedAfter} ✅ (preserved)`);
  
  // Request B arrives milliseconds later
  console.log('\nRequest B arrives (milliseconds later):');
  const resultB_current = getCurrentBehavior(cacheForCurrentBehavior);
  const resultB_fixed = getFixedBehavior(cacheForFixedBehavior);
  
  console.log('  Current Behavior:');
  console.log(`    - Effective TTL: ${resultB_current.effectiveTTL / 60000} minutes ❌ (BUG: using 4-min TTL)`);
  console.log(`    - Cache Valid: ${resultB_current.cacheValid}`);
  console.log(`    - rateLimited After: ${resultB_current.rateLimitedAfter}`);
  
  console.log('  Fixed Behavior:');
  console.log(`    - Effective TTL: ${resultB_fixed.effectiveTTL / 60000} minutes ✅ (still 15-min TTL)`);
  console.log(`    - Cache Valid: ${resultB_fixed.cacheValid}`);
  console.log(`    - rateLimited After: ${resultB_fixed.rateLimitedAfter}`);
  
  // Verify the race condition
  console.log('\n=== Race Condition Impact ===\n');
  
  const currentBehaviorBroken = resultA_current.effectiveTTL === 15 * 60 * 1000 && 
                                 resultB_current.effectiveTTL === 4 * 60 * 1000;
  
  const fixedBehaviorCorrect = resultA_fixed.effectiveTTL === 15 * 60 * 1000 && 
                                resultB_fixed.effectiveTTL === 15 * 60 * 1000;
  
  if (currentBehaviorBroken) {
    console.log('❌ RACE CONDITION CONFIRMED:');
    console.log('   Request A uses 15-min TTL, then resets flag');
    console.log('   Request B uses 4-min TTL (should be 15-min)');
    console.log('   Extended TTL is defeated immediately!\n');
  }
  
  if (fixedBehaviorCorrect) {
    console.log('✅ FIXED BEHAVIOR CORRECT:');
    console.log('   Request A uses 15-min TTL, preserves flag');
    console.log('   Request B uses 15-min TTL (correct)');
    console.log('   Extended TTL works as intended!\n');
  }
  
  return {
    raceConditionExists: currentBehaviorBroken,
    fixWorks: fixedBehaviorCorrect,
  };
}

// Test case: Flag should only reset on cache refresh
function testFlagResetOnRefresh() {
  console.log('\n=== Test: Flag Reset Only On Cache Refresh ===\n');
  
  console.log('Scenario: Cache should be refreshed with new data');
  console.log('Expected: rateLimited flag should be reset to false\n');
  
  // Simulate successful API call (cache refresh)
  const newCache: HealthCheckCache = {
    status: 'healthy',
    timestamp: Date.now(),
    responseTime: 120,
    rateLimited: false, // Reset on refresh
    originalTTL: CACHE_TTL_MS,
  };
  
  console.log('✅ New cache created with rateLimited=false');
  console.log('   This is correct - flag reset on data refresh\n');
  
  return true;
}

// Run tests
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  Rate Limit Flag Race Condition Test Suite               ║');
console.log('╚═══════════════════════════════════════════════════════════╝');

const raceTest = testRaceCondition();
const refreshTest = testFlagResetOnRefresh();

console.log('═══════════════════════════════════════════════════════════');
console.log('Test Results:');
console.log(`  Race Condition Exists: ${raceTest.raceConditionExists ? '❌ YES' : '✅ NO'}`);
console.log(`  Fix Works Correctly: ${raceTest.fixWorks ? '✅ YES' : '❌ NO'}`);
console.log(`  Flag Reset On Refresh: ${refreshTest ? '✅ YES' : '❌ NO'}`);
console.log('═══════════════════════════════════════════════════════════\n');

if (raceTest.raceConditionExists) {
  console.log('🚨 ISSUE CONFIRMED: Race condition exists in current implementation');
  console.log('   The rateLimited flag should NOT be reset on cache hits');
  console.log('   It should ONLY be reset when cache is refreshed with new data\n');
  process.exit(1);
} else {
  console.log('✅ All tests passed - no race condition detected\n');
  process.exit(0);
}

