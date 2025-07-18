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
      }
    });
    
    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(church);
  } catch (error) {
    console.error("[GET /api/subscription] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}