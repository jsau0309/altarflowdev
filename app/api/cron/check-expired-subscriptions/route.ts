import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { getQuotaLimit } from "@/lib/subscription-helpers";

// This cron job runs daily to check for expired subscriptions and update quotas
/**
 * Handles a daily cron job to process expired or grace period church subscriptions and update their email quotas.
 *
 * In production, verifies the request's authorization header against a secret token. For each church with a "canceled" or "grace_period" subscription status and a non-null end date, checks if the subscription or grace period has ended. If so, updates the church's subscription status to "free" and adjusts the current month's email quota to the free tier limit. Returns a JSON response summarizing the number of churches checked and updates made.
 *
 * @returns A JSON response indicating success, the number of churches checked, and counts of status and quota updates, or an error message on failure.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (in production)
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const currentMonthYear = format(now, 'yyyy-MM');
    console.log(`Checking for expired subscriptions at: ${now.toISOString()}`);

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
    let quotasUpdated = 0;

    for (const church of churches) {
      if (!church.subscriptionEndsAt) continue;

      const subscriptionEnd = new Date(church.subscriptionEndsAt);
      const gracePeriodDays = church.subscriptionStatus === 'grace_period' ? 2 : 0;
      const gracePeriodEnd = new Date(subscriptionEnd);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

      // Check if the subscription/grace period has truly ended
      if (now > gracePeriodEnd) {
        console.log(`Church ${church.name} (${church.id}) subscription/grace period has ended`);
        
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

        // Update the current month's quota to free tier (4 campaigns)
        const existingQuota = await prisma.emailQuota.findFirst({
          where: {
            churchId: church.id,
            monthYear: currentMonthYear,
          },
        });

        if (existingQuota && existingQuota.quotaLimit !== 4) {
          await prisma.emailQuota.update({
            where: { id: existingQuota.id },
            data: { quotaLimit: 4 },
          });
          quotasUpdated++;
          console.log(`Updated quota for ${church.name} from ${existingQuota.quotaLimit} to 4 campaigns`);
        } else if (!existingQuota) {
          // Create quota if it doesn't exist
          await prisma.emailQuota.create({
            data: {
              churchId: church.id,
              monthYear: currentMonthYear,
              quotaLimit: 4,
              emailsSent: 0,
            },
          });
          quotasUpdated++;
          console.log(`Created free tier quota for ${church.name}`);
        }
      }
    }

    console.log(`Subscription check complete. Status updates: ${statusUpdated}, Quota updates: ${quotasUpdated}`);

    return NextResponse.json({
      success: true,
      message: `Checked ${churches.length} churches with canceled/grace_period status`,
      statusUpdated,
      quotasUpdated,
    });
  } catch (error) {
    console.error("Error checking expired subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to check expired subscriptions" },
      { status: 500 }
    );
  }
}