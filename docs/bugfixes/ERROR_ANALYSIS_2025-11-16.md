# Production Error Analysis - November 16, 2025

## Executive Summary

Three types of errors occurred in production on November 16, 2025:
1. **Connection Reset (P1017)** - Database connections closed unexpectedly
2. **Connection Pool Timeout (P2024)** - All 30 connections exhausted (CRITICAL)
3. **Unique Constraint Violations (P2002)** - User-facing data conflicts (handled correctly)

---

## Error Details

### 1. Connection Reset Errors (P1017)
**Time:** 2025-11-16 18:18:21 UTC
**Frequency:** Multiple occurrences
**Impact:** User requests failed

```
Error { kind: Io, cause: Some(Os { code: 104, kind: ConnectionReset, message: "Connection reset by peer" }) }
Server has closed the connection.
```

**Affected Operations:**
- `church.findUnique()` - Fetching church by slug
- `donationType.findMany()` - Loading donation types

**Root Cause:**
- PgBouncer connection timeout (likely in transaction mode)
- Network instability between Vercel and Supabase
- Query execution time exceeded timeout

**Current Mitigation:**
- ✅ Retry logic exists in `lib/db.ts` (withRetry function)
- ✅ Catches P1017 errors and retries up to 3 times

---

### 2. Connection Pool Timeout (P2024) - CRITICAL ⚠️
**Time:** 2025-11-16 19:07:37 UTC
**Impact:** Request timeout after 30 seconds
**Severity:** CRITICAL

```
Timed out fetching a new connection from the connection pool.
Current connection pool timeout: 30, connection limit: 30
```

**Root Cause:**
- **All 30 connections were in use simultaneously**
- Pool exhaustion means either:
  1. Too many concurrent requests for current pool size
  2. Slow queries holding connections too long
  3. Connections not being released properly (unlikely - code looks good)

**Current Configuration:**
```bash
DATABASE_URL=...?pgbouncer=true&connection_limit=30&pool_timeout=30
```

**Problem with Current Config:**
- `pool_timeout=30` is too long
- When pool is exhausted, requests wait 30 seconds before failing
- This causes cascading failures and request pileup

---

### 3. Unique Constraint Violations (P2002)
**Time:** Multiple occurrences (01:13:27, 01:46:01, 01:46:25 UTC)
**Impact:** User operations rejected with error message
**Severity:** LOW (handled correctly)

#### Donor Email Conflict
```
Unique constraint failed on the fields: (`email`)
```
**Location:** `lib/actions/donors.actions.ts:651`
**Handling:** ✅ Error caught and friendly message returned (line 664-677)
**User Message:** "A donor with this email address already exists."

#### Member Email Conflict
```
Unique constraint failed on the fields: (`churchId`,`email`)
```
**Location:** `app/api/members/route.ts:120`
**Handling:** ✅ Error caught, returns 409 status (line 141-146)
**User Message:** "Database constraint violation on churchId, email. Value might already exist."

**Status:** These errors are **expected behavior** when users try to:
- Update donor to an email that already exists
- Create member with existing email in the same church

---

## Recommended Actions

### IMMEDIATE (Within 24 hours)

#### 1. Update Connection Pool Timeout in Vercel ⚡

**Action:** Update `DATABASE_URL` environment variable in Vercel

**Current:**
```bash
connection_limit=30&pool_timeout=30
```

**Recommended:**
```bash
connection_limit=30&pool_timeout=10
```

**Benefits:**
- Faster failure detection (10s instead of 30s)
- Prevents request pileup when pool is exhausted
- Retry logic kicks in sooner
- Better user experience (faster error vs 30s hang)

**How to Update:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Find `DATABASE_URL` variable
3. Update the connection string to use `pool_timeout=10`
4. Redeploy

---

#### 2. Add Connection Pool Monitoring

**Action:** Deploy the connection pool monitor created in this session

**File Created:** `lib/monitoring/connection-pool-monitor.ts`

**Usage Example:**
```typescript
import { trackQuery } from '@/lib/monitoring/connection-pool-monitor';

// Wrap database queries to track performance
const churches = await trackQuery('GET /api/churches', async () => {
  return await prisma.church.findMany();
});
```

**Create Health Check Endpoint:**
```typescript
// app/api/health/db/route.ts
import { poolMonitor } from '@/lib/monitoring/connection-pool-monitor';
import { checkDatabaseHealth } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const poolStatus = poolMonitor.getHealthStatus();
  const dbHealth = await checkDatabaseHealth();

  return NextResponse.json({
    database: dbHealth,
    connectionPool: poolStatus,
    timestamp: new Date().toISOString(),
  });
}
```

**Benefits:**
- Track slow queries (>1 second)
- Monitor connection pool utilization
- Identify bottlenecks before they cause outages

---

### SHORT-TERM (Within 1 week)

#### 3. Identify and Optimize Slow Queries

**Action:** Add logging to identify which queries are holding connections

**Add to critical routes:**
```typescript
import { trackQuery } from '@/lib/monitoring/connection-pool-monitor';

// Example: Landing page church lookup
export async function GET(request: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { slug } = params;

  const church = await trackQuery(`GET /landing/${slug}`, async () => {
    return await withRetry(async () => {
      return await prisma.church.findUnique({
        where: { slug },
        include: {
          // ... relations
        },
      });
    });
  });
}
```

