# Campaign Cache Testing Guide

**Quick Reference**: How to test the 5-minute cache implementation

---

## Method 1: Browser DevTools (Easiest - 2 minutes)

### Steps:

1. **Start your dev server**:
   ```bash
   npm run dev
   ```

2. **Open browser** and navigate to a page that calls the campaign API
   - Example: `http://localhost:3000/donate/YOUR_CHURCH_SLUG`

3. **Open DevTools** (F12 or Right-click → Inspect)

4. **Go to Network tab**:
   - Click "Network" tab
   - Filter by "Fetch/XHR"

5. **Make the first request**:
   - Load the page or trigger campaign fetch
   - Find the request to `/api/public/campaigns/[churchSlug]/active`
   - Click on it

6. **Check Response Headers**:
   ```
   Look for:
   X-Cache: MISS           ✅ (First request)
   Cache-Control: public, max-age=300
   ```

7. **Refresh the page** (within 5 minutes):
   - Click the same API request again
   - Check Response Headers:
   ```
   Look for:
   X-Cache: HIT            ✅ (Cached!)
   Cache-Control: public, max-age=300
   ```

8. **Compare Response Times**:
   - Look at "Time" column in Network tab
   - First request (MISS): ~100-250ms
   - Second request (HIT): ~10-30ms
   - **You should see 70-90% improvement!** ⚡

### Expected Results:

| Request | X-Cache | Response Time | Status |
|---------|---------|---------------|--------|
| 1st     | MISS    | 100-250ms     | ✅ Normal |
| 2nd     | HIT     | 10-30ms       | ✅ Cached |
| 3rd     | HIT     | 10-30ms       | ✅ Cached |
| After 5min | MISS | 100-250ms   | ✅ Cache expired |

---

## Method 2: Automated Test Script (5 minutes)

### Prerequisites:

```bash
# Install tsx if not already installed
npm install -D tsx
```

### Run the test:

```bash
# Make sure dev server is running
npm run dev

# In another terminal, run the test script:
npx tsx scripts/test-campaign-cache.ts
```

### What the script does:

1. Makes 5 sequential requests to campaign API
2. Measures response times
3. Checks X-Cache headers
4. Prints analysis and validation

### Expected Output:

```
🧪 Testing Campaign Cache Implementation

Target: http://localhost:3000/api/public/campaigns/development-demo/active

Making 5 requests...

Request 1:
  Cache Status: ❌ MISS
  Response Time: 156ms
  Status Code: 200
  Campaigns: 3
  Cache-Control: public, max-age=300

Request 2:
  Cache Status: ✅ HIT
  Response Time: 24ms
  Status Code: 200
  Campaigns: 3
  Cache-Control: public, max-age=300

Request 3:
  Cache Status: ✅ HIT
  Response Time: 18ms
  Status Code: 200
  Campaigns: 3
  Cache-Control: public, max-age=300

...

📊 Cache Analysis:

Total Requests: 5
Cache Hits: 4 (80%)
Cache Misses: 1 (20%)

Average Time (Cache MISS): 156ms
Average Time (Cache HIT): 21ms
Performance Improvement: 87% faster with cache ⚡

✅ Validation:

✅ First request is cache MISS (correct)
✅ 4 subsequent request(s) are cache HIT (correct)
✅ Cached responses are 87% faster (correct)

🎉 Cache test complete!
```

---

## Method 3: cURL Testing (Command Line)

### Simple test:

```bash
# First request (should be MISS)
curl -i http://localhost:3000/api/public/campaigns/YOUR_CHURCH_SLUG/active

# Look for in response headers:
# X-Cache: MISS

# Second request (within 5 minutes - should be HIT)
curl -i http://localhost:3000/api/public/campaigns/YOUR_CHURCH_SLUG/active

# Look for in response headers:
# X-Cache: HIT
```

### Timed test with response time:

```bash
# Measure first request time
time curl -s http://localhost:3000/api/public/campaigns/YOUR_CHURCH_SLUG/active > /dev/null

# real    0m0.156s  ← First request (MISS)

# Measure second request time (immediately after)
time curl -s http://localhost:3000/api/public/campaigns/YOUR_CHURCH_SLUG/active > /dev/null

# real    0m0.021s  ← Second request (HIT) - 87% faster!
```

---

## Method 4: Production Testing (After Deployment)

### Using Browser:

1. Visit your production donation page:
   ```
   https://yourdomain.com/donate/church-slug
   ```

2. Open DevTools → Network tab

3. Refresh page and check:
   - First load: `X-Cache: MISS`
   - Second load (within 5 min): `X-Cache: HIT`

### Using External Monitoring:

Set up simple uptime monitor:

```bash
# Uptime Robot (free tier)
# Add HTTP(S) monitor for:
https://yourdomain.com/api/public/campaigns/church-slug/active

# Check response time:
- First ping: ~150-300ms
- Subsequent pings: ~20-50ms (within 5 min)
```

---

## Troubleshooting

### Cache Always Shows MISS

**Possible Causes**:
1. **Waiting too long between requests** (> 5 minutes)
   - Solution: Test within 5 minutes

2. **Cache cleanup is clearing too aggressively**
   - Check: No errors in console
   - Verify: `setInterval` is running (10-minute cleanup)

