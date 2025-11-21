/**
 * Payment Domain Logger
 *
 * Specialized logger for payment-related operations with semantic methods
 * for common payment lifecycle events.
 *
 * @example
 * ```typescript
 * import { paymentLogger } from '@/lib/logger/domains/payment';
 *
 * paymentLogger.initiated({
 *   paymentIntentId: 'pi_123',
 *   amount: 5000,
 *   currency: 'usd',
 *   churchId: 'church_123'
 * });
 *
 * paymentLogger.succeeded({
 *   paymentIntentId: 'pi_123',
 *   amount: 5000,
 *   currency: 'usd',
 *   churchId: 'church_123',
 *   customerId: 'cus_123'
 * });
 * ```
 */

import { logger, LogContext } from '../index';

export interface PaymentLogContext extends LogContext {
  paymentIntentId?: string;
  customerId?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  paymentMethodType?: string;
  stripeAccountId?: string;
  churchId: string;
  donorId?: string;
  donationTypeId?: string;
  isAnonymous?: boolean;
  hasProcessingFee?: boolean;
  netAmount?: number;
  feeAmount?: number;
}

export const paymentLogger = {
  /**
   * Log when a payment is initiated
   */
  initiated: (context: PaymentLogContext) => {
    logger.info('Payment initiated', {
      operation: 'payment.initiated',
      ...context,
    });
  },

  /**
   * Log when a payment succeeds
   */
  succeeded: (context: PaymentLogContext) => {
    logger.info('Payment succeeded', {
      operation: 'payment.succeeded',
      ...context,
    });
  },

  /**
   * Log when a payment fails
   */
  failed: (context: PaymentLogContext, error: Error) => {
    logger.error('Payment failed', {
      operation: 'payment.failed',
      ...context,
    }, error);
  },

  /**
   * Log when a payment is refunded
   */
  refunded: (context: PaymentLogContext) => {
    logger.warn('Payment refunded', {
      operation: 'payment.refunded',
      ...context,
    });
  },

  /**
   * Log when a payment is partially refunded
   */
  partiallyRefunded: (context: PaymentLogContext & { refundAmount: number }) => {
    logger.warn('Payment partially refunded', {
      operation: 'payment.partially_refunded',
      ...context,
    });
  },

  /**
   * Log when a payment requires action (3D Secure, etc.)
   */
  requiresAction: (context: PaymentLogContext) => {
    logger.info('Payment requires action', {
      operation: 'payment.requires_action',
      ...context,
    });
  },

  /**
   * Log when a payment is canceled
   */
  canceled: (context: PaymentLogContext & { reason?: string }) => {
    logger.warn('Payment canceled', {
      operation: 'payment.canceled',
      ...context,
    });
  },

  /**
   * Log when payment processing takes too long
   */
  timeout: (context: PaymentLogContext & { duration: number }) => {
    logger.warn('Payment processing timeout', {
      operation: 'payment.timeout',
      ...context,
    });
  },

  /**
   * Log when a dispute is created
   */
  disputed: (context: PaymentLogContext & { disputeId: string; disputeReason?: string }) => {
    logger.warn('Payment disputed', {
      operation: 'payment.disputed',
      ...context,
    });
  },
};
