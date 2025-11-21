import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { sendSlackNotification, SlackNotifications } from '@/lib/slack-notifier';

/**
 * Supabase Database Health Check
 *
 * Tests the connection to the Supabase PostgreSQL database
 * via Prisma ORM and verifies query execution.
 *
 * Returns:
 * - 200: Database is accessible and queries execute successfully
 * - 503: Database is unreachable or queries fail
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Simple query to test database connection
    // Uses $queryRaw to test actual database connectivity
    await prisma.$queryRaw`SELECT 1`;

    const responseTime = Date.now() - startTime;

    logger.debug('Supabase health check passed', {
      operation: 'health.supabase',
      responseTime,
    });

    return NextResponse.json(
      {
        status: 'healthy',
        service: 'supabase',
        message: 'Database connection successful',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error(
      'Supabase health check failed',
      {
        operation: 'health.supabase',
        responseTime,
      },
      error instanceof Error ? error : new Error(String(error))
    );

    // Send Slack notification for critical database failure
    await sendSlackNotification(
      SlackNotifications.serviceHealthCheckFailed({
        service: 'supabase',
        error: errorMessage,
        responseTime: `${responseTime}ms`,
      })
    );

    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'supabase',
        message: 'Database connection failed',
        error: errorMessage,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
