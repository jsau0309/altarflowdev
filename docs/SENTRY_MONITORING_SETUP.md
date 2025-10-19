# Sentry Monitoring & Alerting Setup Guide

**Last Updated**: October 17, 2025
**Purpose**: Configure production alerts for campaign API and critical errors

---

## Current Sentry Status

✅ **Sentry is already installed** in your project:
- Client config: `sentry.client.config.ts`
- Server config: `sentry.server.config.ts`
- Edge config: `sentry.edge.config.ts`
- Helper utilities: `lib/sentry.ts`

❓ **Alert Rules Status**: Need to verify and configure

---

## Step 1: Verify Sentry Is Working

### Check Your Sentry Dashboard

1. **Go to**: https://sentry.io (log in to your account)
2. **Navigate to**: Your AltarFlow project
3. **Check**:
   - Issues tab: Are errors being captured?
   - Performance tab: Are transactions being tracked?
   - Releases tab: Are deployments tagged?

### Test Error Capture (Quick Test)

Create a test endpoint to verify Sentry is capturing errors:

**File**: `/app/api/test-sentry/route.ts`

```typescript
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function GET() {
  // Test 1: Manual error capture
  Sentry.captureMessage('Sentry test message - monitoring is working!', 'info');

  // Test 2: Exception capture
  try {
    throw new Error('Test error for Sentry - please ignore');
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        test: 'true',
        endpoint: '/api/test-sentry',
      }
    });
  }

  return NextResponse.json({
    message: 'Sentry test completed. Check your Sentry dashboard in ~30 seconds.',
  });
}
```

**Test it**:
```bash
# In browser or terminal:
curl http://localhost:3000/api/test-sentry

# Then check Sentry dashboard after 30 seconds
```

---

## Step 2: Set Up Alert Rules in Sentry

### Critical Alerts (Must Have)

#### 1. Campaign API Errors

**Purpose**: Alert when campaign API fails
**Urgency**: High (affects donations)

**Setup in Sentry**:
1. Go to **Alerts** → **Create Alert Rule**
2. Configure:
   ```
   Name: Campaign API Errors
   Environment: production

   When:
     An event is captured by Sentry

   If:
     The event's tags match ALL of these filters:
       api.endpoint equals /api/public/campaigns/[churchSlug]/active
       error.type equals campaign_fetch_error

   Then:
     Send notification to: #alerts-critical (Slack)
     or: engineering@yourdomain.com (Email)
     or: Your phone (SMS - paid feature)

   Alert Rate Limit: 5 alerts per hour
   ```

3. **Action Levels**:
   - **Critical**: Any error in production
   - **Warning**: > 5 errors per hour
   - **Info**: Performance degradation (> 1s response time)

#### 2. High Error Rate

**Purpose**: Alert when error rate spikes
**Urgency**: High

**Setup**:
```
Name: High Error Rate
When: An event is captured by Sentry
If:
  - Event frequency is above 10 events in 1 minute
  - Environment is production
Then: Send notification immediately
```

#### 3. Database Connection Errors

**Purpose**: Alert when DB connections fail
**Urgency**: Critical

**Setup**:
```
Name: Database Connection Failures
When: An event is captured by Sentry
If:
  - Message contains: "connection" or "pool" or "timeout"
  - Environment is production
Then: Send notification to on-call engineer
```

#### 4. Stripe Payment Errors

**Purpose**: Alert when payment processing fails
**Urgency**: Critical (revenue impact)

**Setup**:
```
Name: Payment Processing Failures
When: An event is captured by Sentry
If:
  - Tags match: error.type equals payment
  - Environment is production
Then: Send notification immediately
```

---

## Step 3: Performance Monitoring Alerts

### Slow API Responses

**Purpose**: Alert when API response times degrade
**Urgency**: Medium

**Setup in Sentry Performance**:
1. Go to **Performance** → **Alerts** → **Create Alert**
2. Configure:
   ```
   Name: Slow Campaign API Response

   When: Transaction duration is above 1000ms
   If: Transaction name contains: /api/public/campaigns
   Then: Send notification

   Frequency: Alert when 10+ transactions are slow in 5 minutes
   ```

### High Cache Miss Rate (Future)

**Purpose**: Alert when cache isn't working
**Note**: Requires custom instrumentation

