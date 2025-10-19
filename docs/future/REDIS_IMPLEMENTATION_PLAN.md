# Redis Implementation Plan for AltarFlow

**Status**: Future Enhancement
**Priority**: Medium
**Estimated Timeline**: 2-4 weeks
**Target Date**: Q2 2025 (when scaling to 100+ organizations)

---

## Executive Summary

This document outlines the comprehensive plan to integrate Redis caching into AltarFlow for improved performance, scalability, and support for usage-based pricing features.

### Key Goals:
1. **Campaign Caching**: Replace in-memory cache with distributed Redis cache
2. **Usage-Based Pricing**: Track and meter API usage, donations, emails, SMS
3. **Rate Limiting**: Implement per-church API rate limits
4. **Session Management**: Improve session storage and performance
5. **Real-Time Features**: Enable pub/sub for live updates

---

## Current State vs. Future State

### Current (In-Memory Cache)
- ✅ Simple 5-minute in-memory cache
- ✅ Works for single server instance
- ❌ Not shared across multiple servers
- ❌ Lost on server restart
- ❌ No usage tracking capabilities
- ❌ No rate limiting

### Future (Redis)
- ✅ Distributed cache shared across all servers
- ✅ Persists across restarts
- ✅ Advanced features: rate limiting, pub/sub, usage tracking
- ✅ Horizontal scaling ready
- ✅ Foundation for usage-based pricing

---

## Phase 1: Redis Setup & Infrastructure (Week 1)

### 1.1 Choose Redis Provider

**Recommended: Upstash Redis** (Best for Vercel deployments)
- Serverless Redis with automatic scaling
- Pay-per-request pricing (perfect for startups)
- Global edge caching
- Built-in rate limiting
- Easy Vercel integration

**Alternative: Redis Cloud** (More traditional)
- Fixed monthly pricing
- More predictable costs at scale
- Better for high-volume usage

**Cost Comparison** (30 churches, 4 campaigns each):
```
Upstash: ~$10-20/month (pay-per-request)
Redis Cloud: ~$15-30/month (fixed instance)
```

### 1.2 Install Dependencies

```bash
npm install @upstash/redis
npm install @upstash/ratelimit
npm install ioredis @types/ioredis  # If using Redis Cloud
```

### 1.3 Environment Variables

Add to `.env.local`:
```bash
# Redis Configuration
REDIS_URL="redis://..."
REDIS_TOKEN="..."  # For Upstash

# Cache Configuration
REDIS_CACHE_TTL=300  # 5 minutes default
REDIS_CACHE_ENABLED=true

# Rate Limiting
REDIS_RATE_LIMIT_ENABLED=true
REDIS_RATE_LIMIT_MAX_REQUESTS=100  # per window
REDIS_RATE_LIMIT_WINDOW=60  # seconds
```

### 1.4 Create Redis Client Utility

**File**: `/lib/redis.ts`

