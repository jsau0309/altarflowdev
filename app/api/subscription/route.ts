import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

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
      }
    });
    
    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // Calculate subscription info
    let daysUntilEnd = null;
    let graceDaysRemaining = null;
    
    if (church.subscriptionStatus === 'canceled' && church.subscriptionEndsAt) {
      const now = new Date();
      const subEnd = new Date(church.subscriptionEndsAt);
      const daysLeft = Math.ceil((subEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      daysUntilEnd = Math.max(0, daysLeft);
    }
    
    if (church.subscriptionStatus === 'grace_period' && church.subscriptionEndsAt) {
      const now = new Date();
      const gracePeriodEnd = new Date(church.subscriptionEndsAt);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 2); // 2 day grace period
      const daysLeft = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      graceDaysRemaining = Math.max(0, daysLeft);
    }

    return NextResponse.json({
      ...church,
      daysUntilEnd,
      graceDaysRemaining,
      // For backward compatibility
      daysLeftInTrial: null,
    });
  } catch (error) {
    console.error("[GET /api/subscription] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}