```typescript
// Add to campaign API route.ts
const cacheHitRate = (cacheHits / totalRequests) * 100;

if (cacheHitRate < 70) {
  Sentry.captureMessage(`Low cache hit rate: ${cacheHitRate}%`, {
    level: 'warning',
    tags: {
      'cache.hit_rate': cacheHitRate.toString(),
    }
  });
}
```

---

## Step 4: Set Up Notification Channels

### Option 1: Email Notifications (Free)

**Setup**:
1. Sentry Dashboard → **Settings** → **Teams** → **Your Team**
2. Add team members' emails
3. Configure alert rules to email the team

**Pros**: Free, simple
**Cons**: Slower response time

### Option 2: Slack Integration (Recommended)

**Setup**:
1. Sentry Dashboard → **Settings** → **Integrations**
2. Search for "Slack" → **Install**
3. Authorize Sentry to access your Slack workspace
4. Choose channel (e.g., `#alerts-production`)
5. Configure which alerts go to which channels:
   - `#alerts-critical`: Campaign errors, payment failures
   - `#alerts-warnings`: Performance issues, high error rates
   - `#alerts-info`: Deployment notifications

**Pros**: Real-time, team visibility, threaded discussions
**Cons**: Slack workspace required

### Option 3: SMS/Phone (Paid, for Critical Only)

**Setup**:
1. Requires Sentry Business plan ($80/month)
2. Add phone numbers to on-call schedule
3. Configure PagerDuty or Opsgenie integration

**Use for**: Production down, revenue-impacting errors only

---

## Step 5: Custom Alerts for Campaign-Specific Issues

### Alert: Campaign Goal Reached but Still Active

**Purpose**: Catch logic errors where campaigns don't auto-close

**Implementation**: Add monitoring to campaign API

```typescript
// In campaign API route after computing results
const stuckCampaigns = results.filter(c =>
  c.isActive &&
  c.goalAmount &&
  c.raised >= c.goalAmount
);

if (stuckCampaigns.length > 0) {
  Sentry.captureMessage('Campaigns not auto-closing after goal reached', {
    level: 'warning',
    contexts: {
      campaigns: {
        count: stuckCampaigns.length,
        ids: stuckCampaigns.map(c => c.id),
      }
    }
  });
}
```

### Alert: High Cache Invalidation Rate

**Purpose**: Detect if cache is being cleared too frequently

```typescript
// Track cache invalidations
let cacheInvalidations = 0;
const INVALIDATION_THRESHOLD = 100; // per hour

export async function invalidateCache(churchId: string) {
  cacheInvalidations++;

  if (cacheInvalidations > INVALIDATION_THRESHOLD) {
    Sentry.captureMessage('High cache invalidation rate', {
      level: 'warning',
      tags: {
        'cache.invalidations': cacheInvalidations.toString(),
      }
    });
  }

  // ... actual invalidation logic
}

// Reset counter every hour
setInterval(() => {
  cacheInvalidations = 0;
}, 60 * 60 * 1000);
```

---

## Step 6: Sentry Release Tracking

### Tag Deployments

**Purpose**: Correlate errors with specific deployments

**Setup in Vercel** (automatic):
1. Vercel automatically tags Sentry releases
2. Check `sentry.properties` file exists in project root

**Manual Setup** (if needed):
```bash
# In package.json scripts
{
  "build": "sentry-cli releases new $npm_package_version && next build"
}
```

**Benefits**:
- See which deployment introduced an error
- Track error rates per release
- Automatically create Sentry issues for new errors

---

## Step 7: Health Check Endpoint

### Create Health Check with Sentry Integration

**File**: `/app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';

export async function GET() {
  const checks = {
    database: false,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        'health_check': 'database',
        'critical': 'true',
      }
    });
  }

  const isHealthy = checks.database;

  if (!isHealthy) {
    return NextResponse.json(checks, { status: 503 });
  }

  return NextResponse.json(checks, { status: 200 });
}
```

**Set up external monitoring**:
- UptimeRobot (free): Ping `/api/health` every 5 minutes
- Alert if returns 503 or times out

---

## Step 8: Dashboard Setup

### Create Custom Sentry Dashboard

1. Go to **Dashboards** → **Create Dashboard**
2. Name: "AltarFlow Production Health"
3. Add widgets:

**Widget 1: Error Rate**
```
Type: Line Chart
Query: event.type:error
Grouped by: 1 hour
```

