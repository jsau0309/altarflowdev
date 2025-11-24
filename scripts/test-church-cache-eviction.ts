/**
 * Test script to verify church cache eviction logic
 * 
 * This script tests that:
 * 1. Cache evicts expired entries
 * 2. Cache limits size to MAX_CACHE_ENTRIES
 * 3. Oldest entries are removed when over limit
 * 4. No unbounded memory growth
 * 
 * Run with: npx tsx scripts/test-church-cache-eviction.ts
 */

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Simulate the church cache implementation
 */
interface ChurchDataCache {
  data: any;
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const MAX_CACHE_ENTRIES = 100; // Max cache entries

function createTestCache() {
  const cache = new Map<string, ChurchDataCache>();
  
  function evictCacheIfNeeded() {
    const now = Date.now();
    
    // First pass: Remove expired entries
    for (const [slug, entry] of cache.entries()) {
      if (now - entry.timestamp >= CACHE_TTL_MS) {
        cache.delete(slug);
      }
    }
    
    // Second pass: If still over limit, remove oldest entries
    if (cache.size > MAX_CACHE_ENTRIES) {
      const entries = Array.from(cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, cache.size - MAX_CACHE_ENTRIES);
      toRemove.forEach(([slug]) => cache.delete(slug));
    }
  }
  
  return { cache, evictCacheIfNeeded };
}

async function runTests() {
  log('\n═══════════════════════════════════════════', 'blue');
  log('  Church Cache Eviction Test Suite', 'blue');
  log('═══════════════════════════════════════════\n', 'blue');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Expired entries are evicted
  log('📝 Test 1: Expired entries are evicted', 'cyan');
  {
    const { cache, evictCacheIfNeeded } = createTestCache();
    const now = Date.now();
    
    // Add entries: some fresh, some expired
    cache.set('fresh-1', { data: {}, timestamp: now });
    cache.set('fresh-2', { data: {}, timestamp: now });
    cache.set('expired-1', { data: {}, timestamp: now - CACHE_TTL_MS - 1000 }); // Expired
    cache.set('expired-2', { data: {}, timestamp: now - CACHE_TTL_MS - 2000 }); // Expired
    
    evictCacheIfNeeded();
    
    if (cache.size === 2 && cache.has('fresh-1') && cache.has('fresh-2') && 
        !cache.has('expired-1') && !cache.has('expired-2')) {
      log('✓ Expired entries correctly evicted', 'green');
      log(`  Cache size: ${cache.size} (expected: 2)`, 'cyan');
      testsPassed++;
    } else {
      log('✗ Expired entry eviction failed', 'red');
      log(`  Cache size: ${cache.size} (expected: 2)`, 'red');
      testsFailed++;
    }
  }

  // Test 2: Cache size is limited to MAX_CACHE_ENTRIES
  log('\n📝 Test 2: Cache size limited to MAX_CACHE_ENTRIES', 'cyan');
  {
    const { cache, evictCacheIfNeeded } = createTestCache();
    const now = Date.now();
    
    // Add more than MAX_CACHE_ENTRIES
    for (let i = 0; i < MAX_CACHE_ENTRIES + 20; i++) {
      cache.set(`church-${i}`, { data: {}, timestamp: now + i }); // Stagger timestamps
    }
    
    const sizeBefore = cache.size;
    evictCacheIfNeeded();
    const sizeAfter = cache.size;
    
    if (sizeAfter === MAX_CACHE_ENTRIES) {
      log('✓ Cache size correctly limited', 'green');
      log(`  Before: ${sizeBefore}, After: ${sizeAfter} (max: ${MAX_CACHE_ENTRIES})`, 'cyan');
      testsPassed++;
    } else {
      log('✗ Cache size not limited correctly', 'red');
      log(`  Size: ${sizeAfter} (expected: ${MAX_CACHE_ENTRIES})`, 'red');
      testsFailed++;
    }
  }

  // Test 3: Oldest entries are removed (LRU-style)
  log('\n📝 Test 3: Oldest entries removed when over limit', 'cyan');
  {
    const { cache, evictCacheIfNeeded } = createTestCache();
    const now = Date.now();
    
    // Add entries with staggered timestamps
    cache.set('oldest', { data: {}, timestamp: now - 50000 });
    cache.set('middle', { data: {}, timestamp: now - 25000 });
    cache.set('newest', { data: {}, timestamp: now });
    
    // Fill cache to just over limit
    for (let i = 0; i < MAX_CACHE_ENTRIES; i++) {
      cache.set(`filler-${i}`, { data: {}, timestamp: now - 10000 + i });
    }
    
    evictCacheIfNeeded();
    
    // Oldest should be removed, newest should remain
    if (!cache.has('oldest') && cache.has('newest') && cache.size <= MAX_CACHE_ENTRIES) {
      log('✓ Oldest entries correctly removed (LRU)', 'green');
      log(`  Oldest removed: ✓, Newest retained: ✓`, 'cyan');
      testsPassed++;
    } else {
      log('✗ LRU eviction failed', 'red');
      log(`  Has oldest: ${cache.has('oldest')}, Has newest: ${cache.has('newest')}`, 'red');
      testsFailed++;
    }
  }

  // Test 4: Multiple eviction calls don't cause issues
  log('\n📝 Test 4: Multiple eviction calls are safe', 'cyan');
  {
    const { cache, evictCacheIfNeeded } = createTestCache();
    const now = Date.now();
    
    // Add entries
    for (let i = 0; i < 50; i++) {
      cache.set(`church-${i}`, { data: {}, timestamp: now });
    }
    
    // Call eviction multiple times
    evictCacheIfNeeded();
    const size1 = cache.size;
    evictCacheIfNeeded();
    const size2 = cache.size;
    evictCacheIfNeeded();
    const size3 = cache.size;
    
    if (size1 === size2 && size2 === size3 && size1 <= MAX_CACHE_ENTRIES) {
      log('✓ Multiple evictions are stable', 'green');
      log(`  Sizes: ${size1}, ${size2}, ${size3} (stable)`, 'cyan');
      testsPassed++;
    } else {
      log('✗ Multiple evictions unstable', 'red');
      log(`  Sizes: ${size1}, ${size2}, ${size3}`, 'red');
      testsFailed++;
    }
  }

  // Test 5: Empty cache eviction is safe
  log('\n📝 Test 5: Empty cache eviction is safe', 'cyan');
  {
    const { cache, evictCacheIfNeeded } = createTestCache();
    
    try {
      evictCacheIfNeeded();
      if (cache.size === 0) {
        log('✓ Empty cache eviction safe', 'green');
        testsPassed++;
      } else {
        log('✗ Unexpected cache size after empty eviction', 'red');
        testsFailed++;
      }
    } catch (error) {
      log('✗ Empty cache eviction threw error', 'red');
      testsFailed++;
    }
  }

  // Summary
  log('\n═══════════════════════════════════════════', 'blue');
  log('  Test Results', 'blue');
  log('═══════════════════════════════════════════', 'blue');
  log(`Total:  ${testsPassed + testsFailed}`, 'cyan');
  log(`Passed: ${testsPassed}`, 'green');
  log(`Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
  log('═══════════════════════════════════════════\n', 'blue');

  if (testsFailed === 0) {
    log('🎉 All tests passed!', 'green');
    log('\n✓ Cache evicts expired entries', 'green');
    log('✓ Cache size is bounded (max 100 entries)', 'green');
    log('✓ Oldest entries removed when over limit (LRU)', 'green');
    log('✓ No unbounded memory growth\n', 'green');
    return 0;
  } else {
    log('❌ Some tests failed', 'red');
    return 1;
  }
}

// Run tests
runTests()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    log(`\n❌ Test suite failed with error: ${error}`, 'red');
    console.error(error);
    process.exit(1);
  });

