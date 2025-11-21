import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from '@/lib/logger';

/**
 * This endpoint can be called by a cron job to check and update subscription statuses
 * It handles:
 * 1. Moving canceled subscriptions to grace_period when they expire
 * 2. Moving grace_period subscriptions to free after 2 days
 */
export async function POST() {
  try {
    const now = new Date();
    
    // Find all canceled subscriptions that have expired
    const expiredCanceledSubs = await prisma.church.findMany({
      where: {
        subscriptionStatus: 'canceled',
        subscriptionEndsAt: {
          lte: now
        }
      }
    });
    
    // Update them to grace_period
    for (const church of expiredCanceledSubs) {
      await prisma.church.update({
        where: { id: church.id },
        data: {
          subscriptionStatus: 'grace_period'
        }
      });
      logger.info('[Subscription Check] Church ${church.id} moved from canceled to grace_period', { operation: 'api.info' });
    }
    
    // Find all grace_period subscriptions that have exceeded 2 days
    const expiredGracePeriod = await prisma.church.findMany({
      where: {
        subscriptionStatus: 'grace_period',
        subscriptionEndsAt: {
          lte: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        }
      }
    });
    
    // Update them to free
    for (const church of expiredGracePeriod) {
      await prisma.church.update({
        where: { id: church.id },
        data: {
          subscriptionStatus: 'free',
          subscriptionPlan: null,
          subscriptionEndsAt: null
        }
      });
      logger.info('[Subscription Check] Church ${church.id} moved from grace_period to free', { operation: 'api.info' });
    }
    
    return NextResponse.json({
      success: true,
      updated: {
        toGracePeriod: expiredCanceledSubs.length,
        toFree: expiredGracePeriod.length
      }
    });
    
  } catch (error) {
    logger.error('[POST /api/subscription/check-status] Error:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}