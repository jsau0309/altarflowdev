import { NextRequest } from 'next/server';

// Simple in-memory rate limiter (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_RATE_LIMIT_ENTRIES = 10000; // Prevent unbounded growth
const CLEANUP_INTERVAL = 60000; // Clean up every minute
let lastCleanup = Date.now();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests in window
}

export function rateLimit(config: RateLimitConfig = { windowMs: 60000, max: 10 }) {
  return async function checkRateLimit(req: NextRequest): Promise<{ success: boolean; remaining: number }> {
    // Get client identifier (IP or user ID)
    const identifier = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      'anonymous';
    
    const now = Date.now();
    
    // Periodic cleanup to prevent memory leak
    if (now - lastCleanup > CLEANUP_INTERVAL) {
      let deletedCount = 0;
      for (const [key, value] of rateLimitMap.entries()) {
        if (value.resetTime < now) {
          rateLimitMap.delete(key);
          deletedCount++;
        }
      }
      lastCleanup = now;
      
      // If still too many entries, remove oldest ones
      if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
        const entriesToDelete = rateLimitMap.size - MAX_RATE_LIMIT_ENTRIES;
        const sortedEntries = Array.from(rateLimitMap.entries())
          .sort((a, b) => a[1].resetTime - b[1].resetTime);
        
        for (let i = 0; i < entriesToDelete; i++) {
          rateLimitMap.delete(sortedEntries[i][0]);
        }
        
        console.warn(`[RateLimit] Map size exceeded limit. Removed ${entriesToDelete} oldest entries.`);
      }
    }
    
    // Get or create rate limit entry
    let entry = rateLimitMap.get(identifier);
    
    if (!entry || entry.resetTime < now) {
      // Prevent adding new entries if at capacity
      if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES && !rateLimitMap.has(identifier)) {
        console.error(`[RateLimit] Cannot add new entry. Map at capacity (${MAX_RATE_LIMIT_ENTRIES})`);
        // Allow request but don't track it
        return {
          success: true,
          remaining: config.max
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
    lastWebhookCleanup = now;
    
    // If still too many entries, remove oldest ones
    if (processedWebhooks.size > MAX_WEBHOOK_ENTRIES) {
      const entriesToDelete = processedWebhooks.size - MAX_WEBHOOK_ENTRIES;
      const sortedEntries = Array.from(processedWebhooks.entries())
        .sort((a, b) => a[1] - b[1]);
      
      for (let i = 0; i < entriesToDelete; i++) {
        processedWebhooks.delete(sortedEntries[i][0]);
      }
      
      console.warn(`[Webhook] Cache size exceeded limit. Removed ${entriesToDelete} oldest entries.`);
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
};