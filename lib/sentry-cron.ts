import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

/**
 * Sentry Cron Monitoring Utility
 *
 * Wraps cron job execution with Sentry monitoring to track:
 * - Job start/completion
 * - Job failures
 * - Job duration
 * - Job status (ok, error, timeout)
 *
 * @see https://docs.sentry.io/product/crons/
 */

export interface CronJobConfig {
  /**
   * Unique identifier for this cron job (matches Sentry monitor slug)
   * Examples: 'check-expired-subscriptions', 'cleanup-pending-donations'
   */
  monitorSlug: string;

  /**
   * Cron schedule expression (same as vercel.json)
   * Examples: '0 2 * * *' (daily at 2 AM), '0 3 * * 0' (weekly Sunday 3 AM)
   */
  schedule: string;

  /**
   * Maximum expected duration in minutes
   * Alert if job takes longer than this
   */
  maxRuntimeMinutes?: number;

  /**
   * Timezone for schedule (default: America/Los_Angeles)
   */
  timezone?: string;
}

export interface CronJobResult {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  success: boolean;
  data?: any;
  error?: Error;
  duration: number;
}

/**
 * Execute a cron job with Sentry monitoring
 *
 * @example
 * ```typescript
 * export async function GET() {
 *   return executeCronJob({
 *     monitorSlug: 'check-expired-subscriptions',
 *     schedule: '0 2 * * *',
 *     maxRuntimeMinutes: 5
 *   }, async () => {
 *     // Your cron job logic here
 *     const result = await checkExpiredSubscriptions();
 *     return { success: true, data: result };
 *   });
 * }
 * ```
 */
export async function executeCronJob<T>(
  config: CronJobConfig,
  handler: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const checkInId = Sentry.captureCheckIn({
    monitorSlug: config.monitorSlug,
    status: 'in_progress',
  }, {
    schedule: {
      type: 'crontab',
      value: config.schedule,
    },
    timezone: config.timezone || 'America/Los_Angeles',
    maxRuntime: config.maxRuntimeMinutes ? config.maxRuntimeMinutes * 60 : undefined,
    checkinMargin: 5, // Allow 5 minute margin for schedule variance
    failureIssueThreshold: 2, // Create issue after 2 consecutive failures
  });

  logger.info('Cron job started', {
    operation: `cron.${config.monitorSlug}.start`,
    monitorSlug: config.monitorSlug,
    schedule: config.schedule,
    checkInId,
  });

  try {
    const result = await handler();
    const duration = Date.now() - startTime;

    // Mark check-in as successful
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: config.monitorSlug,
      status: 'ok',
      duration: duration / 1000, // Sentry expects seconds
    });

    logger.info('Cron job completed successfully', {
      operation: `cron.${config.monitorSlug}.complete`,
      monitorSlug: config.monitorSlug,
      durationMs: duration,
      checkInId,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Mark check-in as failed
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: config.monitorSlug,
      status: 'error',
      duration: duration / 1000,
    });

    logger.error('Cron job failed', {
      operation: `cron.${config.monitorSlug}.error`,
      monitorSlug: config.monitorSlug,
      durationMs: duration,
      checkInId,
    }, error instanceof Error ? error : new Error(String(error)));

    // Re-throw to maintain error handling behavior
    throw error;
  }
}

/**
 * Verify cron authentication and return unauthorized response if invalid
 *
 * @example
 * ```typescript
 * export async function GET() {
 *   const authError = await verifyCronAuth();
 *   if (authError) return authError;
 *
 *   // Continue with cron job logic
 * }
 * ```
 */
export async function verifyCronAuth(): Promise<Response | null> {
  const { headers } = await import('next/headers');
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Always require authentication in production
  if (!cronSecret && process.env.NODE_ENV === 'production') {
    logger.error('CRON_SECRET is not configured in production!', {
      operation: 'cron.auth.missing_secret',
    });

    return Response.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  // Verify Bearer token matches CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron job access attempt', {
      operation: 'cron.auth.unauthorized',
      hasAuthHeader: !!authHeader,
    });

    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return null;
}
