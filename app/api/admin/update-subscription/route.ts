import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status, plan, customerId } = body;

    // Update the church subscription
    const church = await prisma.church.update({
      where: { clerkOrgId: orgId },
      data: {
        subscriptionStatus: status || 'active',
        subscriptionPlan: plan || 'monthly',
        stripeCustomerId: customerId,
        updatedAt: new Date()
      }
    });

    logger.info(`[Admin Update] Updated church ${church.id} to ${status} with ${plan} plan`, { operation: 'api.info' });

    return NextResponse.json({
      success: true,
      church: {
        id: church.id,
        name: church.name,
        subscriptionStatus: church.subscriptionStatus,
        subscriptionPlan: church.subscriptionPlan
      }
    });

  } catch (error) {
    logger.error('[POST /api/admin/update-subscription] Error:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}