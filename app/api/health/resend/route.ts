import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { sendSlackNotification, SlackNotifications } from '@/lib/slack-notifier';

/**
 * Resend Health Check
 *
 * Tests the connection to Resend email service
 * by verifying the API is reachable and credentials are valid.
 *
 * Returns:
 * - 200: Resend API is accessible and credentials are valid
 * - 503: Resend API is unreachable or credentials are invalid
 */
export async function GET() {
  const startTime = Date.now();

  try {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    // Test Resend API by checking API key validity
    // We'll use the /domains endpoint to verify connectivity
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Resend API returned status ${response.status}`);
    }

    const responseTime = Date.now() - startTime;

    logger.debug('Resend health check passed', {
      operation: 'health.resend',
      responseTime,
    });

    return NextResponse.json(
      {
        status: 'healthy',
        service: 'resend',
        message: 'Resend API connection successful',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error(
      'Resend health check failed',
      {
        operation: 'health.resend',
        responseTime,
      },
      error instanceof Error ? error : new Error(String(error))
    );

    // Send Slack notification for email system failure
    await sendSlackNotification(
      SlackNotifications.serviceHealthCheckFailed({
        service: 'resend',
        error: errorMessage,
        responseTime: `${responseTime}ms`,
      })
    );

    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'resend',
        message: 'Resend API connection failed',
        error: errorMessage,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
