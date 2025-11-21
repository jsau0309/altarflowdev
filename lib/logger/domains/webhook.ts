/**
 * Webhook Domain Logger
 *
 * Specialized logger for webhook processing with lifecycle tracking.
 *
 * @example
 * ```typescript
 * import { webhookLogger } from '@/lib/logger/domains/webhook';
 *
 * webhookLogger.received({
 *   webhookType: 'stripe',
 *   eventType: 'payment_intent.succeeded',
 *   eventId: 'evt_123',
 *   requestId: crypto.randomUUID()
 * });
 *
 * webhookLogger.verified({
 *   webhookType: 'stripe',
 *   eventType: 'payment_intent.succeeded',
 *   eventId: 'evt_123',
 *   processingTime: 45
 * });
 * ```
 */

import { logger, LogContext } from '../index';

export type WebhookType = 'stripe' | 'clerk' | 'resend' | 'twilio' | 'other';

export interface WebhookLogContext extends LogContext {
  webhookType: WebhookType;
  eventType: string;
  eventId: string;
  churchId?: string;
  processingTime?: number;
  signature?: string;
  signatureValid?: boolean;
  retryAttempt?: number;
  webhookUrl?: string;
}

export const webhookLogger = {
  /**
   * Log when a webhook is received
   */
  received: (context: WebhookLogContext) => {
    logger.info('Webhook received', {
      operation: 'webhook.received',
      ...context,
    });
  },

  /**
   * Log when webhook signature is verified
   */
  verified: (context: WebhookLogContext) => {
    logger.info('Webhook signature verified', {
      operation: 'webhook.verified',
      ...context,
    });
  },

  /**
   * Log when webhook signature verification fails
   */
  verificationFailed: (context: WebhookLogContext, error?: Error) => {
    if (error) {
      logger.error('Webhook signature verification failed', {
        operation: 'webhook.verification_failed',
        ...context,
      }, error);
    } else {
      logger.warn('Webhook signature verification failed', {
        operation: 'webhook.verification_failed',
        ...context,
      });
    }
  },

  /**
   * Log when webhook processing fails
   */
  failed: (context: WebhookLogContext, error: Error) => {
    logger.error('Webhook processing failed', {
      operation: 'webhook.failed',
      ...context,
    }, error);
  },

  /**
   * Log when webhook processing completes successfully
   */
  completed: (context: WebhookLogContext) => {
    logger.info('Webhook processed successfully', {
      operation: 'webhook.completed',
      ...context,
    });
  },

  /**
   * Log when webhook processing is skipped (duplicate, etc.)
   */
  skipped: (context: WebhookLogContext & { reason: string }) => {
    logger.info('Webhook processing skipped', {
      operation: 'webhook.skipped',
      ...context,
    });
  },

  /**
   * Log when webhook processing is retried
   */
  retried: (context: WebhookLogContext) => {
    logger.warn('Webhook processing retried', {
      operation: 'webhook.retried',
      ...context,
    });
  },

  /**
   * Log when webhook event type is unknown/unsupported
   */
  unknownEvent: (context: WebhookLogContext) => {
    logger.warn('Unknown webhook event type', {
      operation: 'webhook.unknown_event',
      ...context,
    });
  },
};
