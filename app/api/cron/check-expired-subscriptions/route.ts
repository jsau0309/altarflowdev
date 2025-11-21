import { NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { executeCronJob, verifyCronAuth } from '@/lib/sentry-cron';

// This cron job runs daily to check for expired subscriptions and update quotas
// It handles grace period expiration and subscription end dates
// Schedule: Daily at 2:00 AM UTC (0 2 * * *)
export async function GET() {
  // Verify cron authentication
  const authError = await verifyCronAuth();
  if (authError) return authError;

  // Execute cron job with Sentry monitoring
  return executeCronJob({
    monitorSlug: 'check-expired-subscriptions',
    schedule: '0 2 * * *',
    maxRuntimeMinutes: 5,
  }, async () => {
    const now = new Date();
    logger.info('Checking for expired subscriptions', {
      operation: 'cron.check_expired_subscriptions.start',
      timestamp: now.toISOString()
    });

    // Find churches with canceled or grace_period status
    const churches = await prisma.church.findMany({
      where: {
        subscriptionStatus: {
          in: ['canceled', 'grace_period']
        },
        subscriptionEndsAt: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    });

    let statusUpdated = 0;

    for (const church of churches) {
      if (!church.subscriptionEndsAt) continue;

      const subscriptionEnd = new Date(church.subscriptionEndsAt);
      const gracePeriodDays = church.subscriptionStatus === 'grace_period' ? 2 : 0;
      const gracePeriodEnd = new Date(subscriptionEnd);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

      // Check if the subscription/grace period has truly ended
      if (now > gracePeriodEnd) {
        logger.info('Church subscription expired - updating to free plan', {
          operation: 'cron.check_expired_subscriptions.expire',
          churchId: church.id,
          churchName: church.name,
          subscriptionStatus: church.subscriptionStatus,
          subscriptionEndsAt: church.subscriptionEndsAt
        });

        // Update church status to free
        await prisma.church.update({
          where: { id: church.id },
          data: {
            subscriptionStatus: 'free',
            subscriptionPlan: null,
            subscriptionId: null,
            // Keep subscriptionEndsAt for historical reference
          },
        });
        statusUpdated++;
      }
    }

    logger.info('Subscription check complete', {
      operation: 'cron.check_expired_subscriptions.complete',
      churchesChecked: churches.length,
      statusUpdated
    });

    return NextResponse.json({
      success: true,
      message: `Checked ${churches.length} churches with canceled/grace_period status`,
      statusUpdated,
    });
  });
}