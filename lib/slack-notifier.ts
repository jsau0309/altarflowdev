import 'server-only';
import { logger } from '@/lib/logger';

/**
 * Slack Notification Utility
 *
 * Sends critical error notifications to Slack channels
 * Integrates with Sentry for automatic error escalation
 *
 * ⚠️ SERVER-SIDE ONLY: This module uses Node.js fetch and process.env
 * and cannot be imported in client components.
 *
 * Setup:
 * 1. Create Slack App: https://api.slack.com/apps
 * 2. Add Incoming Webhooks feature
 * 3. Create webhook URL for your channel
 * 4. Add SLACK_WEBHOOK_URL to environment variables
 *
 * @see https://api.slack.com/messaging/webhooks
 */

export interface SlackNotification {
  /**
   * Notification title (appears as bold header)
   */
  title: string;

  /**
   * Notification message (supports markdown)
   */
  message: string;

  /**
   * Severity level (determines color and emoji)
   * - critical: Red, 🔥 (payment failures, database errors)
   * - warning: Orange, ⚠️ (slow queries, high error rate)
   * - info: Blue, ℹ️ (deployments, cron completions)
   */
  severity: 'critical' | 'warning' | 'info';

  /**
   * Optional metadata fields (displayed as key-value pairs)
   */
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean; // Display in columns if true
  }>;

  /**
   * Optional link to Sentry issue or dashboard
   */
  link?: {
    text: string;
    url: string;
  };
}

/**
 * Send notification to Slack
 *
 * @example
 * ```typescript
 * await sendSlackNotification({
 *   title: 'Payment Failure',
 *   message: 'Stripe payment failed for donation',
 *   severity: 'critical',
 *   fields: [
 *     { title: 'Amount', value: '$100', short: true },
 *     { title: 'Church', value: 'First Baptist', short: true },
 *     { title: 'Error', value: error.message, short: false }
 *   ],
 *   link: { text: 'View in Sentry', url: sentryUrl }
 * });
 * ```
 */
