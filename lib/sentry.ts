// Sentry is optional - only import if available
let Sentry: any;
try {
  Sentry = require('@sentry/nextjs');
} catch (e) {
  // Sentry not installed - that's ok for development
  console.log('[Sentry] Not installed - error tracking disabled');
}

// Helper function to capture webhook events with context
export function captureWebhookEvent(
  eventType: string,
  context: Record<string, any>,
  level: 'info' | 'warning' | 'error' = 'info'
) {
  // Only capture important events in production with Sentry
  if (process.env.NODE_ENV === 'production' && Sentry) {
    const message = `Stripe Webhook: ${eventType}`;
    
    Sentry.withScope((scope: any) => {
      scope.setContext('webhook', context);
      scope.setTag('webhook.type', eventType);
      
      if (level === 'error') {
        Sentry.captureException(new Error(message));
      } else {
        Sentry.captureMessage(message, level);
      }
    });
  } else if (process.env.NODE_ENV === 'development') {
    // Log to console in development
    console.log(`[Webhook ${level}] ${eventType}`, context);
  }
}

// Helper for capturing payment errors
export function capturePaymentError(
  error: Error,
  context: {
    paymentIntentId?: string;
    customerId?: string;
    amount?: number;
    churchId?: string;
  }
) {
  if (Sentry) {
    Sentry.withScope((scope: any) => {
      scope.setContext('payment', context);
      scope.setTag('error.type', 'payment');
      Sentry.captureException(error);
    });
  } else {
    console.error('[Payment Error]', error, context);
  }
}