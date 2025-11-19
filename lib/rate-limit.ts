import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// Simple in-memory rate limiter (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_RATE_LIMIT_ENTRIES = 10000; // Prevent unbounded growth
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean up every 5 minutes
const RATE_LIMIT_TTL = 60 * 60 * 1000; // Keep entries for 1 hour after expiry
let lastCleanup = Date.now();

// Cleanup statistics for monitoring
const cleanupStats = {
  totalCleaned: 0,
  lastCleanupTime: Date.now(),
  cleanupRuns: 0,
  maxSizeReached: 0,
};

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests in window
}

export function rateLimit(config: RateLimitConfig = { windowMs: 60000, max: 10 }) {
  return async function checkRateLimit(req: NextRequest): Promise<{ success: boolean; remaining: number; resetTime?: number }> {
    // Get client identifier (IP or user ID)
    const identifier = req.headers.get('x-forwarded-for') ||
                      req.headers.get('x-real-ip') ||
                      'anonymous';

    const now = Date.now();

    // Periodic cleanup to prevent memory leak
    if (now - lastCleanup > CLEANUP_INTERVAL) {
      let deletedCount = 0;
      for (const [key, value] of rateLimitMap.entries()) {
        // Remove entries that have been expired for more than TTL
        if (value.resetTime + RATE_LIMIT_TTL < now) {
          rateLimitMap.delete(key);
          deletedCount++;
        }
      }

      // Update cleanup statistics
      cleanupStats.totalCleaned += deletedCount;
      cleanupStats.lastCleanupTime = now;
      cleanupStats.cleanupRuns++;

      lastCleanup = now;

      // If still too many entries, remove oldest ones
      if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
        cleanupStats.maxSizeReached++;
        const entriesToDelete = rateLimitMap.size - MAX_RATE_LIMIT_ENTRIES;
        const sortedEntries = Array.from(rateLimitMap.entries())
          .sort((a, b) => a[1].resetTime - b[1].resetTime);

        for (let i = 0; i < entriesToDelete; i++) {
          rateLimitMap.delete(sortedEntries[i][0]);
          deletedCount++;
        }

        Sentry.captureMessage(
          `Rate limit map exceeded capacity. Removed ${entriesToDelete} oldest entries`,
          {
            level: 'warning',
            extra: {
              deletedCount,
              mapSize: rateLimitMap.size,
              maxSize: MAX_RATE_LIMIT_ENTRIES,
              cleanupRun: cleanupStats.cleanupRuns,
            },
          }
        );
      } else if (deletedCount > 0) {
        // Log cleanup metrics to Sentry breadcrumbs for debugging
        Sentry.addBreadcrumb({
          category: 'rate-limit',
          message: `Cleanup: Removed ${deletedCount} expired entries`,
          level: 'info',
          data: {
            cleanupRun: cleanupStats.cleanupRuns,
            currentSize: rateLimitMap.size,
            totalCleaned: cleanupStats.totalCleaned,
          },
        });
      }
    }

    // Get or create rate limit entry
    let entry = rateLimitMap.get(identifier);

    if (!entry || entry.resetTime < now) {
      // SECURITY: Prevent adding new entries if at capacity
      // Reject instead of allowing to prevent bypass attacks
      if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES && !rateLimitMap.has(identifier)) {
        Sentry.captureMessage(
          'Rate limit map at capacity - rejecting request',
          {
            level: 'error',
            extra: {
              identifier,
              mapSize: MAX_RATE_LIMIT_ENTRIES,
              utilizationPercent: 100,
            },
          }
        );
        // SECURITY FIX: Reject request instead of allowing bypass
        // This prevents attackers from filling the map and bypassing rate limiting
        return {
          success: false,
          remaining: 0,
          resetTime: now + config.windowMs
        };
      }

      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
      rateLimitMap.set(identifier, entry);
    }

    // Check rate limit
    if (entry.count >= config.max) {
      return {
        success: false,
        remaining: 0
      };
    }

    // Increment counter
    entry.count++;

    return {
      success: true,
      remaining: config.max - entry.count
    };
  };
}

/**
 * Rate limiter that accepts a custom identifier (e.g., phone number, user ID)
 * Use this for resource-specific rate limiting instead of IP-based limiting
 *
 * @param config - Rate limit configuration (windowMs, max)
 * @returns Function that accepts custom identifier and returns rate limit result
 */
