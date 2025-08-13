import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from '@/lib/db';
import { format } from "date-fns";
import { getQuotaLimit } from "@/lib/subscription-helpers";

// This endpoint creates email quotas for churches that don't have one yet
// Useful for migration or fixing churches created before the quota system
export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is an admin (you might want to add more robust admin checking)
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const currentMonthYear = format(new Date(), 'yyyy-MM');

    // Find all churches
    const churches = await prisma.church.findMany({
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    });

    let quotasCreated = 0;
    const results = [];

    for (const church of churches) {
      // Check if quota already exists for current month
      const existingQuota = await prisma.emailQuota.findFirst({
        where: {
          churchId: church.id,
          monthYear: currentMonthYear,
        },
      });

      if (!existingQuota) {
        // Create quota based on subscription status
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
        results.push({
          churchName: church.name,
          churchId: church.id,
          quotaLimit,
          status: 'created'
        });
      } else {
        results.push({
          churchName: church.name,
          churchId: church.id,
          quotaLimit: existingQuota.quotaLimit,
          status: 'already_exists'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${quotasCreated} missing quotas for ${currentMonthYear}`,
      totalChurches: churches.length,
      quotasCreated,
      results,
    });
  } catch (error) {
    console.error("Error creating missing quotas:", error);
    return NextResponse.json(
      { error: "Failed to create missing quotas" },
      { status: 500 }
    );
  }
}