**Widget 2: Campaign API Performance**
```
Type: Area Chart
Query: transaction:/api/public/campaigns*
Y-axis: avg(transaction.duration)
```

**Widget 3: Top Errors**
```
Type: Table
Query: event.type:error
Columns: error.type, count, last_seen
Order by: count descending
Limit: 10
```

**Widget 4: Cache Performance (Custom)**
```
Type: Number
Query: Custom metric: cache_hit_rate
Display: Big Number with trend
```

---

## Step 9: Alert Testing Checklist

### Before Going to Production:

- [ ] Test Sentry is capturing errors (`/api/test-sentry`)
- [ ] Verify alerts are sent to correct channels
- [ ] Test alert escalation (who gets paged?)
- [ ] Confirm alert rate limits work (no spam)
- [ ] Test muting/silencing during maintenance
- [ ] Document on-call procedures

### Test Each Alert:

```bash
# 1. Test campaign API error alert
curl -X POST http://localhost:3000/api/test-alerts/campaign-error

# 2. Test high error rate alert
# Trigger 20 errors in 1 minute

# 3. Test slow response alert
# Make API call with artificial delay

# 4. Verify alert appears in Slack/Email within 2 minutes
```

---

## Step 10: Runbook for Alerts

### When You Receive: "Campaign API Errors"

**Severity**: High
**Impact**: Donors cannot see campaigns

**Immediate Actions**:
1. Check Sentry issue for error details
2. Look at recent deployments (was this introduced today?)
3. Check Supabase dashboard for DB issues
4. Review campaign API logs

**Debugging Steps**:
```bash
# 1. Check if issue is widespread or church-specific
# Look at error tags in Sentry for churchSlug

# 2. Test the API manually
curl https://yourdomain.com/api/public/campaigns/CHURCH_SLUG/active

# 3. Check cache status
# Look for "X-Cache" header in response

# 4. Verify database connectivity
# Check Supabase connection pool stats

# 5. Review recent code changes
git log --oneline --since="2 hours ago" -- app/api/public/campaigns
```

**Escalation**:
- If DB connections maxed out → Scale database
- If API consistently > 1s → Investigate slow queries
- If cache not working → Check cache cleanup logic

---

## Monitoring Costs

### Sentry Pricing Tiers

**Developer Plan** (Current - Free):
- 5,000 errors/month
- 10,000 transactions/month
- 1 project
- Basic alerts

**Team Plan** ($26/month):
- 50,000 errors/month
- 100,000 transactions/month
- Unlimited projects
- Advanced alerts
- Slack/email integrations

**Business Plan** ($80/month):
- 500,000 errors/month
- 500,000 transactions/month
- SMS/phone alerts
- PagerDuty integration
- SLA guarantees

**Recommendation for 30 Churches**: Start with **Team Plan** ($26/month)

---

## Quick Reference: Alert Priority Matrix

| Alert | Severity | Response Time | Notification |
|-------|----------|---------------|--------------|
| Payment failure | Critical | Immediate | SMS + Slack |
| Campaign API down | Critical | < 5 min | Slack + Email |
| High error rate | High | < 15 min | Slack |
| Slow API response | Medium | < 1 hour | Email |
| Cache miss rate low | Low | < 4 hours | Dashboard only |

---

## Next Steps

### Immediate (This Week):
1. [ ] Test Sentry error capture with `/api/test-sentry`
2. [ ] Configure Slack integration
3. [ ] Set up 3 critical alert rules (Campaign API, Payments, High Error Rate)
4. [ ] Create production health dashboard

### Short-term (Next 2 Weeks):
1. [ ] Add performance alerts for slow API responses
2. [ ] Set up UptimeRobot for `/api/health` monitoring
3. [ ] Document on-call procedures
4. [ ] Test alert escalation paths

### Long-term (Next Month):
1. [ ] Implement custom metrics for cache hit rate
2. [ ] Add business metrics tracking (donations processed, campaigns active)
3. [ ] Create weekly error review process
4. [ ] Set up automated error triaging

---

## Additional Resources

- [Sentry Alerts Documentation](https://docs.sentry.io/product/alerts/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Sentry Slack Integration](https://docs.sentry.io/product/integrations/notification-incidents/slack/)
- [Sentry Best Practices](https://docs.sentry.io/platforms/javascript/guides/nextjs/best-practices/)

---

**Questions?** Contact DevOps team or check Sentry documentation.
