import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { logger } from '@/lib/logger';

/**
 * POST /api/setup-fee
 *
 * Mark setup fee as paid and start the 30-day free trial
 * This endpoint should be called after the setup fee has been paid (externally)
 */
export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { setupFeeAmount } = body; // Amount in cents, e.g., 9900 for $99

    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // Calculate trial end date (30 days from now)
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 30);

    // Update church with setup fee info and start trial
    const updatedChurch = await prisma.church.update({
      where: { clerkOrgId: orgId },
      data: {
        setupFeePaid: true,
        setupFeeAmount: setupFeeAmount || null,
        setupFeePaidAt: now,
        freeTrialStartedAt: now,
        trialEndsAt: trialEnd,
        subscriptionStatus: 'trial', // Set status to trial
      },
    });

    return NextResponse.json({
      success: true,
      message: "Setup fee marked as paid, trial started",
      trialEndsAt: trialEnd,
      church: {
        setupFeePaid: updatedChurch.setupFeePaid,
        freeTrialStartedAt: updatedChurch.freeTrialStartedAt,
        trialEndsAt: updatedChurch.trialEndsAt,
        subscriptionStatus: updatedChurch.subscriptionStatus,
      }
    });
  } catch (error) {
    logger.error('[POST /api/setup-fee] Error:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/setup-fee
 *
 * Check if setup fee has been paid for the current organization
 */
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
        setupFeePaid: true,
        setupFeeAmount: true,
        setupFeePaidAt: true,
        freeTrialStartedAt: true,
        trialEndsAt: true,
      },
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(church);
  } catch (error) {
    logger.error('[GET /api/setup-fee] Error:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
