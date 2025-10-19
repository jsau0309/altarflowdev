/**
 * Test script for campaign API cache
 *
 * Usage: npx tsx scripts/test-campaign-cache.ts
 *
 * This script:
 * 1. Makes 5 sequential requests to the campaign API
 * 2. Checks X-Cache headers (HIT vs MISS)
 * 3. Measures response times
 * 4. Verifies cache is working correctly
 */

async function testCampaignCache() {
  // Get a church slug from your database
  const CHURCH_SLUG = process.env.TEST_CHURCH_SLUG || 'development-demo';
  const API_URL = `http://localhost:3000/api/public/campaigns/${CHURCH_SLUG}/active`;

  console.log('🧪 Testing Campaign Cache Implementation\n');
  console.log(`Target: ${API_URL}\n`);
  console.log('Making 5 requests...\n');

  const results: Array<{
    requestNumber: number;
    cacheStatus: string;
    duration: number;
    statusCode: number;
    campaignCount: number;
  }> = [];

  for (let i = 1; i <= 5; i++) {
    const startTime = Date.now();

    try {
      const response = await fetch(API_URL);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const cacheStatus = response.headers.get('X-Cache') || 'UNKNOWN';
      const cacheControl = response.headers.get('Cache-Control') || 'none';
      const data = await response.json();

      results.push({
        requestNumber: i,
        cacheStatus,
        duration,
        statusCode: response.status,
        campaignCount: Array.isArray(data) ? data.length : 0,
      });

      console.log(`Request ${i}:`);
      console.log(`  Cache Status: ${cacheStatus === 'HIT' ? '✅ HIT' : '❌ MISS'}`);
      console.log(`  Response Time: ${duration}ms`);
      console.log(`  Status Code: ${response.status}`);
      console.log(`  Campaigns: ${Array.isArray(data) ? data.length : 'error'}`);
      console.log(`  Cache-Control: ${cacheControl}`);
      console.log('');

      // Wait 1 second between requests to avoid rate limiting
      if (i < 5) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Request ${i} failed:`, error instanceof Error ? error.message : error);
      console.log('');
    }
  }

  // Analysis
  console.log('\n📊 Cache Analysis:\n');

  const cacheHits = results.filter(r => r.cacheStatus === 'HIT').length;
  const cacheMisses = results.filter(r => r.cacheStatus === 'MISS').length;
  const avgMissTime = results.filter(r => r.cacheStatus === 'MISS')
    .reduce((sum, r) => sum + r.duration, 0) / cacheMisses || 0;
  const avgHitTime = results.filter(r => r.cacheStatus === 'HIT')
    .reduce((sum, r) => sum + r.duration, 0) / cacheHits || 0;

  console.log(`Total Requests: ${results.length}`);
  console.log(`Cache Hits: ${cacheHits} (${Math.round(cacheHits / results.length * 100)}%)`);
  console.log(`Cache Misses: ${cacheMisses} (${Math.round(cacheMisses / results.length * 100)}%)`);
  console.log('');
  console.log(`Average Time (Cache MISS): ${Math.round(avgMissTime)}ms`);
  console.log(`Average Time (Cache HIT): ${Math.round(avgHitTime)}ms`);
  if (cacheHits > 0 && cacheMisses > 0) {
    const improvement = ((avgMissTime - avgHitTime) / avgMissTime * 100);
    console.log(`Performance Improvement: ${Math.round(improvement)}% faster with cache ⚡`);
  }

  // Validation
  console.log('\n✅ Validation:\n');

  if (results.length === 0) {
    console.log('❌ No successful requests - check if server is running');
    return;
  }

  // First request should be MISS
  if (results[0]?.cacheStatus === 'MISS') {
    console.log('✅ First request is cache MISS (correct)');
  } else {
    console.log('⚠️  First request should be cache MISS');
  }

  // Subsequent requests should be HIT (within 5 minutes)
  const subsequentHits = results.slice(1).filter(r => r.cacheStatus === 'HIT').length;
  if (subsequentHits > 0) {
    console.log(`✅ ${subsequentHits} subsequent request(s) are cache HIT (correct)`);
  } else {
    console.log('⚠️  Expected subsequent requests to be cache HIT');
  }

  // Cache should be faster
  if (avgHitTime < avgMissTime) {
    console.log(`✅ Cached responses are ${Math.round((avgMissTime - avgHitTime) / avgMissTime * 100)}% faster (correct)`);
  } else if (cacheHits === 0) {
    console.log('⚠️  No cache hits to compare performance');
  }

  console.log('\n🎉 Cache test complete!\n');
}

// Run the test
testCampaignCache().catch(console.error);
