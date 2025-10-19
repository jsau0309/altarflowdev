import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from '@/lib/db';
import { format } from "date-fns";
import { getQuotaLimit } from "@/lib/subscription-helpers";
import { randomUUID } from 'crypto';

// This cron job runs on the 1st of each month to reset email quotas
// It can be called by Vercel Cron or manually
export async function GET() {
  try {
    // Verify the request is from Vercel Cron
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    // Always require authentication in production, allow bypass in dev only if CRON_SECRET is not set
    if (!cronSecret && process.env.NODE_ENV === "production") {
      console.error("CRON_SECRET is not configured in production!");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentMonthYear = format(new Date(), 'yyyy-MM');
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    // const previousMonthYear = format(previousMonth, 'yyyy-MM'); // Not used currently

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
            id: randomUUID(),
            churchId: church.id,
            monthYear: currentMonthYear,
            quotaLimit,
            emailsSent: 0,
            updatedAt: new Date(),
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