export function rateLimitByIdentifier(config: RateLimitConfig = { windowMs: 60000, max: 10 }) {
  return async function checkRateLimit(identifier: string): Promise<{ success: boolean; remaining: number; resetTime?: number }> {
    const now = Date.now();
    
    // Periodic cleanup to prevent memory leak
    if (now - lastCleanup > CLEANUP_INTERVAL) {
      let deletedCount = 0;
      for (const [key, value] of rateLimitMap.entries()) {
        // Remove entries that have been expired for more than TTL
        if (value.resetTime + RATE_LIMIT_TTL < now) {
          rateLimitMap.delete(key);
          deletedCount++;
        }
      }
      
      // Update cleanup statistics
      cleanupStats.totalCleaned += deletedCount;
      cleanupStats.lastCleanupTime = now;
      cleanupStats.cleanupRuns++;
      
      lastCleanup = now;
      
      // If still too many entries, remove oldest ones
      if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
        cleanupStats.maxSizeReached++;
        const entriesToDelete = rateLimitMap.size - MAX_RATE_LIMIT_ENTRIES;
        const sortedEntries = Array.from(rateLimitMap.entries())
          .sort((a, b) => a[1].resetTime - b[1].resetTime);
        
        for (let i = 0; i < entriesToDelete; i++) {
          rateLimitMap.delete(sortedEntries[i][0]);
          deletedCount++;
        }
        
        Sentry.captureMessage(
          `Rate limit map exceeded capacity. Removed ${entriesToDelete} oldest entries`,
          {
            level: 'warning',
            extra: {
              deletedCount,
              mapSize: rateLimitMap.size,
              maxSize: MAX_RATE_LIMIT_ENTRIES,
              cleanupRun: cleanupStats.cleanupRuns,
            },
          }
        );
      } else if (deletedCount > 0) {
        // Log cleanup metrics to Sentry breadcrumbs for debugging
        Sentry.addBreadcrumb({
          category: 'rate-limit',
          message: `Cleanup: Removed ${deletedCount} expired entries`,
          level: 'info',
          data: {
            cleanupRun: cleanupStats.cleanupRuns,
            currentSize: rateLimitMap.size,
            totalCleaned: cleanupStats.totalCleaned,
          },
        });
      }
    }
    
    // Get or create rate limit entry
    let entry = rateLimitMap.get(identifier);
    
    if (!entry || entry.resetTime < now) {
      // SECURITY: Prevent adding new entries if at capacity
      // Reject instead of allowing to prevent bypass attacks
      if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES && !rateLimitMap.has(identifier)) {
        Sentry.captureMessage(
          'Rate limit map at capacity - rejecting request',
          {
            level: 'error',
            extra: {
              identifier,
              mapSize: MAX_RATE_LIMIT_ENTRIES,
              utilizationPercent: 100,
            },
          }
        );
        // SECURITY FIX: Reject request instead of allowing bypass
        // This prevents attackers from filling the map and bypassing rate limiting
        return {
          success: false,
          remaining: 0,
          resetTime: now + config.windowMs
        };
      }
      
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
      rateLimitMap.set(identifier, entry);
    }
    
    // Check rate limit
    if (entry.count >= config.max) {
      return {
        success: false,
        remaining: 0
      };
    }
    
    // Increment counter
    entry.count++;
    
    return {
      success: true,
      remaining: config.max - entry.count
    };
  };
}

// Webhook deduplication
const processedWebhooks = new Map<string, number>();
const WEBHOOK_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_WEBHOOK_ENTRIES = 50000; // Prevent unbounded growth
let lastWebhookCleanup = Date.now();

// Webhook cleanup statistics
const webhookCleanupStats = {
  totalCleaned: 0,
  lastCleanupTime: Date.now(),
  cleanupRuns: 0,
  maxSizeReached: 0,
};

