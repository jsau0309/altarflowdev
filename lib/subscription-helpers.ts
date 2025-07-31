import { Church } from '@prisma/client';

/**
 * Determines whether a church currently has an active paid subscription.
 *
 * Considers the subscription status and end date, including grace periods for certain statuses. Returns true if the church's subscription is active, past due, or within the allowed grace period after cancellation or grace period status; otherwise, returns false.
 *
 * @param church - The church object containing subscription status and end date information
 * @returns True if the church has an active paid subscription; otherwise, false
 */
export function hasPaidSubscription(church: {
  subscriptionStatus: string;
  subscriptionEndsAt: Date | string | null;
}): boolean {
  const paidStatuses = ['active', 'past_due', 'canceled', 'grace_period'];
  
  if (!paidStatuses.includes(church.subscriptionStatus)) {
    return false;
  }
  
  // Active and past_due always have access
  if (church.subscriptionStatus === 'active' || church.subscriptionStatus === 'past_due') {
    return true;
  }
  
  // For canceled and grace_period, check if subscription has ended
  if (church.subscriptionStatus === 'canceled' || church.subscriptionStatus === 'grace_period') {
    const subscriptionEnd = church.subscriptionEndsAt ? new Date(church.subscriptionEndsAt) : null;
    const gracePeriodDays = church.subscriptionStatus === 'grace_period' ? 2 : 0;
    
    if (subscriptionEnd) {
      const gracePeriodEnd = new Date(subscriptionEnd);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);
      
      // If still within subscription or grace period
      return new Date() <= gracePeriodEnd;
    }
  }
  
  return false;
}

/**
 * Returns the email campaign quota limit for a church based on its subscription status.
 *
 * Returns 10,000 if the church has a paid subscription; otherwise, returns 4.
 *
 * @param church - The church object containing subscription status and end date information
 * @returns The maximum number of email campaigns allowed for the church
 */
export function getQuotaLimit(church: {
  subscriptionStatus: string;
  subscriptionEndsAt: Date | string | null;
}): number {
  return hasPaidSubscription(church) ? 10000 : 4;
}