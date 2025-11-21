import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { sendSlackNotification, SlackNotifications } from '@/lib/slack-notifier';

/**
 * Clerk Health Check
 *
 * Tests the connection to Clerk authentication service
 * by verifying the API is reachable and credentials are valid.
 *
 * Returns:
 * - 200: Clerk API is accessible and credentials are valid
 * - 503: Clerk API is unreachable or credentials are invalid
 */
export async function GET() {
  const startTime = Date.now();

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

    if (!response.ok) {
      throw new Error(`Clerk API returned status ${response.status}`);
    }

    const responseTime = Date.now() - startTime;

    logger.debug('Clerk health check passed', {
      operation: 'health.clerk',
      responseTime,
    });

    return NextResponse.json(
      {
        status: 'healthy',
        service: 'clerk',
        message: 'Clerk API connection successful',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error(
      'Clerk health check failed',
      {
        operation: 'health.clerk',
        responseTime,
      },
      error instanceof Error ? error : new Error(String(error))
    );

    // Send Slack notification for authentication system failure
    await sendSlackNotification(
      SlackNotifications.serviceHealthCheckFailed({
        service: 'clerk',
        error: errorMessage,
        responseTime: `${responseTime}ms`,
      })
    );

    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'clerk',
        message: 'Clerk API connection failed',
        error: errorMessage,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