```typescript
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Redis client
export const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

// Create rate limiter
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    parseInt(process.env.REDIS_RATE_LIMIT_MAX_REQUESTS || '100'),
    `${process.env.REDIS_RATE_LIMIT_WINDOW || '60'} s`
  ),
  analytics: true,
  prefix: 'altarflow',
});

// Cache key builders
export const cacheKeys = {
  activeCampaigns: (churchId: string) => `campaigns:active:${churchId}`,
  campaignStats: (campaignId: string) => `campaign:stats:${campaignId}`,
  churchUsage: (churchId: string, month: string) => `usage:${churchId}:${month}`,
  emailQuota: (churchId: string, month: string) => `quota:email:${churchId}:${month}`,
  smsQuota: (churchId: string, month: string) => `quota:sms:${churchId}:${month}`,
};

// Helper: Get or compute cached value
export async function getCachedOrCompute<T>(
  key: string,
  computeFn: () => Promise<T>,
  ttl: number = 300 // 5 minutes default
): Promise<T> {
  // Try to get from cache
  const cached = await redis.get<T>(key);
  if (cached) return cached;

  // Compute and cache
  const value = await computeFn();
  await redis.setex(key, ttl, JSON.stringify(value));
  return value;
}

// Helper: Invalidate cache by pattern
export async function invalidateCachePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

---

## Phase 2: Campaign Caching with Redis (Week 1-2)

### 2.1 Update Campaign API to Use Redis

**File**: `/app/api/public/campaigns/[churchSlug]/active/route.ts`

Replace in-memory cache with Redis:

```typescript
import { redis, cacheKeys, getCachedOrCompute } from '@/lib/redis';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ churchSlug: string }> }
) {
  try {
    const { churchSlug } = await params;

    const church = await prisma.church.findUnique({
      where: { slug: churchSlug },
      select: { id: true },
    });

    if (!church) {
      return NextResponse.json({ error: 'Church not found' }, { status: 404 });
    }

    // Use Redis cache instead of in-memory
    const cacheKey = cacheKeys.activeCampaigns(church.id);

    const activeCampaigns = await getCachedOrCompute(
      cacheKey,
      async () => {
        // Existing campaign fetching logic...
        const campaigns = await prisma.campaign.findMany({
          where: { churchId: church.id },
          orderBy: { createdAt: 'desc' },
        });

        // ... rest of computation logic

        return active;
      },
      300 // 5 minutes TTL
    );

    return NextResponse.json(activeCampaigns, {
      headers: {
        'X-Cache': 'REDIS',
        'Cache-Control': 'public, max-age=300',
      }
    });
  } catch (error) {
    // Sentry error tracking...
  }
}
```

### 2.2 Cache Invalidation Strategy

**Invalidate cache when:**
1. New donation is made
2. Campaign is created/updated/deleted
3. Campaign dates change

**File**: `/lib/actions/fundraising-campaigns.actions.ts`

Add cache invalidation:

```typescript
import { redis, cacheKeys, invalidateCachePattern } from '@/lib/redis';

export async function createFundraisingCampaign(input: UpsertInput) {
  // ... existing creation logic

  // Invalidate cache
  const churchId = await getChurchUuid(input.clerkOrgId);
  await redis.del(cacheKeys.activeCampaigns(churchId));

  return { success: true, id: created.id };
}

export async function updateFundraisingCampaign(clerkOrgId: string, id: string, input: UpsertInput) {
  // ... existing update logic

  // Invalidate cache
  const churchId = await getChurchUuid(clerkOrgId);
  await redis.del(cacheKeys.activeCampaigns(churchId));

  return { success: true };
}
```

**File**: `/app/api/webhooks/stripe/route.ts` (Stripe donation webhook)

```typescript
// After successful donation processing
if (event.type === 'payment_intent.succeeded') {
  // ... existing logic

  // Invalidate campaign cache if donation is linked to campaign
  if (donationTransaction.campaignId) {
    const churchId = donationTransaction.churchId;
    await redis.del(cacheKeys.activeCampaigns(churchId));

    // Also invalidate specific campaign stats
    await redis.del(cacheKeys.campaignStats(donationTransaction.campaignId));
  }
}
```

---

## Phase 3: Usage-Based Pricing Foundation (Week 2-3)

### 3.1 Usage Tracking Architecture

**Metrics to Track:**
1. **API Requests**: Track per-church API calls
2. **Donations Processed**: Count + total volume
3. **Emails Sent**: Already tracked in EmailQuota, enhance with Redis
4. **SMS Sent**: Track Twilio usage
5. **Active Campaigns**: Count of concurrent campaigns
6. **Storage Used**: Track file uploads, receipts

### 3.2 Usage Tracking Implementation

**File**: `/lib/usage-tracking.ts`

```typescript
import { redis, cacheKeys } from './redis';

export type UsageMetric =
  | 'api_request'
  | 'donation_processed'
  | 'email_sent'
  | 'sms_sent'
  | 'storage_used'
  | 'campaign_created';

