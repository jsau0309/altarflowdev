import { logger } from '@/lib/logger';

/**
 * Business Metrics Tracking
 *
 * Track business-critical events for reporting and analytics.
 * Metrics are logged with specific operation names for easy querying in Sentry.
 *
 * @example
 * ```typescript
 * // Track donation
 * metrics.donation.completed({
 *   donationId: 'donation-123',
 *   amount: 100,
 *   method: 'card',
 *   recurring: false,
 *   churchId,
 * });
 *
 * // Track new member
 * metrics.member.created({
 *   memberId: 'member-456',
 *   churchId,
 * });
 *
 * // Track expense
 * metrics.expense.created({
 *   expenseId: 'expense-789',
 *   amount: 250,
 *   category: 'Utilities',
 *   churchId,
 * });
 * ```
 */

/**
 * Donation Metrics
 */
export const donationMetrics = {
  /**
   * Track completed donation
   */
  completed(data: {
    donationId: string;
    amount: number;
    currency?: string;
    method: 'card' | 'bank_transfer' | 'cash' | 'check';
    recurring: boolean;
    campaignId?: string;
    churchId: string;
    donorId?: string;
  }): void {
    logger.info('Donation completed', {
      operation: 'metrics.donation.completed',
      ...data,
      currency: data.currency || 'USD',
    });
  },

  /**
   * Track donation refund
   */
  refunded(data: {
    donationId: string;
    amount: number;
    reason?: string;
    churchId: string;
  }): void {
    logger.info('Donation refunded', {
      operation: 'metrics.donation.refunded',
      ...data,
    });
  },

  /**
   * Track recurring donation subscription
   */
  subscriptionCreated(data: {
    subscriptionId: string;
    amount: number;
    frequency: 'weekly' | 'monthly' | 'yearly';
    churchId: string;
    donorId?: string;
  }): void {
    logger.info('Recurring donation subscription created', {
      operation: 'metrics.donation.subscription_created',
      ...data,
    });
  },

  /**
   * Track recurring donation cancellation
   */
  subscriptionCanceled(data: {
    subscriptionId: string;
    reason?: string;
    churchId: string;
  }): void {
    logger.info('Recurring donation subscription canceled', {
      operation: 'metrics.donation.subscription_canceled',
      ...data,
    });
  },
};

/**
 * Member Activity Metrics
 */
export const memberMetrics = {
  /**
   * Track member creation
   */
  created(data: {
    memberId: string;
    source: 'manual' | 'import' | 'self_signup';
    churchId: string;
  }): void {
    logger.info('Member created', {
      operation: 'metrics.member.created',
      ...data,
    });
  },

  /**
   * Track member deletion
   */
  deleted(data: {
    memberId: string;
    reason?: string;
    churchId: string;
  }): void {
    logger.info('Member deleted', {
      operation: 'metrics.member.deleted',
      ...data,
    });
  },

  /**
   * Track member activity
   */
  activity(data: {
    memberId: string;
    action: 'viewed_reports' | 'viewed_donations' | 'downloaded_receipt' | 'updated_profile';
    churchId: string;
    duration?: number;
  }): void {
    logger.debug('Member activity', {
      operation: 'metrics.member.activity',
      ...data,
    });
  },
};

/**
 * Church/Organization Metrics
 */
export const organizationMetrics = {
  /**
   * Track new church signup
   */
  created(data: {
    churchId: string;
    churchName: string;
    plan: 'free' | 'pro';
    source?: string;
  }): void {
    logger.info('Church organization created', {
      operation: 'metrics.organization.created',
      ...data,
    });
  },

  /**
   * Track subscription upgrade
   */
  subscriptionUpgraded(data: {
    churchId: string;
    fromPlan: 'free' | 'pro';
    toPlan: 'free' | 'pro';
    priceId?: string;
  }): void {
    logger.info('Church subscription upgraded', {
      operation: 'metrics.organization.subscription_upgraded',
      ...data,
    });
  },

  /**
   * Track subscription downgrade/cancellation
   */
  subscriptionDowngraded(data: {
    churchId: string;
    fromPlan: 'free' | 'pro';
    toPlan: 'free' | 'pro';
    reason?: string;
  }): void {
    logger.info('Church subscription downgraded', {
      operation: 'metrics.organization.subscription_downgraded',
      ...data,
    });
  },

  /**
   * Track quota usage
   */
  quotaUsage(data: {
    churchId: string;
    quotaType: 'emails' | 'storage' | 'members';
    used: number;
    limit: number;
    percentageUsed: number;
  }): void {
    const severity = data.percentageUsed > 90 ? 'warn' : 'debug';

    logger[severity]('Church quota usage', {
      operation: 'metrics.organization.quota_usage',
      ...data,
    });
  },
};

/**
 * Expense Tracking Metrics
 */
export const expenseMetrics = {
  /**
   * Track expense creation
   */
  created(data: {
    expenseId: string;
    amount: number;
    category: string;
    hasReceipt: boolean;
    churchId: string;
  }): void {
    logger.info('Expense created', {
      operation: 'metrics.expense.created',
      ...data,
    });
  },

  /**
   * Track expense approval
   */
  approved(data: {
    expenseId: string;
    amount: number;
    approvedBy: string;
    churchId: string;
  }): void {
    logger.info('Expense approved', {
      operation: 'metrics.expense.approved',
      ...data,
    });
  },

  /**
   * Track expense rejection
   */
  rejected(data: {
    expenseId: string;
    amount: number;
    rejectedBy: string;
    reason?: string;
    churchId: string;
  }): void {
    logger.info('Expense rejected', {
      operation: 'metrics.expense.rejected',
      ...data,
    });
  },
};

/**
 * AI Features Metrics
 */
export const aiMetrics = {
  /**
   * Track AI report generation
   */
  reportGenerated(data: {
    reportType: 'donation_summary' | 'expense_summary' | 'campaign_analysis';
    tokensUsed: number;
    costUsd: number;
    churchId: string;
  }): void {
    logger.info('AI report generated', {
      operation: 'metrics.ai.report_generated',
      ...data,
    });
  },

  /**
   * Track AI email suggestion
   */
  emailSuggested(data: {
    emailType: 'campaign' | 'receipt' | 'notification';
    tokensUsed: number;
    costUsd: number;
    accepted: boolean;
    churchId: string;
  }): void {
    logger.info('AI email suggestion generated', {
      operation: 'metrics.ai.email_suggested',
      ...data,
    });
  },

  /**
   * Track receipt OCR
   */
  receiptOcrProcessed(data: {
    expenseId: string;
    vendor?: string;
    amount?: number;
    confidence?: 'high' | 'medium' | 'low';
    churchId: string;
  }): void {
    logger.info('Receipt OCR processed', {
      operation: 'metrics.ai.receipt_ocr',
      ...data,
    });
  },
};

/**
 * Combined metrics object for easy access
 */
export const metrics = {
  donation: donationMetrics,
  member: memberMetrics,
  organization: organizationMetrics,
  expense: expenseMetrics,
  ai: aiMetrics,
};

/**
 * Helper function to calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Helper function to format currency
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}
