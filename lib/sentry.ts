import * as Sentry from "@sentry/nextjs";
import { logger } from './logger';
import { hashChurchId } from './logger/middleware';
import type { SentryContext, ApiSpanAttributes, DatabaseSpanAttributes, StripeSpanAttributes } from '@/types/sentry';

// Helper function to capture webhook events with context
// Note: This is now a compatibility wrapper. Prefer using webhookLogger directly.
export function captureWebhookEvent(
  eventType: string,
  context: SentryContext,
  level: 'info' | 'warning' | 'error' = 'info'
) {
  // Use new structured logging with automatic sanitization
  const churchId = typeof context.churchId === 'string' ? context.churchId : undefined;
  const sanitizedContext = {
    ...context,
    churchId: churchId ? hashChurchId(churchId) : undefined,
  };

  if (level === 'error') {
    logger.error('Stripe Webhook Error', {
      operation: 'webhook.stripe.error',
      eventType,
      ...sanitizedContext
    });
  } else if (level === 'warning') {
    logger.warn('Stripe Webhook Warning', {
      operation: 'webhook.stripe.warning',
      eventType,
      ...sanitizedContext
    });
  } else {
    logger.info('Stripe Webhook Event', {
      operation: 'webhook.stripe.info',
      eventType,
      ...sanitizedContext
    });
  }
}

// Helper for capturing payment errors with span instrumentation
// Note: This is now a compatibility wrapper. Prefer using paymentLogger.failed() directly.
export function capturePaymentError(
  error: Error,
  context: {
    paymentIntentId?: string;
    customerId?: string;
    amount?: number;
    churchId?: string;
  }
) {
  // Use new structured logging with automatic sanitization
  logger.error('Payment processing failed', {
    operation: 'payment.error',
    paymentIntentId: context.paymentIntentId,
    customerId: context.customerId,
    amount: context.amount,
    churchId: context.churchId ? hashChurchId(context.churchId) : undefined,
  }, error);
}

// Helper to create spans for API operations
export function withApiSpan<T>(
  operation: string,
  attributes: ApiSpanAttributes,
  callback: () => T | Promise<T>
): T | Promise<T> {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: operation,
      attributes
    },
    callback
  );
}

// Helper to create spans for database operations
export function withDatabaseSpan<T>(
  operation: string,
  attributes: DatabaseSpanAttributes,
  callback: () => T | Promise<T>
): T | Promise<T> {
  return Sentry.startSpan(
    {
      op: 'db.query',
      name: operation,
      attributes
    },
    callback
  );
}

// Helper for Stripe API calls with automatic span creation
export function withStripeSpan<T>(
  operation: string,
  attributes: StripeSpanAttributes,
  callback: () => T | Promise<T>
): T | Promise<T> {
  return Sentry.startSpan(
    {
      op: 'stripe.api',
      name: operation,
      attributes: {
        'stripe.operation': operation,
        ...attributes
      }
    },
    callback
  );
}

// Helper to log and track email operations
export function logEmailOperation(
  operation: 'send' | 'queue' | 'bounce' | 'delivered',
  context: {
    campaignId?: string;
    donationTypeId?: string;
    recipientCount?: number;
    churchId?: string;
    error?: string;
  }
) {
  const sanitizedContext = {
    operation: `email.${operation}`,
    campaignId: context.campaignId,
    donationTypeId: context.donationTypeId,
    recipientCount: context.recipientCount,
    churchId: context.churchId ? hashChurchId(context.churchId) : undefined,
  };

  if (context.error) {
    logger.error(`Email operation failed: ${operation}`, sanitizedContext);
  } else {
    logger.info(`Email operation: ${operation}`, sanitizedContext);
  }
}

// Helper for tracking subscription changes
export function trackSubscriptionChange(
  action: string,
  context: {
    churchId: string;
    oldPlan?: string;
    newPlan?: string;
    reason?: string;
  }
) {
  logger.info(`Subscription ${action}`, {
    operation: 'subscription.change',
    action,
    churchId: hashChurchId(context.churchId),
    oldPlan: context.oldPlan,
    newPlan: context.newPlan,
    reason: context.reason,
  });

  // Breadcrumb is automatically added by logger integration
}

// Helper for tracking critical business metrics
export function trackMetric(
  name: string,
  value: number,
  unit: string,
  tags: Record<string, string> = {}
) {
  logger.debug(`Metric: ${name} = ${value} ${unit}`, {
    operation: 'metric.track',
    metric: name,
    value,
    unit,
    ...tags
  });

  // Breadcrumb is automatically added by logger integration
}

// Export logger and domain loggers for convenience
export { logger };
export { webhookLogger } from './logger/domains/webhook';
export { paymentLogger } from './logger/domains/payment';
export { databaseLogger } from './logger/domains/database';
export { authLogger } from './logger/domains/auth';