export async function trackUsage(
  churchId: string,
  metric: UsageMetric,
  value: number = 1,
  metadata?: Record<string, any>
) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Increment monthly counter
  const usageKey = `usage:${churchId}:${monthKey}:${metric}`;
  await redis.incrby(usageKey, value);

  // Set expiry (90 days for historical data)
  await redis.expire(usageKey, 90 * 24 * 60 * 60);

  // Store detailed event (optional, for analytics)
  if (metadata) {
    const eventKey = `event:${churchId}:${metric}:${Date.now()}`;
    await redis.setex(eventKey, 30 * 24 * 60 * 60, JSON.stringify({
      metric,
      value,
      timestamp: now.toISOString(),
      ...metadata
    }));
  }
}

export async function getUsage(
  churchId: string,
  metric: UsageMetric,
  month?: string
) {
  const monthKey = month ||
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const usageKey = `usage:${churchId}:${monthKey}:${metric}`;
  const usage = await redis.get<number>(usageKey);

  return usage || 0;
}

export async function getAllUsage(churchId: string, month?: string) {
  const monthKey = month ||
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const metrics: UsageMetric[] = [
    'api_request',
    'donation_processed',
    'email_sent',
    'sms_sent',
    'storage_used',
    'campaign_created'
  ];

  const usage: Record<UsageMetric, number> = {} as any;

  await Promise.all(
    metrics.map(async (metric) => {
      const value = await getUsage(churchId, metric, month);
      usage[metric] = value;
    })
  );

  return usage;
}
```

### 3.3 Usage Tracking Middleware

**File**: `/middleware/track-usage.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { trackUsage } from '@/lib/usage-tracking';

export async function withUsageTracking(
  request: NextRequest,
  handler: () => Promise<NextResponse>
) {
  // Extract church ID from request (from auth, headers, etc.)
  const churchId = extractChurchId(request);

  // Track API request
  if (churchId) {
    await trackUsage(churchId, 'api_request', 1, {
      path: request.nextUrl.pathname,
      method: request.method,
    });
  }

  // Execute handler
  const response = await handler();

  return response;
}

function extractChurchId(request: NextRequest): string | null {
  // From auth token, session, or URL parameter
  // Implementation depends on your auth setup
  return null;
}
```

### 3.4 Track Donations

**File**: `/app/api/webhooks/stripe/route.ts`

```typescript
if (event.type === 'payment_intent.succeeded') {
  // ... existing logic

  // Track donation in usage
  await trackUsage(
    donationTransaction.churchId,
    'donation_processed',
    donationTransaction.amount, // Track amount in cents
    {
      donationId: donationTransaction.id,
      campaignId: donationTransaction.campaignId,
      paymentMethod: paymentIntent.payment_method_types[0],
    }
  );
}
```

### 3.5 Usage-Based Pricing Tiers (Future)

**Pricing Structure Example:**

```typescript
// File: /lib/pricing-tiers.ts

export const pricingTiers = {
  free: {
    name: 'Free',
    basePrice: 0,
    limits: {
      api_requests: 10000,      // per month
      donations: Infinity,       // unlimited
      emails: 100,               // per month
      sms: 0,                    // none
      campaigns: 2,              // concurrent
      storage: 1 * 1024 * 1024 * 1024, // 1 GB
    },
  },
  starter: {
    name: 'Starter',
    basePrice: 49,  // $49/month
    limits: {
      api_requests: 50000,
      donations: Infinity,
      emails: 1000,
      sms: 100,
      campaigns: 5,
      storage: 5 * 1024 * 1024 * 1024, // 5 GB
    },
  },
  growth: {
    name: 'Growth',
    basePrice: 99,  // $99/month
    limits: {
      api_requests: 200000,
      donations: Infinity,
      emails: 5000,
      sms: 500,
      campaigns: Infinity,
      storage: 20 * 1024 * 1024 * 1024, // 20 GB
    },
    overageRates: {
      api_requests: 0.0001,  // $0.10 per 1000 requests
      emails: 0.01,          // $0.01 per email
      sms: 0.05,             // $0.05 per SMS
    },
  },
  enterprise: {
    name: 'Enterprise',
    basePrice: 299,  // $299/month
    limits: {
      api_requests: Infinity,
      donations: Infinity,
      emails: Infinity,
      sms: Infinity,
      campaigns: Infinity,
      storage: 100 * 1024 * 1024 * 1024, // 100 GB
    },
    customPricing: true,
  },
};

