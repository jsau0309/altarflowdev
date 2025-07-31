import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { hasPaidSubscription } from "@/lib/subscription-helpers";

export async function GET() {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get church data including subscription status
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { 
        id: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        subscriptionEndsAt: true,
      },
    });

    if (!church) {
      return NextResponse.json({ error: "Church not found" }, { status: 404 });
    }

    // Get current month date range
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const nextMonth = startOfMonth(new Date(now.getFullYear(), now.getMonth() + 1));
    
    // Count campaigns sent this month (not individual emails)
    const campaignsSentThisMonth = await prisma.emailCampaign.count({
      where: {
        churchId: church.id,
        status: { in: ["SENT", "SENDING"] },
        sentAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // Determine quota based on subscription status
    const isPaidChurch = hasPaidSubscription(church);
    const quotaLimit = isPaidChurch ? 10000 : 4; // 10,000 for paid, 4 for free
    
    return NextResponse.json({
      used: campaignsSentThisMonth,
      limit: quotaLimit,
      resetDate: format(nextMonth, "MMMM d, yyyy"),
      isPaid: isPaidChurch, // Flag for UI display
    });
  } catch (error) {
    console.error("Error fetching quota:", error);
    return NextResponse.json(
      { error: "Failed to fetch quota" },
      { status: 500 }
    );
  }
}