export async function sendSlackNotification(
  notification: SlackNotification
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  // Skip if webhook not configured
  if (!webhookUrl) {
    logger.debug('Slack webhook not configured - skipping notification', {
      operation: 'slack.notification.skip',
      title: notification.title,
    });
    return;
  }

  // Validate webhook URL format
  if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
    logger.error('Invalid Slack webhook URL format', {
      operation: 'slack.notification.invalid_url',
      title: notification.title,
    });
    return;
  }

  // Map severity to Slack color and emoji
  const severityConfig = {
    critical: { color: '#ff0000', emoji: '🔥' },
    warning: { color: '#ff9900', emoji: '⚠️' },
    info: { color: '#0099ff', emoji: 'ℹ️' },
  };

  const config = severityConfig[notification.severity];

  // Build Slack message with modern format (no deprecated actions)
  const attachment: any = {
    color: config.color,
    title: `${config.emoji} ${notification.title}`,
    text: notification.message,
    footer: 'AltarFlow Monitoring',
    footer_icon: 'https://altarflow.com/favicon.ico',
    ts: Math.floor(Date.now() / 1000),
  };

  // Add optional fields
  if (notification.fields && notification.fields.length > 0) {
    attachment.fields = notification.fields;
  }

  // Add optional link as part of the message text (actions are deprecated)
  if (notification.link) {
    attachment.text += `\n\n<${notification.link.url}|${notification.link.text}>`;
  }

  try {
    const payload = { attachments: [attachment] };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`Slack API error: ${response.status} ${response.statusText} - ${responseText}`);
    }

    logger.debug('Slack notification sent successfully', {
      operation: 'slack.notification.success',
      title: notification.title,
      severity: notification.severity,
    });
  } catch (error) {
    // Log error but don't throw - notification failures shouldn't break app
    logger.error('Failed to send Slack notification', {
      operation: 'slack.notification.error',
      title: notification.title,
    }, error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Predefined notification templates for common scenarios
 */
export const SlackNotifications = {
  /**
   * Payment failure notification
   */
  paymentFailed: (details: {
    amount: number;
    churchName: string;
    error: string;
    sentryUrl?: string;
  }): SlackNotification => ({
    title: 'Payment Failure',
    message: `A donation payment has failed and requires immediate attention.`,
    severity: 'critical',
    fields: [
      { title: 'Amount', value: `$${details.amount.toFixed(2)}`, short: true },
      { title: 'Church', value: details.churchName, short: true },
      { title: 'Error', value: details.error, short: false },
    ],
    link: details.sentryUrl
      ? { text: 'View in Sentry', url: details.sentryUrl }
      : undefined,
  }),

  /**
   * Slow query notification
   */
  slowQuery: (details: {
    query: string;
    duration: number;
    endpoint: string;
  }): SlackNotification => ({
    title: 'Slow Database Query',
    message: `A database query took longer than expected and may impact performance.`,
    severity: 'warning',
    fields: [
      { title: 'Duration', value: `${details.duration}ms`, short: true },
      { title: 'Endpoint', value: details.endpoint, short: true },
      { title: 'Query', value: `\`${details.query.substring(0, 100)}...\``, short: false },
    ],
  }),

  /**
   * High error rate notification
   */
  highErrorRate: (details: {
    errorRate: number;
    timeWindow: string;
    sentryUrl?: string;
  }): SlackNotification => ({
    title: 'High Error Rate Detected',
    message: `Error rate has exceeded threshold and may indicate a production issue.`,
    severity: 'critical',
    fields: [
      { title: 'Error Rate', value: `${details.errorRate.toFixed(1)}%`, short: true },
      { title: 'Time Window', value: details.timeWindow, short: true },
    ],
    link: details.sentryUrl
      ? { text: 'View Dashboard', url: details.sentryUrl }
      : undefined,
  }),

  /**
   * Cron job failure notification
   */
  cronJobFailed: (details: {
    jobName: string;
    error: string;
    sentryUrl?: string;
  }): SlackNotification => ({
    title: 'Cron Job Failed',
    message: `A scheduled cron job has failed to complete.`,
    severity: 'critical',
    fields: [
      { title: 'Job', value: details.jobName, short: true },
      { title: 'Error', value: details.error, short: false },
    ],
    link: details.sentryUrl
      ? { text: 'View in Sentry', url: details.sentryUrl }
      : undefined,
  }),

  /**
   * Database connection error notification
   */
  databaseError: (details: {
    error: string;
    operation: string;
    sentryUrl?: string;
  }): SlackNotification => ({
    title: 'Database Connection Error',
    message: `Database connection or query has failed. Application may be degraded.`,
    severity: 'critical',
    fields: [
      { title: 'Operation', value: details.operation, short: true },
      { title: 'Error', value: details.error, short: false },
    ],
    link: details.sentryUrl
      ? { text: 'View in Sentry', url: details.sentryUrl }
      : undefined,
  }),

  /**
   * Third-party service health check failure
   */
  serviceHealthCheckFailed: (details: {
    service: 'supabase' | 'stripe' | 'clerk' | 'resend';
    error: string;
    responseTime?: string;
  }): SlackNotification => {
    const serviceLabels = {
      supabase: { name: 'Supabase Database', emoji: '🗄️' },
      stripe: { name: 'Stripe Payments', emoji: '💳' },
      clerk: { name: 'Clerk Authentication', emoji: '🔐' },
      resend: { name: 'Resend Email', emoji: '📧' },
    };

    const serviceInfo = serviceLabels[details.service];

    return {
      title: `${serviceInfo.emoji} ${serviceInfo.name} Health Check Failed`,
      message: `The ${serviceInfo.name} integration health check has failed. This may impact user functionality.`,
      severity: 'critical',
      fields: [
        { title: 'Service', value: serviceInfo.name, short: true },
        { title: 'Response Time', value: details.responseTime || 'N/A', short: true },
        { title: 'Error', value: details.error, short: false },
        {
          title: 'Impact',
          value: getServiceImpact(details.service),
          short: false
        },
      ],
    };
  },

  /**
   * Third-party service health check recovered
   */
  serviceHealthCheckRecovered: (details: {
    service: 'supabase' | 'stripe' | 'clerk' | 'resend';
    responseTime?: string;
  }): SlackNotification => {
    const serviceLabels = {
      supabase: { name: 'Supabase Database', emoji: '🗄️' },
      stripe: { name: 'Stripe Payments', emoji: '💳' },
      clerk: { name: 'Clerk Authentication', emoji: '🔐' },
      resend: { name: 'Resend Email', emoji: '📧' },
    };

    const serviceInfo = serviceLabels[details.service];

    return {
      title: `✅ ${serviceInfo.name} Health Check Recovered`,
      message: `The ${serviceInfo.name} integration has recovered and is now operational.`,
      severity: 'info',
      fields: [
        { title: 'Service', value: serviceInfo.name, short: true },
        { title: 'Response Time', value: details.responseTime || 'N/A', short: true },
        { title: 'Status', value: 'Service is now healthy', short: false },
      ],
    };
  },
};

/**
 * Helper function to describe the impact of each service failure
 */
function getServiceImpact(service: 'supabase' | 'stripe' | 'clerk' | 'resend'): string {
  const impacts = {
    supabase: 'Users cannot access data. All database operations will fail.',
    stripe: 'Payment processing unavailable. Donations cannot be processed.',
    clerk: 'User authentication broken. Login/signup will fail.',
    resend: 'Email delivery stopped. Campaigns and notifications cannot be sent.',
  };
  return impacts[service];
}
