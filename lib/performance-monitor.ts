import { logger } from '@/lib/logger';
import { sendSlackNotification, SlackNotifications } from '@/lib/slack-notifier';

/**
 * Performance Monitoring Utility
 *
 * Tracks slow operations, database queries, and API response times.
 * Automatically alerts on performance degradation.
 *
 * @example
 * ```typescript
 * // Track API route performance
 * export async function GET(req: Request) {
 *   return trackPerformance('donations.list', async () => {
 *     const donations = await prisma.donation.findMany();
 *     return NextResponse.json(donations);
 *   });
 * }
 *
 * // Track database query performance
 * const donations = await trackQuery('donations.findMany', () =>
 *   prisma.donation.findMany({ where: { churchId } })
 * );
 * ```
 */

/**
 * Performance thresholds (in milliseconds)
 */
export const PERFORMANCE_THRESHOLDS = {
  /** Slow API response time */
  API_SLOW: 1000, // 1 second

  /** Very slow API response time (critical) */
  API_CRITICAL: 3000, // 3 seconds

  /** Slow database query */
  QUERY_SLOW: 500, // 500ms

  /** Very slow database query (critical) */
  QUERY_CRITICAL: 2000, // 2 seconds

  /** Slow external API call (Stripe, Resend, etc.) */
  EXTERNAL_SLOW: 2000, // 2 seconds

  /** Very slow external API call */
  EXTERNAL_CRITICAL: 5000, // 5 seconds
};

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  threshold: number;
  isSlowQuery?: boolean;
  query?: string;
  endpoint?: string;
}

/**
 * Track performance of an async operation
 *
 * @example
 * ```typescript
 * const result = await trackPerformance('payment.process', async () => {
 *   const payment = await stripe.paymentIntents.create(...);
 *   return payment;
 * });
 * ```
 */
