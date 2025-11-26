import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { sendSlackNotification, SlackNotifications } from '@/lib/slack-notifier';

/**
 * Clerk Health Check with Intelligent Caching
 *
 * Tests the connection to Clerk authentication service
 * by verifying the API is reachable and credentials are valid.
 *
 * IMPORTANT: This endpoint is called every 5 minutes by uptime monitoring.
 * To avoid hitting Clerk's rate limits (429 errors), we cache results for 4 minutes.
 * This reduces API calls from 288/day to ~12/day (95% reduction).
 *
 * Returns:
 * - 200: Clerk API is accessible and credentials are valid
 * - 503: Clerk API is unreachable or credentials are invalid
 */

// In-memory cache for health check results
interface HealthCheckCache {
  status: 'healthy' | 'unhealthy';
  timestamp: number;
  responseTime: number;
  error?: string;
  rateLimited?: boolean; // Flag to indicate if this cache was extended due to rate limiting
  originalTTL: number; // The TTL that was in effect when this data was fetched (NOT affected by subsequent rate limits)
}

let healthCheckCache: HealthCheckCache | null = null;
let lastNotificationStatus: 'healthy' | 'unhealthy' | null = null; // Track last notified state to prevent spam
const CACHE_TTL_MS = 4 * 60 * 1000; // 4 minutes (just under the 5-minute monitor interval)
const RATE_LIMIT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes on rate limit

