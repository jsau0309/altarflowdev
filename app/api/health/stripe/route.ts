import { NextResponse } from 'next/server';
import { stripe } from '@/utils/stripe/config';
import { logger } from '@/lib/logger';
import { sendSlackNotification, SlackNotifications } from '@/lib/slack-notifier';

/**
 * Stripe Health Check
 *
 * Tests the connection to Stripe API and verifies
 * that the API key is valid and has necessary permissions.
 *
 * Returns:
 * - 200: Stripe API is accessible and credentials are valid
 * - 503: Stripe API is unreachable or credentials are invalid
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Test Stripe API by retrieving account information
    // This verifies both connectivity and API key validity
    await stripe.balance.retrieve();

    const responseTime = Date.now() - startTime;

    logger.debug('Stripe health check passed', {
      operation: 'health.stripe',
      responseTime,
    });

    return NextResponse.json(
      {
        status: 'healthy',
        service: 'stripe',
        message: 'Stripe API connection successful',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error(
      'Stripe health check failed',
      {
        operation: 'health.stripe',
        responseTime,
      },
      error instanceof Error ? error : new Error(String(error))
    );

    // Send Slack notification for payment system failure
    await sendSlackNotification(
      SlackNotifications.serviceHealthCheckFailed({
        service: 'stripe',
        error: errorMessage,
        responseTime: `${responseTime}ms`,
      })
    );

    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'stripe',
        message: 'Stripe API connection failed',
        error: errorMessage,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