export async function trackPerformance<T>(
  operation: string,
  handler: () => Promise<T>,
  options?: {
    /** Custom threshold in milliseconds */
    threshold?: number;
    /** Additional context to log */
    context?: Record<string, unknown>;
  }
): Promise<T> {
  const startTime = performance.now();
  const threshold = options?.threshold || PERFORMANCE_THRESHOLDS.API_SLOW;

  try {
    const result = await handler();
    const duration = performance.now() - startTime;

    // Log performance metrics
    logPerformance({
      operation,
      duration,
      threshold,
      ...options?.context,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    // Log error with duration
    logger.error('Operation failed', {
      operation: `performance.error.${operation}`,
      durationMs: duration,
      ...options?.context,
    }, error instanceof Error ? error : new Error(String(error)));

    throw error;
  }
}

/**
 * Track database query performance
 *
 * @example
 * ```typescript
 * const donations = await trackQuery('donations.findMany', () =>
 *   prisma.donation.findMany({ where: { churchId } })
 * );
 * ```
 */
export async function trackQuery<T>(
  queryName: string,
  handler: () => Promise<T>,
  options?: {
    /** Custom threshold in milliseconds */
    threshold?: number;
  }
): Promise<T> {
  const startTime = performance.now();
  const threshold = options?.threshold || PERFORMANCE_THRESHOLDS.QUERY_SLOW;

  try {
    const result = await handler();
    const duration = performance.now() - startTime;

    // Log query performance
    logPerformance({
      operation: `db.${queryName}`,
      duration,
      threshold,
      isSlowQuery: duration > threshold,
    });

    // Alert on slow queries
    if (duration > PERFORMANCE_THRESHOLDS.QUERY_CRITICAL && process.env.NODE_ENV === 'production') {
      void sendSlackNotification(SlackNotifications.slowQuery({
        query: queryName,
        duration,
        endpoint: 'Database Query',
      }));
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    logger.error('Database query failed', {
      operation: `db.error.${queryName}`,
      durationMs: duration,
    }, error instanceof Error ? error : new Error(String(error)));

    throw error;
  }
}

/**
 * Track external API call performance (Stripe, Resend, Twilio, etc.)
 *
 * @example
 * ```typescript
 * const payment = await trackExternalCall('stripe.create_payment', () =>
 *   stripe.paymentIntents.create({ amount, currency })
 * );
 * ```
 */
export async function trackExternalCall<T>(
  apiName: string,
  handler: () => Promise<T>,
  options?: {
    /** Custom threshold in milliseconds */
    threshold?: number;
  }
): Promise<T> {
  const startTime = performance.now();
  const threshold = options?.threshold || PERFORMANCE_THRESHOLDS.EXTERNAL_SLOW;

  try {
    const result = await handler();
    const duration = performance.now() - startTime;

    // Log external call performance
    logPerformance({
      operation: `external.${apiName}`,
      duration,
      threshold,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    logger.error('External API call failed', {
      operation: `external.error.${apiName}`,
      durationMs: duration,
    }, error instanceof Error ? error : new Error(String(error)));

    throw error;
  }
}

/**
 * Log performance metrics with appropriate severity
 * @private
 */
function logPerformance(metrics: PerformanceMetrics & Record<string, unknown>): void {
  const { operation, duration, threshold } = metrics;

  if (duration > threshold * 3) {
    // Critical: 3x threshold
    logger.error('Critical performance degradation', {
      operation: `performance.critical.${operation}`,
      durationMs: duration,
      thresholdMs: threshold,
      slowdownFactor: (duration / threshold).toFixed(2),
      ...metrics,
    });
  } else if (duration > threshold * 2) {
    // Warning: 2x threshold
    logger.warn('Significant performance degradation', {
      operation: `performance.warn.${operation}`,
      durationMs: duration,
      thresholdMs: threshold,
      slowdownFactor: (duration / threshold).toFixed(2),
      ...metrics,
    });
  } else if (duration > threshold) {
    // Info: Above threshold but not critical
    logger.info('Performance threshold exceeded', {
      operation: `performance.slow.${operation}`,
      durationMs: duration,
      thresholdMs: threshold,
      slowdownFactor: (duration / threshold).toFixed(2),
      ...metrics,
    });
  } else {
    // Debug: Normal performance
    logger.debug('Operation completed', {
      operation: `performance.ok.${operation}`,
      durationMs: duration,
      ...metrics,
    });
  }
}

/**
 * Create a performance timer for manual tracking
 *
 * @example
 * ```typescript
 * const timer = startTimer('complex_operation');
 *
 * // Do some work...
 * await step1();
 * timer.lap('step1_complete');
 *
 * // More work...
 * await step2();
 * timer.lap('step2_complete');
 *
 * // Finish and log
 * timer.end();
 * ```
 */
export function startTimer(operation: string) {
  const startTime = performance.now();
  const laps: Array<{ name: string; duration: number }> = [];

  return {
    /**
     * Record a lap time
     */
    lap(name: string): void {
      const duration = performance.now() - startTime;
      laps.push({ name, duration });

      logger.debug('Performance lap', {
        operation: `performance.lap.${operation}.${name}`,
        durationMs: duration,
      });
    },

    /**
     * End timer and log total duration
     */
    end(context?: Record<string, unknown>): number {
      const totalDuration = performance.now() - startTime;

      logger.info('Performance timer complete', {
        operation: `performance.complete.${operation}`,
        totalDurationMs: totalDuration,
        laps: laps.map(lap => ({ [lap.name]: `${lap.duration}ms` })),
        ...context,
      });

      return totalDuration;
    },
  };
}

/**
 * Measure memory usage (Node.js only)
 *
 * @example
 * ```typescript
 * const before = measureMemory();
 * // Do memory-intensive work
 * await processLargeDataset();
 * const after = measureMemory();
 *
 * logger.info('Memory usage', {
 *   operation: 'memory.usage',
 *   heapUsedMB: (after.heapUsed - before.heapUsed) / 1024 / 1024
 * });
 * ```
 */
export function measureMemory(): NodeJS.MemoryUsage | null {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage();
  }
  return null;
}
