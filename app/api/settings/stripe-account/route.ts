import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// GET /api/settings/stripe-account - Get Stripe account status from database
export async function GET() {
  try {
    const { orgId } = await auth();
    
    if (!orgId) {
      return NextResponse.json(
        { error: "Unauthorized - No organization" },
        { status: 401 }
      );
    }

    // Fetch Stripe account from database
    const stripeAccount = await prisma.stripeConnectAccount.findUnique({
      where: { churchId: orgId },
      select: {
        id: true,
        stripeAccountId: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        verificationStatus: true,
        detailsSubmitted: true,
      }
    });

    if (!stripeAccount) {
      return NextResponse.json({ account: null });
    }

    return NextResponse.json({ 
      account: stripeAccount 
    });
  } catch (error) {
    console.error("[GET /api/settings/stripe-account] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}