export async function calculateMonthlyBill(
  churchId: string,
  tier: keyof typeof pricingTiers,
  month: string
) {
  const tierConfig = pricingTiers[tier];
  const usage = await getAllUsage(churchId, month);

  let total = tierConfig.basePrice;

  // Calculate overages if applicable
  if (tierConfig.overageRates) {
    const emailOverage = Math.max(0, usage.email_sent - tierConfig.limits.emails);
    const smsOverage = Math.max(0, usage.sms_sent - tierConfig.limits.sms);
    const apiOverage = Math.max(0, usage.api_request - tierConfig.limits.api_requests);

    total += emailOverage * tierConfig.overageRates.emails;
    total += smsOverage * tierConfig.overageRates.sms;
    total += apiOverage * tierConfig.overageRates.api_requests;
  }

  return {
    basePrice: tierConfig.basePrice,
    overages: total - tierConfig.basePrice,
    total,
    usage,
  };
}
```

---

## Phase 4: Rate Limiting (Week 3)

### 4.1 API Rate Limiting

**File**: `/middleware/rate-limit.ts`

```typescript
import { ratelimit } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';

export async function withRateLimit(
  request: NextRequest,
  identifier: string, // churchId or IP
  handler: () => Promise<NextResponse>
) {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }

  const response = await handler();

  // Add rate limit headers to successful responses
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());

  return response;
}
```

### 4.2 Apply Rate Limiting to Campaign API

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ churchSlug: string }> }
) {
  return withRateLimit(request, `campaign:${churchSlug}`, async () => {
    // ... existing campaign logic
  });
}
```

---

## Phase 5: Real-Time Features (Week 4)

### 5.1 Pub/Sub for Live Campaign Updates

**Use Case**: Show live donation updates on church donation pages

```typescript
// File: /lib/redis-pubsub.ts

export async function publishCampaignUpdate(
  campaignId: string,
  update: {
    type: 'new_donation' | 'goal_reached' | 'campaign_ended';
    data: any;
  }
) {
  await redis.publish(`campaign:${campaignId}:updates`, JSON.stringify(update));
}

// Subscribe to updates (for real-time dashboard)
export async function subscribeToCampaign(
  campaignId: string,
  callback: (update: any) => void
) {
  // Implementation depends on your real-time setup (Pusher, Socket.io, etc.)
  // Redis pub/sub acts as the message broker
}
```

---

## Migration Plan

### Week 1: Foundation
- [ ] Set up Redis instance (Upstash or Redis Cloud)
- [ ] Install dependencies
- [ ] Create Redis client utility
- [ ] Test connection and basic operations

### Week 2: Campaign Caching
- [ ] Implement Redis caching for campaigns
- [ ] Add cache invalidation logic
- [ ] Test caching performance
- [ ] Monitor cache hit rates

### Week 3: Usage Tracking
- [ ] Implement usage tracking infrastructure
- [ ] Add tracking to key operations (donations, emails, API calls)
- [ ] Create usage dashboard UI
- [ ] Test usage reporting

### Week 4: Rate Limiting & Polish
- [ ] Implement rate limiting middleware
- [ ] Apply to public APIs
- [ ] Add monitoring and alerts
- [ ] Documentation and team training

---

## Monitoring & Observability

### Key Metrics to Track:

1. **Cache Performance**
   - Cache hit rate (target: >90%)
   - Average response time (with vs without cache)
   - Cache memory usage

