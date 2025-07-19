import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Find the church with subscriptionId ending in 'iQHnwSLYkJCHIsK'
    const church = await prisma.church.findFirst({
      where: {
        subscriptionId: {
          endsWith: 'iQHnwSLYkJCHIsK'
        }
      }
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church with specified subscriptionId not found" },
        { status: 404 }
      );
    }

    // Update the church subscription status
    const updatedChurch = await prisma.church.update({
      where: { id: church.id },
      data: {
        subscriptionStatus: 'canceled',
        subscriptionEndsAt: church.trialEndsAt || undefined,
        updatedAt: new Date()
      }
    });

    console.log(`[Test Update] Updated church ${updatedChurch.id} (${updatedChurch.name})`);
    console.log(`- subscriptionStatus: ${updatedChurch.subscriptionStatus}`);
    console.log(`- subscriptionEndsAt: ${updatedChurch.subscriptionEndsAt}`);
    console.log(`- trialEndsAt: ${updatedChurch.trialEndsAt}`);

    return NextResponse.json({
      success: true,
      message: "Church subscription updated successfully",
      church: {
        id: updatedChurch.id,
        name: updatedChurch.name,
        subscriptionId: updatedChurch.subscriptionId,
        subscriptionStatus: updatedChurch.subscriptionStatus,
        subscriptionEndsAt: updatedChurch.subscriptionEndsAt,
        trialEndsAt: updatedChurch.trialEndsAt,
        stripeCustomerId: updatedChurch.stripeCustomerId
      }
    });

  } catch (error) {
    console.error("[GET /api/test-update-subscription] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Add POST method for safety (in case someone wants to trigger via POST)
export async function POST() {
  return GET();
}