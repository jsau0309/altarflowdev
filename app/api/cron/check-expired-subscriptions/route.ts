import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from '@/lib/db';

// This cron job runs daily to check for expired subscriptions and update quotas
// It handles grace period expiration and subscription end dates
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

    const now = new Date();
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
      }
    }

    console.log(`Subscription check complete. Status updates: ${statusUpdated}`);

    return NextResponse.json({
      success: true,
      message: `Checked ${churches.length} churches with canceled/grace_period status`,
      statusUpdated,
    });
  } catch (error) {
    console.error("Error checking expired subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to check expired subscriptions" },
      { status: 500 }
    );
  }
}