export function isWebhookProcessed(eventId: string): boolean {
  const now = Date.now();
  
  // Periodic cleanup to prevent memory leak
  if (now - lastWebhookCleanup > CLEANUP_INTERVAL) {
    let deletedCount = 0;
    for (const [key, timestamp] of processedWebhooks.entries()) {
      if (now - timestamp > WEBHOOK_CACHE_TTL) {
        processedWebhooks.delete(key);
        deletedCount++;
      }
    }
    
    // Update webhook cleanup statistics
    webhookCleanupStats.totalCleaned += deletedCount;
    webhookCleanupStats.lastCleanupTime = now;
    webhookCleanupStats.cleanupRuns++;
    
    lastWebhookCleanup = now;
    
    // If still too many entries, remove oldest ones
    if (processedWebhooks.size > MAX_WEBHOOK_ENTRIES) {
      webhookCleanupStats.maxSizeReached++;
      const entriesToDelete = processedWebhooks.size - MAX_WEBHOOK_ENTRIES;
      const sortedEntries = Array.from(processedWebhooks.entries())
        .sort((a, b) => a[1] - b[1]);
      
      for (let i = 0; i < entriesToDelete; i++) {
        processedWebhooks.delete(sortedEntries[i][0]);
        deletedCount++;
      }
      
      Sentry.captureMessage(
        `Webhook cache exceeded capacity. Removed ${entriesToDelete} oldest entries`,
        {
          level: 'warning',
          extra: {
            deletedCount,
            cacheSize: processedWebhooks.size,
            maxSize: MAX_WEBHOOK_ENTRIES,
            cleanupRun: webhookCleanupStats.cleanupRuns,
          },
        }
      );
    } else if (deletedCount > 0) {
      // Log cleanup metrics to Sentry breadcrumbs for debugging
      Sentry.addBreadcrumb({
        category: 'webhook-cache',
        message: `Cleanup: Removed ${deletedCount} expired entries`,
        level: 'info',
        data: {
          cleanupRun: webhookCleanupStats.cleanupRuns,
          currentSize: processedWebhooks.size,
          totalCleaned: webhookCleanupStats.totalCleaned,
        },
      });
    }
  }
  
  // Check if already processed
  if (processedWebhooks.has(eventId)) {
    return true;
  }
  
  // Prevent adding new entries if at capacity
  if (processedWebhooks.size >= MAX_WEBHOOK_ENTRIES) {
    // Remove oldest entry to make room
    const oldestEntry = Array.from(processedWebhooks.entries())
      .sort((a, b) => a[1] - b[1])[0];
    if (oldestEntry) {
      processedWebhooks.delete(oldestEntry[0]);
    }
  }
  
  // Mark as processed
  processedWebhooks.set(eventId, now);
  return false;
}

// API endpoint rate limits
export const rateLimits = {
  donations: rateLimit({ windowMs: 60000, max: 20 }), // 20 requests per minute
  otp: rateLimit({ windowMs: 60000, max: 5 }), // 5 OTP requests per minute
  webhooks: rateLimit({ windowMs: 1000, max: 100 }), // 100 webhooks per second
  stripe: rateLimit({ windowMs: 60000, max: 30 }), // 30 Stripe API calls per minute
  receiptScan: rateLimit({ windowMs: 60000, max: 10 }), // 10 receipt scans per minute
};

// Export memory statistics for monitoring
export function getMemoryStats() {
  return {
    rateLimit: {
      mapSize: rateLimitMap.size,
      maxSize: MAX_RATE_LIMIT_ENTRIES,
      cleanup: cleanupStats,
      utilizationPercent: Math.round((rateLimitMap.size / MAX_RATE_LIMIT_ENTRIES) * 100),
    },
    webhooks: {
      mapSize: processedWebhooks.size,
      maxSize: MAX_WEBHOOK_ENTRIES,
      cleanup: webhookCleanupStats,
      utilizationPercent: Math.round((processedWebhooks.size / MAX_WEBHOOK_ENTRIES) * 100),
    },
    estimatedMemoryMB: Math.round(
      ((rateLimitMap.size * 100) + (processedWebhooks.size * 50)) / 1024 / 1024 * 100
    ) / 100,
    lastCleanupAgo: {
      rateLimit: Date.now() - cleanupStats.lastCleanupTime,
      webhooks: Date.now() - webhookCleanupStats.lastCleanupTime,
    },
  };
}

// Auto-cleanup on server start (run initial cleanup after 30 seconds)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  setTimeout(() => {
    // Force cleanup for rate limits
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime + RATE_LIMIT_TTL < now) {
        rateLimitMap.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      Sentry.addBreadcrumb({
        category: 'memory-cleanup',
        message: `Initial cleanup: Removed ${cleaned} expired entries`,
        level: 'info',
        data: { cleaned },
      });
    }
    
    // Log initialization to Sentry
    Sentry.addBreadcrumb({
      category: 'memory-cleanup',
      message: 'Automatic cleanup initialized',
      level: 'info',
      data: {
        cleanupInterval: CLEANUP_INTERVAL,
        ttl: RATE_LIMIT_TTL,
      },
    });
  }, 30000); // 30 seconds after server start
}