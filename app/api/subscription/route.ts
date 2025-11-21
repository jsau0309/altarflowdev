import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: {
        name: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        subscriptionEndsAt: true,
        stripeCustomerId: true,
        trialEndsAt: true,
        setupFeePaid: true,
        setupFeeAmount: true,
        setupFeePaidAt: true,
        freeTrialStartedAt: true,
        promotionalEndsAt: true,
        promotionalCouponId: true,
      }
    });
    
    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // Calculate subscription info
    const now = new Date();
    let daysUntilEnd = null;
    let graceDaysRemaining = null;
    let trialDaysRemaining = null;
    let hasPromotionalPricing = false;

    if (church.subscriptionStatus === 'canceled' && church.subscriptionEndsAt) {
      const subEnd = new Date(church.subscriptionEndsAt);
      const daysLeft = Math.ceil((subEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      daysUntilEnd = Math.max(0, daysLeft);
    }

    if (church.subscriptionStatus === 'grace_period' && church.subscriptionEndsAt) {
      const gracePeriodEnd = new Date(church.subscriptionEndsAt);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 2); // 2 day grace period
      const daysLeft = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      graceDaysRemaining = Math.max(0, daysLeft);
    }

    // Calculate trial days remaining
    if (church.setupFeePaid && church.freeTrialStartedAt && !church.subscriptionEndsAt) {
      const trialEnd = church.trialEndsAt || new Date(church.freeTrialStartedAt);
      if (!church.trialEndsAt) {
        // Default: 30 days from trial start
        trialEnd.setDate(trialEnd.getDate() + 30);
      }
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      trialDaysRemaining = Math.max(0, daysLeft);
    }

    // Check if promotional pricing is active
    if (church.promotionalEndsAt) {
      hasPromotionalPricing = now < new Date(church.promotionalEndsAt);
    }

    return NextResponse.json({
      ...church,
      daysUntilEnd,
      graceDaysRemaining,
      trialDaysRemaining,
      hasPromotionalPricing,
      // For backward compatibility
      daysLeftInTrial: trialDaysRemaining,
    });
  } catch (error) {
    logger.error('[GET /api/subscription] Error:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}