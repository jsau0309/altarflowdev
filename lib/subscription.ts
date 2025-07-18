import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'paused';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  plan: string | null;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
  isActive: boolean;
  daysLeftInTrial: number | null;
}

/**
 * Get the current organization's subscription info
 */
export async function getSubscriptionInfo(): Promise<SubscriptionInfo | null> {
  const { orgId } = await auth();
  
  if (!orgId) {
    return null;
  }

  const church = await prisma.church.findUnique({
    where: { clerkOrgId: orgId },
    select: {
      subscriptionStatus: true,
      subscriptionPlan: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
    },
  });

  if (!church) {
    return null;
  }

  // Calculate days left in trial
  let daysLeftInTrial = null;
  if (church.subscriptionStatus === 'trial' && church.trialEndsAt) {
    const now = new Date();
    const trialEnd = new Date(church.trialEndsAt);
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    daysLeftInTrial = Math.max(0, daysLeft);
  }

  // Determine if subscription is active (trial, active, or past_due)
  const isActive = ['trial', 'active', 'past_due'].includes(church.subscriptionStatus);

  return {
    status: church.subscriptionStatus as SubscriptionStatus,
    plan: church.subscriptionPlan,
    trialEndsAt: church.trialEndsAt,
    subscriptionEndsAt: church.subscriptionEndsAt,
    isActive,
    daysLeftInTrial,
  };
}

/**
 * Check if the current organization has an active subscription
 * Redirects to billing page if not active
 */
export async function requireActiveSubscription() {
  const subscription = await getSubscriptionInfo();
  
  if (!subscription || !subscription.isActive) {
    redirect('/billing?reason=subscription_required');
  }
  
  return subscription;
}

/**
 * Check if a specific feature is available for the current plan
 */
export async function hasFeature(feature: string): Promise<boolean> {
  const subscription = await getSubscriptionInfo();
  
  if (!subscription || !subscription.isActive) {
    return false;
  }

  // For MVP, all features are available with any active subscription
  // Later, you can implement plan-based feature gating
  // Example:
  // const planFeatures = {
  //   starter: ['basic_features'],
  //   pro: ['basic_features', 'advanced_features'],
  //   enterprise: ['all_features'],
  // };
  
  return true;
}

/**
 * Get billing portal URL for the current organization
 */
export async function getBillingPortalUrl(): Promise<string> {
  const { orgId } = await auth();
  
  if (!orgId) {
    throw new Error('No organization found');
  }

  // For Clerk Billing, you would use their API to generate a billing portal session
  // This is a placeholder - replace with actual Clerk Billing API call
  return `/organizations/${orgId}/billing`;
}