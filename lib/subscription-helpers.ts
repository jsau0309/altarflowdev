import { Church } from '@prisma/client';

/**
 * Check if a church has an active paid subscription
 * This includes active, past_due, and canceled/grace_period within valid dates
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