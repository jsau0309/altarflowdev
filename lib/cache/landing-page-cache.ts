import { logger } from '@/lib/logger';
/**
 * Landing Page Cache - Reduce Database Load
 *
 * Caches church data for landing pages to minimize database connections
 * during traffic spikes.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface CachedChurch {
  data: any;
  timestamp: number;
  ttl: number;
}

class LandingPageCache {
  private cache: Map<string, CachedChurch> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get church data from cache or fetch from database
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getChurch(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    slug: string,
    fetcher: () => Promise<any>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<any> {
    const cached = this.cache.get(slug);
    const now = Date.now();

    // Return cached data if still valid
    if (cached && now - cached.timestamp < cached.ttl) {
      logger.debug(`[Cache HIT] Church slug: ${slug}`);
      return cached.data;
    }

    // Cache miss or expired - fetch from database
    logger.debug(`[Cache MISS] Church slug: ${slug}`);
    const data = await fetcher();

    // Store in cache
    if (data) {
      this.cache.set(slug, {
        data,
        timestamp: now,
        ttl,
      });
    }

    // Cleanup old entries (prevent memory leak)
    this.cleanup();

    return data;
  }

  /**
   * Invalidate cache for a specific church
   */
  invalidate(slug: string): void {
    this.cache.delete(slug);
    logger.debug(`[Cache INVALIDATE] Church slug: ${slug}`);
  }

  /**
   * Invalidate all cached churches
   */
  invalidateAll(): void {
    this.cache.clear();
    logger.debug('[Cache INVALIDATE] All churches');
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [slug, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(slug);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`[Cache CLEANUP] Removed ${cleanedCount} expired entries`);
    }

    // If cache is too large (>100 entries), remove oldest
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove oldest 20 entries
      for (let i = 0; i < 20; i++) {
        this.cache.delete(entries[i][0]);
      }
      logger.debug('[Cache CLEANUP] Removed 20 oldest entries (size limit)');
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{ slug: string; age: string }>;
  } {
    const now = Date.now();
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([slug, cached]) => ({
        slug,
        age: `${Math.round((now - cached.timestamp) / 1000)}s`,
      })),
    };
  }
}

// Singleton instance
export const landingPageCache = new LandingPageCache();

/**
 * Usage example in landing page route:
 *
 * import { landingPageCache } from '@/lib/cache/landing-page-cache';
 * import { withRetry } from '@/lib/db';
 *
 * export async function GET(request: Request, props: { params: Promise<{ slug: string }> }) {
 *   const params = await props.params;
 *   const { slug } = params;
 *
 *   const church = await landingPageCache.getChurch(
 *     slug,
 *     async () => {
 *       return await withRetry(async () => {
 *         return await prisma.church.findUnique({
 *           where: { slug },
 *           include: { ... }
 *         });
 *       });
 *     },
 *     5 * 60 * 1000 // 5 minute TTL
 *   );
 *
 *   return Response.json(church);
 * }
 */