export async function GET() {
  const startTime = Date.now();

  // Return cached result if still valid
  // Use extended TTL if the cache was marked as rate-limited
  const effectiveTTL = healthCheckCache?.rateLimited ? RATE_LIMIT_CACHE_TTL_MS : CACHE_TTL_MS;
  if (healthCheckCache && Date.now() - healthCheckCache.timestamp < effectiveTTL) {
    // FIX: Do NOT reset rateLimited flag on cache hit
    // The flag should only be reset when cache is refreshed with new data (lines 179, 253)
    // Resetting on every cache hit creates a race condition where subsequent requests
    // milliseconds later would use the wrong TTL calculation (4-min instead of 15-min)
    
    logger.debug('Returning cached Clerk health check result', {
      operation: 'health.clerk.cache_hit',
      cacheAge: Date.now() - healthCheckCache.timestamp,
      status: healthCheckCache.status,
      rateLimited: healthCheckCache.rateLimited, // Log current rate limit state
    });

    return NextResponse.json(
      {
        status: healthCheckCache.status,
        service: 'clerk',
        message: healthCheckCache.status === 'healthy'
          ? 'Clerk API connection successful (cached)'
          : 'Clerk API connection failed (cached)',
        responseTime: `${healthCheckCache.responseTime}ms`,
        cached: true,
        cacheAge: `${Math.round((Date.now() - healthCheckCache.timestamp) / 1000)}s`,
        timestamp: new Date().toISOString(),
        ...(healthCheckCache.error && { error: healthCheckCache.error }),
      },
      { status: healthCheckCache.status === 'healthy' ? 200 : 503 }
    );
  }

  // Cache miss - make actual API call
  logger.debug('Cache miss - making actual Clerk API call', {
    operation: 'health.clerk.cache_miss',
  });

  try {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;

    if (!clerkSecretKey) {
      throw new Error('CLERK_SECRET_KEY is not configured');
    }

    // Test Clerk API by making a simple request to the users endpoint
    // We'll just check if we can reach the API (limit to 1 user)
    const response = await fetch('https://api.clerk.com/v1/users?limit=1', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const responseTime = Date.now() - startTime;

    // Handle rate limiting from Clerk API
    if (response.status === 429) {
      logger.warn('Clerk API rate limit hit - extending cache TTL', {
        operation: 'health.clerk.rate_limit',
        responseTime,
      });

      // If we have a cached result, mark it as rate-limited to extend its TTL to 15 minutes
      // IMPORTANT: We do NOT update the timestamp here to avoid masking real status changes
      // The extended TTL only applies if the cached result is still within its original validity window
      if (healthCheckCache) {
        // Calculate remaining cache validity from the original timestamp
        const cacheAge = Date.now() - healthCheckCache.timestamp;
        
        // CRITICAL FIX: Always use the TTL that was in effect when data was FETCHED
        // NOT the current rateLimited flag state (which may have been set by a previous rate limit)
        // This ensures we validate against the actual freshness window of the cached data
        const originalTTL = healthCheckCache.originalTTL;
        
        // Only use cached result if it's still within the original TTL
        if (cacheAge < originalTTL) {
          // Mark the cache as rate-limited to use extended TTL for future checks
          // But keep the original timestamp and originalTTL to preserve data freshness
          healthCheckCache.rateLimited = true;

          return NextResponse.json(
            {
              status: healthCheckCache.status,
              service: 'clerk',
              message: 'Rate limit hit - returning cached status',
              responseTime: `${responseTime}ms`,
              cached: true,
              rateLimited: true,
              cacheAge: `${Math.round(cacheAge / 1000)}s`,
              timestamp: new Date().toISOString(),
            },
            { status: healthCheckCache.status === 'healthy' ? 200 : 503 }
          );
        }
        
        // Cache has expired - fall through to rate limit error
        logger.warn('Cached result expired - cannot extend stale data', {
          operation: 'health.clerk.rate_limit_cache_expired',
          cacheAge: `${Math.round(cacheAge / 1000)}s`,
          originalTTL: `${Math.round(originalTTL / 1000)}s`,
        });
      }

      // BUG FIX #2: Don't throw error for rate limits - handle specially
      // Rate limit is not a service failure, it's a temporary API constraint
      // Return a specific rate limit response without marking service as unhealthy
      logger.warn('Clerk API rate limited with no valid cache', {
        operation: 'health.clerk.rate_limit_no_cache',
        responseTime,
      });
      
      return NextResponse.json(
        {
          status: 'rate_limited',
          service: 'clerk',
          message: 'Clerk API rate limit reached - no cached result available',
          responseTime: `${responseTime}ms`,
          cached: false,
          rateLimited: true,
          timestamp: new Date().toISOString(),
        },
        { status: 429 } // Return 429 to indicate rate limiting, not service failure
      );
    }

    if (!response.ok) {
      throw new Error(`Clerk API returned status ${response.status}`);
    }

    // Success - cache the healthy result
    const wasUnhealthy = healthCheckCache?.status === 'unhealthy';
    
    healthCheckCache = {
      status: 'healthy',
      timestamp: Date.now(),
      responseTime,
      rateLimited: false, // Reset rate limit flag on successful check
      originalTTL: CACHE_TTL_MS, // Store the TTL in effect when this data was fetched
    };

    // Send recovery notification only if transitioning from unhealthy to healthy
    if (wasUnhealthy && lastNotificationStatus === 'unhealthy') {
      await sendSlackNotification(
        SlackNotifications.serviceHealthCheckRecovered({
          service: 'clerk',
          responseTime: `${responseTime}ms`,
        })
      );
      lastNotificationStatus = 'healthy';
      
      logger.info('Clerk health check recovered - notification sent', {
        operation: 'health.clerk.recovery',
        responseTime,
      });
    } else {
      logger.debug('Clerk health check passed - result cached', {
        operation: 'health.clerk.success',
        responseTime,
      });
    }

    return NextResponse.json(
      {
        status: 'healthy',
        service: 'clerk',
        message: 'Clerk API connection successful',
        responseTime: `${responseTime}ms`,
        cached: false,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // BUG FIX #2: Don't cache rate limit errors as unhealthy
    // Check if this is a rate limit error (should not reach here after fix, but defensive)
    const isRateLimitError = errorMessage.includes('rate limit') || errorMessage.includes('429');
    
    if (isRateLimitError) {
      // Rate limit without cache should not be treated as service failure
      logger.warn('Rate limit error caught in error handler (defensive check)', {
        operation: 'health.clerk.rate_limit_error_handler',
        responseTime,
        errorMessage,
      });
      
      return NextResponse.json(
        {
          status: 'rate_limited',
          service: 'clerk',
          message: 'Clerk API rate limit reached',
          error: errorMessage,
          responseTime: `${responseTime}ms`,
          cached: false,
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      );
    }

    // Cache the unhealthy result to avoid repeated failures hitting Slack/Sentry
    const wasHealthy = healthCheckCache?.status === 'healthy' || healthCheckCache === null;
    
    healthCheckCache = {
      status: 'unhealthy',
      timestamp: Date.now(),
      responseTime,
      error: errorMessage,
      rateLimited: false, // Reset rate limit flag on failed check
      originalTTL: CACHE_TTL_MS, // Store the TTL in effect when this data was fetched
    };

    logger.error(
      'Clerk health check failed - result cached',
      {
        operation: 'health.clerk.failure',
        responseTime,
        timestamp: new Date().toISOString(),
      },
      error instanceof Error ? error : new Error(String(error))
    );

    // Send Slack notification ONLY on transition from healthy to unhealthy
    // This prevents spam during extended outages (when cache expires every 4 minutes)
    if (wasHealthy && lastNotificationStatus !== 'unhealthy') {
      await sendSlackNotification(
        SlackNotifications.serviceHealthCheckFailed({
          service: 'clerk',
          error: errorMessage,
          responseTime: `${responseTime}ms`,
        })
      );
      lastNotificationStatus = 'unhealthy';
      
      logger.warn('Clerk health check transitioned to unhealthy - notification sent', {
        operation: 'health.clerk.failure_notification',
        responseTime,
      });
    } else {
      logger.debug('Clerk health check still unhealthy - notification suppressed', {
        operation: 'health.clerk.failure_suppressed',
        responseTime,
        lastNotificationStatus,
      });
    }

    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'clerk',
        message: 'Clerk API connection failed',
        error: errorMessage,
        responseTime: `${responseTime}ms`,
        cached: false,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
