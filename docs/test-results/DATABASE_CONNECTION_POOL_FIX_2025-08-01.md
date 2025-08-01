# Database Connection Pool Configuration

## Issue Discovered During Stress Testing

During stress testing, we discovered a critical database connection pool exhaustion issue:

```
Error: Timed out fetching a new connection from the connection pool
Current connection pool timeout: 10, connection limit: 1
```

### What Happened
1. Stress test sent 1000 concurrent requests
2. Database connection pool had only 1 connection
3. Requests queued up waiting for the single connection
4. After 10 seconds, requests timed out with error P2024
5. Users would see 500 errors under moderate load

## The Solution

### Configure Connection Pool in DATABASE_URL

Add connection pool parameters to your DATABASE_URL:

```bash
# Development (current - problematic)
DATABASE_URL="postgresql://user:password@localhost:5432/altarflow"

# Production (recommended)
DATABASE_URL="postgresql://user:password@localhost:5432/altarflow?connection_limit=10&pool_timeout=30"
```

### Connection Pool Parameters

- **connection_limit**: Maximum number of connections (default: num_cpus * 2 + 1)
  - Recommended: 10-20 for small apps, 50-100 for larger apps
  - Consider your database's connection limit

- **pool_timeout**: How long to wait for a connection (default: 10 seconds)
  - Recommended: 20-30 seconds

- **connect_timeout**: Initial connection timeout (default: 5 seconds)
  - Recommended: 10-30 seconds

### Example Configurations

#### Small Church (< 1000 members)
```
?connection_limit=10&pool_timeout=20
```

#### Medium Church (1000-5000 members)
```
?connection_limit=25&pool_timeout=30
```

#### Large Church (5000+ members)
```
?connection_limit=50&pool_timeout=30&statement_cache_size=1000
```

## Testing the Fix

1. Update your DATABASE_URL with connection pool parameters
2. Restart the development server
3. Run the stress test again
4. Monitor for connection pool errors

## Additional Recommendations

1. **Monitor Database Connections**: Use your database provider's monitoring
2. **Set Alerts**: Alert when connection pool usage > 80%
3. **Scale Database**: Upgrade database plan if hitting connection limits
4. **Use PgBouncer**: For very high traffic, consider a connection pooler

## Common Database Providers Limits

- **Supabase Free**: 60 connections
- **Supabase Pro**: 200 connections
- **Railway**: Varies by plan
- **Neon**: 100 connections (free), more on paid plans
- **PlanetScale**: Unlimited (they handle pooling)

## Immediate Action Required

Before deploying to production, update your DATABASE_URL with appropriate connection pool settings based on your expected load and database provider limits.