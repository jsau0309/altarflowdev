import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// This is a temporary endpoint for testing purposes
// In production, this would be a proper migration script
export async function POST() {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find the church
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
    });
    
    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // Only migrate if church is in pending_payment status and has no active subscription
    if (church.subscriptionStatus === 'pending_payment' && !church.subscriptionId) {
      // Set trial for 30 days from now
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);

      await prisma.church.update({
        where: { clerkOrgId: orgId },
        data: {
          subscriptionStatus: 'trial',
          trialEndsAt: trialEndsAt,
        }
      });

      return NextResponse.json({
        success: true,
        message: "Church migrated to trial status",
        trialEndsAt: trialEndsAt.toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Church cannot be migrated to trial",
        currentStatus: church.subscriptionStatus,
        hasSubscription: !!church.subscriptionId
      });
    }
  } catch (error) {
    console.error("[POST /api/admin/migrate-to-trial] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}