**Queries to Monitor:**
- Landing page church lookups (18:18:21 errors)
- Dashboard queries with multiple includes
- Email campaign sends (batch operations)
- Report generation queries

---

#### 4. Consider Connection Pool Increase

**Current:** 30 connections (Supabase Pro limit)

**Options:**
1. **Upgrade to Supabase Team Plan** - 60 connections ($599/month)
2. **Optimize queries first** - May not need more connections
3. **Implement query caching** - Reduce database load

**Decision Matrix:**
- If errors persist after optimization → Consider upgrade
- If errors stop after timeout fix → Current pool is sufficient

---

### MEDIUM-TERM (Within 2 weeks)

#### 5. Implement Query Caching for Landing Pages

**Problem:** Landing page lookups hit DB on every request
**Solution:** Cache church data in Redis or Vercel KV

**Example with Vercel KV:**
```typescript
import { kv } from '@vercel/kv';

async function getChurchBySlug(slug: string) {
  // Try cache first
  const cached = await kv.get(`church:${slug}`);
  if (cached) return cached;

  // Cache miss - query database
  const church = await prisma.church.findUnique({
    where: { slug },
    include: { /* ... */ },
  });

  // Cache for 5 minutes
  if (church) {
    await kv.set(`church:${slug}`, church, { ex: 300 });
  }

  return church;
}
```

**Benefits:**
- Reduces database load significantly
- Faster response times
- Fewer connections needed
- Landing pages won't cause pool exhaustion

---

#### 6. Add Database Query Logging in Production

**Action:** Enable slow query logging

**Update `lib/db.ts`:**
```typescript
const client = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

// Log slow queries
client.$on('query', (e) => {
  if (e.duration > 1000) { // > 1 second
    console.warn('[Slow Query]', {
      query: e.query,
      duration: `${e.duration}ms`,
      params: e.params,
    });
  }
});
```

---

### LONG-TERM (Within 1 month)

#### 7. Implement Read Replicas (if needed)

**When:** If pool exhaustion continues despite optimizations

**Solution:** Use Supabase read replicas for read-heavy operations
- Landing pages read from replica
- Dashboard analytics read from replica
- Write operations use primary database

**Cost:** Additional $599/month for read replica

---

## Error Handling Status

### ✅ Already Handled Correctly

1. **Connection Errors (P1017, P2024)**
   - File: `lib/db.ts:54-65`
   - Retry logic: Up to 3 retries with exponential backoff
   - Status: Working as intended

2. **Donor Email Conflicts (P2002)**
   - File: `lib/actions/donors.actions.ts:664-677`
   - User message: "A donor with this email address already exists."
   - Status: Working correctly

3. **Member Email Conflicts (P2002)**
   - File: `app/api/members/route.ts:141-146`
   - HTTP 409 with clear error message
   - Status: Working correctly

### ⚠️ Needs Improvement

1. **Connection Pool Timeout**
   - Current: 30 second wait (too long)
   - Recommended: 10 second timeout
   - Action: Update environment variable

2. **No Monitoring**
   - Current: Only error logs after failure
   - Recommended: Proactive monitoring
   - Action: Deploy connection pool monitor

---

## Monitoring Checklist

After implementing fixes, monitor these metrics:

- [ ] P2024 errors (should be zero after timeout reduction)
- [ ] P1017 errors (should be minimal, occasional network issue okay)
- [ ] Average database query time (< 100ms for simple queries)
- [ ] Connection pool utilization (< 80% during normal load)
- [ ] Slow queries (> 1 second)
- [ ] Cache hit rate (if implementing caching)

---

## Timeline

| Priority | Action | Timeframe | Owner |
|----------|--------|-----------|-------|
| 🔥 CRITICAL | Update pool_timeout to 10s | Today | DevOps |
| ⚡ HIGH | Deploy connection monitor | This week | Backend |
| 📊 MEDIUM | Add query tracking | 1 week | Backend |
| 🚀 MEDIUM | Implement caching | 2 weeks | Backend |
| 💰 LOW | Consider pool upgrade | If needed | Product |

---

## Success Criteria

**Week 1:**
- Zero P2024 errors in production
- P1017 errors reduced by 80%

**Week 2:**
- Slow query log established
- Top 3 slow queries identified and optimized

**Week 4:**
- Connection pool utilization < 60% during peak load
- Average response time < 200ms for all API endpoints

---

## Related Files

- `lib/db.ts` - Database client with retry logic
- `lib/monitoring/connection-pool-monitor.ts` - NEW monitoring utility
- `lib/actions/donors.actions.ts` - Donor operations with P2002 handling
- `app/api/members/route.ts` - Member creation with P2002 handling
- `.env.local` - Local database configuration
- Vercel Environment Variables - Production DATABASE_URL

---

## Questions for Team

1. What is the typical concurrent user count during peak hours?
2. Are landing pages experiencing slow load times?
3. Should we prioritize caching or connection pool increase?
4. Budget available for Supabase upgrade if needed?

---

**Last Updated:** 2025-11-16
**Next Review:** After implementing immediate actions (2025-11-18)
