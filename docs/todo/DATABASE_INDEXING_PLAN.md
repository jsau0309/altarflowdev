# Database Indexing Plan for Production

## Overview
Strategic indexes to improve query performance as AltarFlow scales. These indexes target the most common and expensive queries in the application.

## When to Implement
Add these indexes when you reach:
- 10+ active churches
- 1,000+ donation records
- 500+ members across all churches
- OR when users report slow loading times

## Indexes to Create

### 1. Donation Queries Index
```sql
CREATE INDEX idx_donations_church_date 
ON "DonationTransaction"("churchId", "createdAt");
```
**Purpose**: Speed up donation listing, filtering, and reporting
**Impact**: 
- Donation page loading: 2-5s → 50-200ms
- Monthly reports: 10-20s → 1-2s
- Dashboard stats: 1-3s → 100ms

### 2. Member Management Index
```sql
CREATE INDEX idx_members_church_status 
ON "Member"("churchId", "status");
```
**Purpose**: Faster member filtering and status queries
**Impact**:
- Member list loading: 1-3s → 10-50ms
- Email recipient selection: 2-4s → 100-300ms
- Active member counts: Instant

### 3. Email Campaign Index
```sql
CREATE INDEX idx_campaigns_church_status 
ON "EmailCampaign"("churchId", "status");
```
**Purpose**: Quick campaign filtering by status
**Impact**:
- Campaign list: 1-2s → 50ms
- Scheduled campaign checks: 500ms → 20ms
- Draft filtering: Instant

### 4. Additional Recommended Indexes

```sql
-- For email recipient queries
CREATE INDEX idx_email_recipients_campaign 
ON "EmailRecipient"("campaignId", "status");

-- For member email lookups
CREATE INDEX idx_members_email 
ON "Member"("churchId", "email");

-- For donation fund filtering
CREATE INDEX idx_donations_fund 
ON "DonationTransaction"("churchId", "donationTypeId", "createdAt");

-- For expense tracking
CREATE INDEX idx_expenses_church_date 
ON "Expense"("churchId", "date");

-- For email preferences (unsubscribe lookups)
CREATE INDEX idx_email_prefs_member 
ON "EmailPreference"("memberId", "churchId");
```

## Implementation Steps

### 1. Pre-Implementation Check
```sql
-- Check current table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 2. Create Indexes (Run in Supabase SQL Editor)
```sql
-- Run each CREATE INDEX statement
-- Monitor execution time
-- Each index may take 30 seconds to 5 minutes depending on data size
```

### 3. Verify Index Usage
```sql
-- Check if indexes are being used
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan > 0
ORDER BY idx_scan DESC;
```

### 4. Monitor Performance
```sql
-- Find slow queries after index creation
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;
```

## Performance Expectations

### Before Indexes (at scale)
- Page loads: 2-5 seconds
- Reports: 10-30 seconds  
- Searches: 1-3 seconds
- API response: 500ms-2s

### After Indexes
- Page loads: 50-200ms
- Reports: 1-3 seconds
- Searches: 10-100ms
- API response: 50-200ms

## Maintenance

### Monthly Tasks
1. Check index usage statistics
2. Identify unused indexes
3. Look for missing index opportunities
4. Monitor index bloat

### Cleanup Unused Indexes
```sql
-- Find unused indexes
SELECT 
  schemaname || '.' || tablename AS table,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelid > 16384;

-- Drop unused index
DROP INDEX IF EXISTS index_name;
```

## Storage Impact

Estimated storage increase:
- Small (< 10k records): 5-10% increase
- Medium (10k-100k): 10-15% increase  
- Large (100k+): 15-20% increase

## Risk Mitigation

1. **Create indexes during low-traffic periods**
2. **Use CONCURRENTLY option for zero-downtime** (Supabase Pro):
   ```sql
   CREATE INDEX CONCURRENTLY idx_name ON table(column);
   ```
3. **Test on staging first** if available
4. **Monitor CPU during creation**
5. **Have rollback plan** (DROP INDEX commands ready)

## Success Metrics

After implementation, measure:
- Page load times < 500ms
- API response p95 < 200ms
- Database CPU < 70% during peak
- User satisfaction scores
- Support tickets about performance

## Future Considerations

As you scale beyond Supabase Pro:
1. Implement database read replicas
2. Add caching layer (Redis)
3. Consider partitioning large tables
4. Implement materialized views for complex reports

---

**Priority**: Medium  
**Effort**: 2-4 hours  
**Impact**: High (10-100x query performance)  
**Risk**: Low (reversible)  

Last Updated: August 1, 2025