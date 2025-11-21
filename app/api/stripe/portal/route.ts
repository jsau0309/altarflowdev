import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
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

    // Get the church's Stripe customer ID
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { stripeCustomerId: true }
    });

    if (!church?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found" },
        { status: 404 }
      );
    }

    // Create a portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: church.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error('[POST /api/stripe/portal] Error:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}