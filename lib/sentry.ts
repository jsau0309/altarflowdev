import * as Sentry from "@sentry/nextjs";

// Get the logger from Sentry
const { logger } = Sentry;

// Helper function to capture webhook events with context
export function captureWebhookEvent(
  eventType: string,
  context: Record<string, any>,
  level: 'info' | 'warning' | 'error' = 'info'
) {
  // Use structured logging with Sentry
  if (level === 'error') {
    logger.error('Stripe Webhook Error', {
      eventType,
      ...context
    });
    
    // Also capture as exception for error tracking
    Sentry.captureException(new Error(`Stripe Webhook: ${eventType}`), {
      contexts: {
        webhook: context
      },
      tags: {
        'webhook.type': eventType
      }
    });
  } else if (level === 'warning') {
    logger.warn('Stripe Webhook Warning', {
      eventType,
      ...context
    });
  } else {
    logger.info('Stripe Webhook Event', {
      eventType,
      ...context
    });
  }
}

// Helper for capturing payment errors with span instrumentation
export function capturePaymentError(
  error: Error,
  context: {
    paymentIntentId?: string;
    customerId?: string;
    amount?: number;
    churchId?: string;
  }
) {
  // Log structured error
  logger.error('Payment processing failed', {
    error: error.message,
    stack: error.stack,
    ...context
  });
  
  // Capture exception with context
  Sentry.captureException(error, {
    contexts: {
      payment: context
    },
    tags: {
      'error.type': 'payment',
      'payment.church_id': context.churchId || 'unknown'
    }
  });
}

// Helper to create spans for API operations
export function withApiSpan<T>(
  operation: string,
  attributes: Record<string, any>,
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
  attributes: Record<string, any>,
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
  attributes: Record<string, any>,
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
    recipientCount?: number;
    churchId?: string;
    error?: string;
  }
) {
  const logData = {
    operation,
    ...context
  };
  
  if (context.error) {
    logger.error(logger.fmt`Email operation failed: ${operation}`, logData);
  } else {
    logger.info(logger.fmt`Email operation: ${operation}`, logData);
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
  logger.info(logger.fmt`Subscription ${action} for church ${context.churchId}`, {
    action,
    ...context
  });
  
  // Also send as a breadcrumb for better debugging
  Sentry.addBreadcrumb({
    category: 'subscription',
    message: `Subscription ${action}`,
    level: 'info',
    data: context
  });
}

// Helper for tracking critical business metrics
export function trackMetric(
  name: string,
  value: number,
  unit: string,
  tags: Record<string, string> = {}
) {
  logger.debug(logger.fmt`Metric: ${name} = ${value} ${unit}`, {
    metric: name,
    value,
    unit,
    ...tags
  });
  
  // Add metric as breadcrumb for debugging
  Sentry.addBreadcrumb({
    category: 'metric',
    message: `${name}: ${value} ${unit}`,
    level: 'debug',
    data: { value, unit, ...tags }
  });
}

// Export logger for direct use
export { logger };