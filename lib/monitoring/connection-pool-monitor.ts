/**
 * Connection Pool Monitoring Utility
 *
 * Helps track database connection pool health and identify bottlenecks
 */

interface PoolMetrics {
  activeConnections: number;
  timestamp: Date;
  endpoint: string;
  duration?: number;
}

class ConnectionPoolMonitor {
  private metrics: PoolMetrics[] = [];
  private readonly MAX_METRICS = 100; // Keep last 100 requests

  /**
   * Track a database operation
   */
  track(endpoint: string, duration: number) {
    this.metrics.push({
      activeConnections: this.metrics.length, // Approximation
      timestamp: new Date(),
      endpoint,
      duration,
    });

    // Keep metrics array bounded
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }
  }

  /**
   * Get current pool health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    activeRequests: number;
    avgDuration: number;
    slowQueries: PoolMetrics[];
  } {
    const recentMetrics = this.metrics.slice(-20); // Last 20 requests
    const activeRequests = recentMetrics.length;
    const avgDuration = recentMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / activeRequests;
    const slowQueries = recentMetrics.filter(m => (m.duration || 0) > 1000); // > 1 second

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (activeRequests > 20 || slowQueries.length > 5) {
      status = 'critical';
    } else if (activeRequests > 10 || slowQueries.length > 2) {
      status = 'warning';
    }

    return {
      status,
      activeRequests,
      avgDuration,
      slowQueries,
    };
  }

  /**
   * Log pool status (useful for debugging)
   */
  logStatus() {
    const status = this.getHealthStatus();

    if (status.status !== 'healthy') {
      console.warn('[Connection Pool]', {
        status: status.status,
        activeRequests: status.activeRequests,
        avgDuration: `${status.avgDuration.toFixed(2)}ms`,
        slowQueriesCount: status.slowQueries.length,
      });

      if (status.slowQueries.length > 0) {
        console.warn('[Slow Queries]', status.slowQueries.map(q => ({
          endpoint: q.endpoint,
          duration: `${q.duration}ms`,
        })));
      }
    }
  }

  /**
   * Clear metrics (useful for testing)
   */
  clear() {
    this.metrics = [];
  }
}

// Singleton instance
export const poolMonitor = new ConnectionPoolMonitor();

/**
 * Wrapper function to track database operations
 *
 * @example
 * const users = await trackQuery('GET /api/users', async () => {
 *   return await prisma.user.findMany();
 * });
 */
export async function trackQuery<T>(
  endpoint: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    poolMonitor.track(endpoint, duration);

    // Log if query took too long
    if (duration > 1000) {
      console.warn(`[Slow Query] ${endpoint} took ${duration}ms`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    poolMonitor.track(endpoint, duration);

    // Log connection pool errors
    if (error instanceof Error) {
      const errorCode = (error as any).code;
      if (errorCode === 'P2024' || errorCode === 'P1017') {
        console.error(`[Connection Pool Error] ${endpoint}:`, {
          code: errorCode,
          duration: `${duration}ms`,
          poolStatus: poolMonitor.getHealthStatus(),
        });
      }
    }

    throw error;
  }
}

/**
 * API route to check pool health (add to your API routes)
 *
 * @example
 * // app/api/health/db/route.ts
 * import { poolMonitor } from '@/lib/monitoring/connection-pool-monitor';
 *
 * export async function GET() {
 *   const status = poolMonitor.getHealthStatus();
 *   return Response.json(status);
 * }
 */
export function getPoolHealthResponse() {
  const status = poolMonitor.getHealthStatus();

  return {
    ...status,
    timestamp: new Date().toISOString(),
    recommendation: status.status === 'critical'
      ? 'Consider reducing concurrent requests or optimizing slow queries'
      : status.status === 'warning'
      ? 'Monitor for increased load'
      : 'Pool operating normally',
  };
}