3. **Different church IDs in requests**
   - Cache is per-church (by churchId, not slug)
   - Solution: Use same church slug

### No X-Cache Header

**Possible Causes**:
1. **Old code deployed**
   - Solution: Pull latest code, restart server

2. **API route not updated**
   - Check: `/app/api/public/campaigns/[churchSlug]/active/route.ts` has cache logic

3. **Headers not sent**
   - Verify: Response includes headers in route handler

### Cache Never Expires

**Possible Causes**:
1. **System clock issue**
   - Check: `Date.now()` returns correct time

2. **TTL too long**
   - Verify: `CACHE_TTL = 5 * 60 * 1000` (5 minutes)

3. **Cleanup not running**
   - Check console for errors in `setInterval`

---

## Performance Benchmarks

### Expected Performance Gains:

| Scenario | Without Cache | With Cache | Improvement |
|----------|---------------|------------|-------------|
| Single request | 150ms | 150ms | 0% (first request) |
| 10 requests/min | 1,500ms | 165ms | 89% |
| 100 requests/min | 15,000ms | 1,650ms | 89% |
| Peak traffic (Sunday) | High DB load | Minimal DB load | 95% reduction |

### Database Query Reduction:

```
Scenario: 100 donors visit in 5 minutes

Without cache:
- 100 requests × 4 campaigns each = 400 DB queries
- Connection pool usage: ~30-40 connections

With cache:
- 1st request: 4 DB queries (cache MISS)
- Next 99 requests: 0 DB queries (cache HIT)
- Total: 4 DB queries
- Connection pool usage: ~2-5 connections

Reduction: 99% fewer queries! 🎉
```

---

## Cache Invalidation Testing

### When to Test:

Test that cache is invalidated (cleared) when:
1. New donation is made
2. Campaign is created
3. Campaign is updated
4. Campaign is deleted

### How to Test:

```bash
# 1. Make first request (cache MISS)
curl http://localhost:3000/api/public/campaigns/church-slug/active
# X-Cache: MISS

# 2. Make second request (cache HIT)
curl http://localhost:3000/api/public/campaigns/church-slug/active
# X-Cache: HIT

# 3. Create/update a campaign (via admin panel)

# 4. Make third request (should be MISS again - cache invalidated)
curl http://localhost:3000/api/public/campaigns/church-slug/active
# X-Cache: MISS ← Cache was cleared!
```

**Note**: Cache invalidation is NOT yet implemented in current version.
This will be added when we migrate to Redis (Phase 2).

For now, cache expires after 5 minutes automatically.

---

## Monitoring Cache in Production

### Metrics to Track:

1. **Cache Hit Rate**:
   - Target: > 85%
   - Calculate: (HIT requests / Total requests) × 100

2. **Response Time**:
   - Cache MISS: 100-250ms (acceptable)
   - Cache HIT: 10-50ms (excellent)

3. **Database Load**:
   - Watch Supabase connection pool usage
   - Should drop significantly with cache

### Tools:

1. **Sentry Performance** (already set up):
   - Monitors API response times
   - Tracks slow transactions

2. **Vercel Analytics** (if using Vercel):
   - Shows API performance
   - Response time trends

3. **Custom Logging** (add later):
   ```typescript
   // Track cache metrics
   console.log('Cache stats:', {
     hits: cacheHits,
     misses: cacheMisses,
     hitRate: (cacheHits / (cacheHits + cacheMisses)) * 100
   });
   ```

---

## Quick Checklist

### Before Testing:
- [ ] Dev server is running (`npm run dev`)
- [ ] You have a valid church slug to test
- [ ] Browser DevTools is open (Network tab)

### During Testing:
- [ ] First request shows `X-Cache: MISS`
- [ ] Second request shows `X-Cache: HIT`
- [ ] Response time improves significantly (70-90%)
- [ ] Same data returned (no stale cache issues)

### After Testing:
- [ ] Document any issues found
- [ ] Test in production after deployment
- [ ] Monitor Sentry for errors
- [ ] Check Supabase connection usage

---

## FAQ

**Q: How long does cache last?**
A: 5 minutes (300 seconds)

**Q: Is cache shared between different churches?**
A: No, each church has separate cache (keyed by churchId)

**Q: What happens if cache has stale data?**
A: Cache expires after 5 minutes max. Acceptable for campaign data.

**Q: Can we clear cache manually?**
A: Not with in-memory cache. Redis would support manual invalidation.

**Q: Does cache work in production?**
A: Yes, works in both development and production.

**Q: What if cache breaks?**
A: API still works, just slower. Graceful degradation.

---

## Next Steps

### After Testing Successfully:

1. ✅ Deploy to production
2. ✅ Monitor in Sentry
3. ✅ Track performance improvements
4. ✅ Document cache hit rates

### Future Enhancements:

1. Migrate to Redis (distributed cache)
2. Add cache invalidation on data changes
3. Implement cache warming
4. Add cache metrics dashboard

---

**Need Help?** Check the implementation in:
- `/app/api/public/campaigns/[churchSlug]/active/route.ts`
- `/docs/future/REDIS_IMPLEMENTATION_PLAN.md`
