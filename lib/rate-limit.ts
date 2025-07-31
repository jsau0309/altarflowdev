import { NextRequest } from 'next/server';

// Simple in-memory rate limiter
// In production, you should use Redis or a similar distributed cache
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
  keyPrefix?: string;  // Prefix for the rate limit key
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Get client identifier from request
 * Uses IP address with fallback to a default for local development
 */
function getClientId(request: NextRequest): string {
  // Try to get real IP from headers (considering proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  const ip = forwarded?.split(',')[0].trim() || realIp || cfIp || 'unknown';
  
  return ip;
}

/**
 * Rate limit middleware for API routes
 * @param request - The incoming request
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): RateLimitResult {
  const { windowMs, maxRequests, keyPrefix = 'rl' } = config;
  
  const clientId = getClientId(request);
  const key = `${keyPrefix}:${clientId}`;
  const now = Date.now();
  
  // Get or create rate limit entry
  let entry = rateLimitMap.get(key);
  
  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired one
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
    rateLimitMap.set(key, entry);
  }
  
  // Increment count
  entry.count++;
  
  // Check if limit exceeded
  const allowed = entry.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.count);
  
  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Create a rate limit handler for API routes
 * @param config - Rate limit configuration
 * @returns Middleware function
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (request: NextRequest): RateLimitResult => {
    return rateLimit(request, config);
  };
}

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
  // Strict limit for public endpoints
  public: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 requests per 15 minutes
  },
  
  // More lenient for authenticated endpoints
  authenticated: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
  },
  
  // Very strict for sensitive operations
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 requests per hour
  },
  
  // Custom for unsubscribe/resubscribe
  unsubscribe: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 requests per hour per IP
  },
};

/**
 * Format rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.allowed ? result.remaining + 1 : result.remaining),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  };
}