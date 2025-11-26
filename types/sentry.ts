/**
 * Sentry context types for structured logging and error tracking
 */

/**
 * Sentry SpanAttributeValue compatible type - matches @sentry/types SpanAttributeValue
 * Note: Sentry doesn't allow null, only undefined
 */
export type SpanAttributeValue = string | number | boolean | undefined;

/**
 * Base Sentry context type for arbitrary key-value pairs (for logging, not span attributes)
 */
export type SentryContext = Record<string, SpanAttributeValue>;

/**
 * Context for webhook event tracking
 */
export interface WebhookContext {
  eventType?: string;
  paymentIntentId?: string;
  churchId?: string;
  customerId?: string;
  subscriptionId?: string;
  invoiceId?: string;
  amount?: number;
  [key: string]: SpanAttributeValue;
}

/**
 * Context for payment operation tracking
 */
export interface PaymentContext {
  paymentIntentId?: string;
  customerId?: string;
  amount?: number;
  churchId?: string;
  currency?: string;
  status?: string;
  [key: string]: SpanAttributeValue;
}

/**
 * Context for API span attributes
 */
export interface ApiSpanAttributes {
  endpoint?: string;
  method?: string;
  status?: number;
  churchId?: string;
  userId?: string;
  [key: string]: SpanAttributeValue;
}

/**
 * Context for database span attributes
 */
export interface DatabaseSpanAttributes {
  operation?: string;
  model?: string;
  churchId?: string;
  duration?: number;
  [key: string]: SpanAttributeValue;
}

/**
 * Context for Stripe API span attributes
 */
export interface StripeSpanAttributes {
  stripeOperation?: string;
  stripeAccountId?: string;
  paymentIntentId?: string;
  customerId?: string;
  [key: string]: SpanAttributeValue;
}

/**
 * Context for email operation tracking
 */
export interface EmailContext {
  campaignId?: string;
  donationTypeId?: string;
  recipientCount?: number;
  churchId?: string;
  error?: string;
  [key: string]: SpanAttributeValue;
}

/**
 * Context for subscription change tracking
 */
export interface SubscriptionContext {
  churchId?: string;
  oldPlan?: string;
  newPlan?: string;
  reason?: string;
  action?: string;
  [key: string]: SpanAttributeValue;
}

/**
 * Context for cron job monitoring
 */
export interface CronContext {
  jobName?: string;
  scheduleId?: string;
  status?: 'in_progress' | 'ok' | 'error';
  duration?: number;
  error?: string;
  [key: string]: SpanAttributeValue;
}
