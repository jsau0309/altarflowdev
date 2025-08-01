# Supabase Pro Scaling Guide for AltarFlow

## Overview
With Supabase Pro and proper configuration, AltarFlow can scale to support hundreds of churches and tens of thousands of users.

## Current Configuration vs Production

### Development (Current)
```
DATABASE_URL="...?connection_limit=10&pool_timeout=30"
- 10 connections (increased from 1)
- Handles ~100 concurrent requests
- Good for development and testing
```

### Production (Supabase Pro)
```
DATABASE_URL="...?connection_limit=30&pool_timeout=30&statement_cache_size=200"
- 30 connections (optimal for Pro plan)
- Handles 300-500 concurrent requests
- Leaves headroom for admin access
```

## Scaling Capabilities with Supabase Pro

### Connection Math
- **Supabase Pro**: 200 total connections
- **Reserved for admin/migrations**: 20 connections
- **PgBouncer pool**: 180 available connections
- **Your app allocation**: 30-50 connections (recommended)
- **Other apps/services**: 130-150 connections available

### User Capacity Estimates

#### Per Connection
- Each connection can handle ~10 concurrent requests (with PgBouncer)
- 30 connections × 10 requests = 300 concurrent operations

#### Real-World Capacity
Based on typical church usage patterns:

1. **Churches**: 500-1,000 active churches
   - Not all churches are active simultaneously
   - Peak usage: Sunday mornings, weekday evenings
   - Average: 10-20% concurrent usage

2. **Members**: 50,000-100,000 total members
   - Average church size: 100-200 members
   - Concurrent users: 1,000-5,000 (1-5% of total)

3. **Requests/Second**: 200-500 RPS
   - Dashboard loading: 5-10 queries
   - Donation processing: 3-5 queries
   - Report generation: 10-20 queries

### Feature-Specific Scaling

#### Email Campaigns
- **Concurrent campaigns**: 100+
- **Recipients per campaign**: 1,000+ (processed in batches)
- **Sending rate**: 100 emails/second (Resend limit)
- **Database impact**: Minimal (batch updates)

#### Donation Processing
- **Concurrent donations**: 50-100
- **Peak load**: Sunday mornings
- **Transaction time**: < 2 seconds
- **Stripe Connect**: Handles payment scaling

#### Reporting
- **Concurrent reports**: 20-30
- **Data aggregation**: Optimized queries
- **Caching**: Reduces repeated queries
- **AI summaries**: Rate-limited separately

## Performance Optimization Tips

### 1. Query Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_donations_church_date ON "DonationTransaction"("churchId", "createdAt");
CREATE INDEX idx_members_church_status ON "Member"("churchId", "status");
CREATE INDEX idx_campaigns_church_status ON "EmailCampaign"("churchId", "status");
```

### 2. Connection Pool Tuning
```javascript
// For very high traffic (Team/Enterprise plans)
DATABASE_URL="...?connection_limit=50&pool_timeout=30&statement_cache_size=500&idle_in_transaction_session_timeout=60000"
```

### 3. Monitoring Queries
```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Find slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
WHERE mean_exec_time > 1000 
ORDER BY mean_exec_time DESC;

-- Monitor connection pool efficiency
SELECT state, count(*) 
FROM pg_stat_activity 
GROUP BY state;
```

## When to Scale Beyond Pro

Consider Team/Enterprise when:
- Active churches > 1,000
- Concurrent users > 5,000
- Database connections > 150
- Storage > 100GB
- Need dedicated support

## Cost-Effective Scaling Strategies

1. **Implement Caching**
   - Redis for session data
   - CDN for static assets
   - Query result caching

2. **Optimize Queries**
   - Use database views
   - Implement pagination
   - Batch operations

3. **Load Distribution**
   - Schedule reports off-peak
   - Batch email sending
   - Queue heavy operations

## Monitoring Dashboard Metrics

### Supabase Dashboard
Monitor these metrics:
- **Database Connections**: Keep < 80% of limit
- **CPU Usage**: Should average < 70%
- **Memory Usage**: Should stay < 80%
- **Disk I/O**: Watch for spikes
- **Query Performance**: p95 < 100ms

### Application Metrics
Track these KPIs:
- API response time (target: < 200ms)
- Database query time (target: < 50ms)
- Failed requests (target: < 0.1%)
- Connection pool wait time (target: < 10ms)

## Emergency Scaling

If you hit limits:
1. **Immediate**: Increase connection_limit (up to 50)
2. **Short-term**: Enable read replicas
3. **Long-term**: Upgrade to Team plan
4. **Critical**: Contact Supabase support

## Pre-Launch Load Testing

Before going live:
```bash
# Run the stress test we created
node scripts/connection-pool-stress-test.js

# Expected results with Pro plan:
# - 0 errors on 1000 concurrent requests
# - Average response < 50ms
# - No connection timeouts
```

## Conclusion

With Supabase Pro and connection_limit=30, AltarFlow can comfortably handle:
- 500+ churches
- 50,000+ members
- 1,000+ concurrent users
- 100+ simultaneous email campaigns

This provides significant room for growth before needing to upgrade to Team or Enterprise plans.