import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { getQuotaLimit } from "@/lib/subscription-helpers";

// This cron job runs on the 1st of each month to reset email quotas
/**
 * Handles a GET request to reset or update monthly email quotas for all churches.
 *
 * This endpoint is intended to be triggered by a scheduled job (e.g., Vercel Cron) on the 1st of each month. It verifies authorization in production, then for each church, creates a new email quota record for the current month or updates the quota limit if the subscription status has changed. Returns a JSON response summarizing the number of quotas created and updated.
 *
 * @returns A JSON response indicating success or failure, the processed month, and counts of quotas created and updated.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (in production)
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentMonthYear = format(new Date(), 'yyyy-MM');
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const previousMonthYear = format(previousMonth, 'yyyy-MM');

    console.log(`Resetting email quotas for month: ${currentMonthYear}`);

    // Get all churches
    const churches = await prisma.church.findMany({
      select: {
        id: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    });

    let quotasCreated = 0;
    let quotasUpdated = 0;

    for (const church of churches) {
      // Check if quota already exists for current month
      const existingQuota = await prisma.emailQuota.findFirst({
        where: {
          churchId: church.id,
          monthYear: currentMonthYear,
        },
      });

      if (!existingQuota) {
        // Determine quota limit based on subscription status
        const quotaLimit = getQuotaLimit(church);
        
        await prisma.emailQuota.create({
          data: {
            churchId: church.id,
            monthYear: currentMonthYear,
            quotaLimit,
            emailsSent: 0,
          },
        });
        quotasCreated++;
      } else {
        // Update existing quota if subscription status changed
        const expectedLimit = getQuotaLimit(church);
        
        if (existingQuota.quotaLimit !== expectedLimit) {
          await prisma.emailQuota.update({
            where: { id: existingQuota.id },
            data: { quotaLimit: expectedLimit },
          });
          quotasUpdated++;
        }
      }
    }

    console.log(`Email quotas reset complete. Created: ${quotasCreated}, Updated: ${quotasUpdated}`);

    return NextResponse.json({
      success: true,
      message: `Email quotas reset for ${currentMonthYear}`,
      quotasCreated,
      quotasUpdated,
    });
  } catch (error) {
    console.error("Error resetting email quotas:", error);
    return NextResponse.json(
      { error: "Failed to reset email quotas" },
      { status: 500 }
    );
  }
}