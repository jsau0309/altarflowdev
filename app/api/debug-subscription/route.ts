import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
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

    // Get church data
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
    });
    
    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // If there's a subscription ID, check its status in Stripe
    let stripeSubscription = null;
    if (church.subscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(church.subscriptionId);
        
        // Update local database based on Stripe's truth
        const stripeStatus = stripeSubscription.status;
        const shouldUpdate = 
          church.subscriptionStatus !== stripeStatus ||
          (stripeSubscription.cancel_at_period_end && !church.subscriptionEndsAt) ||
          (!stripeSubscription.cancel_at_period_end && church.subscriptionEndsAt);
          
        if (shouldUpdate) {
          const updateData: {
            subscriptionStatus: string;
            subscriptionEndsAt?: Date | null;
          } = {
            subscriptionStatus: stripeStatus,
          };
          
          if (stripeSubscription.cancel_at_period_end || stripeStatus === 'canceled') {
            updateData.subscriptionEndsAt = new Date(stripeSubscription.current_period_end * 1000);
          } else {
            updateData.subscriptionEndsAt = null;
          }
          
          const updated = await prisma.church.update({
            where: { id: church.id },
            data: updateData,
          });
          
          return NextResponse.json({
            message: "Database updated from Stripe",
            church: {
              id: updated.id,
              name: updated.name,
              subscriptionId: updated.subscriptionId,
              subscriptionStatus: updated.subscriptionStatus,
              subscriptionEndsAt: updated.subscriptionEndsAt,
              previousStatus: church.subscriptionStatus,
            },
            stripeData: {
              status: stripeSubscription.status,
              cancel_at_period_end: stripeSubscription.cancel_at_period_end,
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            }
          });
        }
      } catch (error) {
        logger.error('Error fetching Stripe subscription:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
      }
    }

    return NextResponse.json({
      church: {
        id: church.id,
        name: church.name,
        subscriptionId: church.subscriptionId,
        subscriptionStatus: church.subscriptionStatus,
        subscriptionPlan: church.subscriptionPlan,
        subscriptionEndsAt: church.subscriptionEndsAt,
        trialEndsAt: church.trialEndsAt,
        stripeCustomerId: church.stripeCustomerId,
      },
      stripeData: stripeSubscription ? {
        status: stripeSubscription.status,
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      } : null,
      needsUpdate: stripeSubscription ? church.subscriptionStatus !== stripeSubscription.status : false,
    });
  } catch (error) {
    logger.error('[GET /api/debug-subscription] Error:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}