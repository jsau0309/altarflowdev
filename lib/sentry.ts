import * as Sentry from '@sentry/nextjs';

// Helper function to capture webhook events with context
export function captureWebhookEvent(
  eventType: string,
  context: Record<string, any>,
  level: 'info' | 'warning' | 'error' = 'info'
) {
  // Only capture important events in production
  if (process.env.NODE_ENV === 'production') {
    const message = `Stripe Webhook: ${eventType}`;
    
    Sentry.withScope((scope) => {
      scope.setContext('webhook', context);
      scope.setTag('webhook.type', eventType);
      
      if (level === 'error') {
        Sentry.captureException(new Error(message));
      } else {
        Sentry.captureMessage(message, level);
      }
    });
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
  Sentry.withScope((scope) => {
    scope.setContext('payment', context);
    scope.setTag('error.type', 'payment');
    Sentry.captureException(error);
  });
}