2. **Usage Tracking**
   - API requests per church
   - Donation volume and count
   - Email/SMS usage

3. **Rate Limiting**
   - Rate limit hits per church
   - Average requests per minute
   - Top API consumers

### Sentry Integration

```typescript
// Add custom breadcrumbs for Redis operations
Sentry.addBreadcrumb({
  category: 'redis',
  message: 'Cache miss - fetching from DB',
  level: 'info',
  data: { cacheKey, operation: 'get' }
});
```

---

## Cost Estimation

### Upstash Redis (Recommended for initial 30 churches)

**Pricing**: Pay-per-request
- First 10,000 requests/day: Free
- Additional requests: $0.20 per 100K requests

**Estimated Monthly Cost** (30 churches):
- Campaign API: ~300K requests/month = $0.60
- Usage tracking: ~100K writes/month = $0.20
- Rate limiting: ~50K checks/month = $0.10
- **Total: ~$1-5/month** (very affordable!)

### Redis Cloud (For 100+ churches)

**Pricing**: Fixed instance
- 30 MB memory: $15/month
- 100 MB memory: $30/month

---

## Rollback Plan

If Redis causes issues:

1. **Feature Flag**: Add `REDIS_ENABLED=false` env var
2. **Fallback**: Keep in-memory cache as fallback
3. **Graceful Degradation**: API works without Redis (just slower)

```typescript
// In redis.ts
export const redis = process.env.REDIS_ENABLED === 'true'
  ? new Redis({ url: process.env.REDIS_URL!, token: process.env.REDIS_TOKEN! })
  : null;

// In getCachedOrCompute
export async function getCachedOrCompute<T>(
  key: string,
  computeFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  if (!redis) {
    // Fallback: just compute without caching
    return await computeFn();
  }

  // ... rest of Redis logic
}
```

---

## Future Enhancements

### Beyond Phase 4:

1. **Session Storage**: Move session data to Redis for better scalability
2. **Job Queues**: Use Redis for background job processing (BullMQ)
3. **Real-Time Dashboards**: Live updates for admin dashboards
4. **A/B Testing**: Store feature flags in Redis
5. **Distributed Locks**: Prevent race conditions in critical sections
6. **Search Caching**: Cache search results for faster queries

---

## Success Criteria

**Phase 1 Success Metrics:**
- [ ] Redis deployed and accessible
- [ ] Cache hit rate > 85%
- [ ] API response time reduced by 50%
- [ ] Zero Redis-related downtime

**Phase 2 Success Metrics:**
- [ ] Campaign API < 100ms average response time
- [ ] Handles 100 concurrent users without issues
- [ ] Sentry shows no Redis-related errors

**Phase 3 Success Metrics:**
- [ ] Usage tracking captures all key metrics
- [ ] Usage dashboard shows accurate data
- [ ] Foundation ready for usage-based pricing

**Phase 4 Success Metrics:**
- [ ] Rate limiting prevents abuse
- [ ] No false positive rate limit blocks
- [ ] All APIs have appropriate rate limits

---

## References & Resources

- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Upstash Rate Limiting](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Next.js Caching Strategies](https://nextjs.org/docs/app/building-your-application/caching)

---

## Questions & Decisions Needed

Before implementation:

1. **Redis Provider**: Upstash vs Redis Cloud? (Recommend: Upstash)
2. **Cache TTL**: 5 minutes for campaigns? (Recommend: Yes, configurable)
3. **Rate Limits**: 100 req/min per church? (Recommend: Start here, adjust based on usage)
4. **Usage Tracking**: Track all APIs or just public? (Recommend: All APIs)
5. **Pricing Timeline**: When to implement tiered pricing? (Recommend: After 100+ churches)

---

**Document Version**: 1.0
**Last Updated**: October 17, 2025
**Owner**: Engineering Team
**Status**: Awaiting Approval for Q2 2025 Implementation
