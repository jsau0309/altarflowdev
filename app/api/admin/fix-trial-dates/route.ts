import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// Temporary endpoint to fix trial dates for testing
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

    // If church is in trial status but has no trialEndsAt date, set it
    if (church.subscriptionStatus === 'trial' && !church.trialEndsAt) {
      // Set trial for 30 days from now
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);

      const updated = await prisma.church.update({
        where: { clerkOrgId: orgId },
        data: {
          trialEndsAt: trialEndsAt,
        }
      });

      return NextResponse.json({
        success: true,
        message: "Trial end date set successfully",
        trialEndsAt: trialEndsAt.toISOString(),
        daysRemaining: 30
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Church already has trial end date or is not in trial",
        currentStatus: church.subscriptionStatus,
        trialEndsAt: church.trialEndsAt
      });
    }
  } catch (error) {
    console.error("[POST /api/admin/fix-trial-dates] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}