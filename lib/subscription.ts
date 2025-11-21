import { logger } from '@/lib/logger';
export type SubscriptionStatus = 'free' | 'active' | 'past_due' | 'canceled' | 'pending_payment' | 'inactive' | 'grace_period' | 'trial';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  isActive: boolean;
  isFree: boolean;
  isGracePeriod: boolean;
  isCanceled: boolean;
  isTrial: boolean;
  graceDaysRemaining?: number;
  trialDaysRemaining?: number;
  subscriptionEndsAt?: Date;
  canAccessPremiumFeatures: boolean;
  hasPromotionalPricing?: boolean;
  promotionalEndsAt?: Date;
}

/**
 * Calculate subscription information with new pricing model support
 */
export function getSubscriptionInfo(church: {
  subscriptionStatus: string;
  subscriptionEndsAt?: Date | null;
  freeTrialStartedAt?: Date | null;
  trialEndsAt?: Date | null;
  promotionalEndsAt?: Date | null;
  setupFeePaid?: boolean;
}): SubscriptionInfo {
  const now = new Date();
  let status = church.subscriptionStatus as SubscriptionStatus;

  // Calculate trial information
  let trialDaysRemaining: number | undefined;
  let isTrial = false;

  // If setup fee paid and trial started, check if still in trial period
  if (church.setupFeePaid && church.freeTrialStartedAt && !church.subscriptionEndsAt) {
    // FIXED: Properly clone date to avoid mutation bugs
    let trialEnd: Date;
    if (church.trialEndsAt) {
      trialEnd = new Date(church.trialEndsAt);
      // Validate that trialEndsAt is a valid date
      if (isNaN(trialEnd.getTime())) {
        logger.error('Invalid trialEndsAt date', { operation: 'subscription.invalid_trial_date', trialEndsAt: church.trialEndsAt });
        trialEnd = new Date(); // Fallback to current date if invalid
      }
    } else {
      // Default: 30 days from trial start (calculate without mutating)
      const trialStartDate = new Date(church.freeTrialStartedAt);
      const trialStartTime = trialStartDate.getTime();

      // Validate that freeTrialStartedAt is a valid date
      if (isNaN(trialStartTime)) {
        logger.error('Invalid freeTrialStartedAt date', { operation: 'subscription.invalid_started_date', freeTrialStartedAt: church.freeTrialStartedAt });
        // Skip trial calculation if date is invalid
        trialEnd = new Date(0); // Set to epoch to ensure trial appears expired
      } else {
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        trialEnd = new Date(trialStartTime + thirtyDaysInMs);
      }
    }

    const daysUntilTrialEnd = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilTrialEnd > 0) {
      isTrial = true;
      trialDaysRemaining = daysUntilTrialEnd;
      status = 'trial'; // Override status to show trial
    } else {
      // Trial has expired - reset status to free regardless of current value
      // This prevents the status from staying 'trial' indefinitely when trial ends
      if (status === 'trial' || status === 'pending_payment' || status === 'free') {
        status = 'free';
      }
    }
  }

  // Check basic status flags
  const isActive = status === 'active';
  const isFree = status === 'free';
  const isGracePeriod = status === 'grace_period';
  const isCanceled = status === 'canceled';

  let graceDaysRemaining: number | undefined;

  // Calculate grace period days if applicable
  if (isGracePeriod && church.subscriptionEndsAt) {
    const gracePeriodEnd = new Date(church.subscriptionEndsAt);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 2); // 2 day grace period
    const daysUntilGraceEnd = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilGraceEnd > 0) {
      graceDaysRemaining = daysUntilGraceEnd;
    }
  }

  // Check promotional pricing
  const hasPromotionalPricing = church.promotionalEndsAt ? now < new Date(church.promotionalEndsAt) : false;

  // Determine if they can access premium features
  // Premium features are available for active, trial, canceled (before end date), and grace period users
  let canAccessPremiumFeatures = false;

  if (isActive) {
    canAccessPremiumFeatures = true;
  } else if (isTrial) {
    canAccessPremiumFeatures = true;
  } else if (isCanceled && church.subscriptionEndsAt) {
    const subEnd = new Date(church.subscriptionEndsAt);
    canAccessPremiumFeatures = now <= subEnd;
  } else if (isGracePeriod) {
    canAccessPremiumFeatures = true;
  }

  return {
    status,
    isActive,
    isFree,
    isGracePeriod,
    isCanceled,
    isTrial,
    graceDaysRemaining,
    trialDaysRemaining,
    subscriptionEndsAt: church.subscriptionEndsAt ? new Date(church.subscriptionEndsAt) : undefined,
    canAccessPremiumFeatures,
    hasPromotionalPricing,
    promotionalEndsAt: church.promotionalEndsAt ? new Date(church.promotionalEndsAt) : undefined
  };
}

/**
 * Get accessible routes based on subscription status
 * Free users: only Dashboard, Flows, Members, and Settings
 * Premium users (active, canceled before end date, grace period): all routes
 */
export function getAccessibleRoutes(subscriptionInfo: SubscriptionInfo): string[] {
  const limitedRoutes = ['/flows', '/members', '/settings'];
  const allRoutes = [
    '/dashboard',
    '/donations', 
    '/expenses',
    '/members',
    '/reports',
    '/banking',
    '/flows',
    '/settings'
  ];
  
  // If they have premium access, give them all routes
  if (subscriptionInfo.canAccessPremiumFeatures) {
    return allRoutes;
  }
  
  // Otherwise, only limited routes
  return limitedRoutes;
}

/**
 * Check if a specific route is accessible
 */
export function isRouteAccessible(pathname: string, subscriptionInfo: SubscriptionInfo): boolean {
  const accessibleRoutes = getAccessibleRoutes(subscriptionInfo);
  
  // Check if the pathname starts with any of the accessible routes
  return accessibleRoutes.some(route => pathname.startsWith(route));
}