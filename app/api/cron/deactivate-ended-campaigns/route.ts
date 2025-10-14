import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Cron job to deactivate campaigns that have ended
// Runs daily at midnight via Vercel Cron
export async function GET(req: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    console.log(`[CRON] Starting campaign deactivation check at ${now.toISOString()}`);

    // Find campaigns that should be deactivated
    // 1. Campaigns with end dates that have passed
    const dateExpiredCampaigns = await prisma.donationType.findMany({
      where: {
        isCampaign: true,
        isActive: true,
        endDate: {
          lt: now,
        },
      },
      select: {
        id: true,
        name: true,
        endDate: true,
        churchId: true,
      },
    });

    // 2. Campaigns with goals that have been reached
    const goalBasedCampaigns = await prisma.donationType.findMany({
      where: {
        isCampaign: true,
        isActive: true,
        goalAmount: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        goalAmount: true,
        churchId: true,
      },
    });

    const goalReachedCampaigns = [];
    
    for (const campaign of goalBasedCampaigns) {
      if (!campaign.goalAmount) continue;

      // Get total raised for this campaign
      const donations = await prisma.donationTransaction.findMany({
        where: {
          donationTypeId: campaign.id,
          churchId: campaign.churchId,
          status: 'succeeded',
        },
        select: {
          amount: true,
        },
      });

      const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0) / 100; // Convert to dollars
      const goalAmount = parseFloat(campaign.goalAmount.toString());

      if (totalRaised >= goalAmount) {
        goalReachedCampaigns.push(campaign);
      }
    }

    // Combine all campaigns to deactivate
    const campaignsToDeactivate = [
      ...dateExpiredCampaigns,
      ...goalReachedCampaigns,
    ];

    // Remove duplicates (campaigns that are both expired and goal reached)
    const uniqueCampaigns = Array.from(
      new Map(campaignsToDeactivate.map(c => [c.id, c])).values()
    );

    // Deactivate campaigns
    const deactivatedCampaigns = [];
    
    for (const campaign of uniqueCampaigns) {
      await prisma.donationType.update({
        where: { id: campaign.id },
        data: { isActive: false },
      });
      
      deactivatedCampaigns.push({
        id: campaign.id,
        name: campaign.name,
      });
      
      console.log(`[CRON] Deactivated campaign: ${campaign.name} (${campaign.id})`);
    }

    const summary = {
      success: true,
      timestamp: now.toISOString(),
      deactivatedCount: deactivatedCampaigns.length,
      campaigns: deactivatedCampaigns,
      breakdown: {
        dateExpired: dateExpiredCampaigns.length,
        goalReached: goalReachedCampaigns.length,
      },
    };

    console.log(`[CRON] Campaign deactivation complete. Deactivated ${deactivatedCampaigns.length} campaigns.`);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[CRON] Error deactivating campaigns:', error);
    return NextResponse.json(
      {
        error: 'Failed to deactivate campaigns',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
