import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { Prisma } from "@prisma/client";
import { logger } from '@/lib/logger';

export async function POST() {
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
    
    if (!church || !church.subscriptionId) {
      return NextResponse.json(
        { error: "Church or subscription not found" },
        { status: 404 }
      );
    }

    // Fetch subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(church.subscriptionId);
    
    // Determine status based on Stripe's data
    const status = stripeSubscription.status === 'active' && stripeSubscription.cancel_at_period_end 
      ? 'canceled' 
      : stripeSubscription.status;
    
    // Update database
    const updateData: Prisma.ChurchUpdateInput = {
      subscriptionStatus: status,
    };
    
    // Set subscription end date for canceled subscriptions
    if (stripeSubscription.cancel_at_period_end || status === 'canceled') {
      updateData.subscriptionEndsAt = new Date(stripeSubscription.current_period_end * 1000);
    } else {
      updateData.subscriptionEndsAt = null;
    }
    
    const updated = await prisma.church.update({
      where: { id: church.id },
      data: updateData,
    });
    
    return NextResponse.json({
      success: true,
      message: "Subscription synced successfully",
      church: {
        id: updated.id,
        name: updated.name,
        previousStatus: church.subscriptionStatus,
        newStatus: updated.subscriptionStatus,
        subscriptionEndsAt: updated.subscriptionEndsAt,
      },
      stripe: {
        status: stripeSubscription.status,
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      }
    });
  } catch (error) {
    logger.error('[POST /api/sync-subscription] Error:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to sync subscription", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}