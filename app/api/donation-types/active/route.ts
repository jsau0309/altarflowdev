import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Get active donation types/campaigns for donation form (public endpoint)
export async function GET(req: NextRequest) {
  try {
    // Get churchId from query params
    const { searchParams } = new URL(req.url);
    const churchId = searchParams.get('churchId');

    if (!churchId) {
      return NextResponse.json(
        { error: 'Church ID is required' },
        { status: 400 }
      );
    }

    // Get church by clerkOrgId or UUID
    let church;
    
    // Try to find by clerkOrgId first
    church = await prisma.church.findUnique({
      where: { clerkOrgId: churchId },
      select: { id: true },
    });

    // If not found, try by UUID
    if (!church) {
      church = await prisma.church.findUnique({
        where: { id: churchId },
        select: { id: true },
      });
    }

    if (!church) {
      return NextResponse.json(
        { error: 'Church not found' },
        { status: 404 }
      );
    }

    const now = new Date();

    // Get active donation types and campaigns
    // Active means:
    // 1. isActive = true
    // 2. For campaigns: startDate <= now
    // 3. For campaigns with endDate: endDate >= now
    // 4. For campaigns with goalAmount: total raised < goalAmount
    
    const donationTypes = await prisma.donationType.findMany({
      where: {
        churchId: church.id,
        isActive: true,
        OR: [
          // Default types (always available)
          { isCampaign: false },
          // Campaigns that meet date criteria
          {
            isCampaign: true,
            startDate: {
              lte: now,
            },
            OR: [
              // No end date (ongoing)
              { endDate: null },
              // Has end date but not reached yet
              { endDate: { gte: now } },
            ],
          },
        ],
      },
      orderBy: [
        { isCampaign: 'asc' }, // Defaults first
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    // For campaigns with goal amounts, check if goal is reached
    const activeDonationTypes = [];
    
    for (const type of donationTypes) {
      // If it's a default type or campaign without goal, include it
      if (!type.isCampaign || !type.goalAmount) {
        activeDonationTypes.push(type);
        continue;
      }

      // For campaigns with goals, check if goal is reached
      const donations = await prisma.donationTransaction.findMany({
        where: {
          donationTypeId: type.id,
          churchId: church.id,
          status: 'succeeded',
        },
        select: {
          amount: true,
        },
      });

      const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0) / 100; // Convert to dollars
      const goalAmount = parseFloat(type.goalAmount.toString());

      // Only include if goal not reached
      if (totalRaised < goalAmount) {
        activeDonationTypes.push(type);
      }
    }

    return NextResponse.json({
      success: true,
      data: activeDonationTypes,
    });
  } catch (error) {
    console.error('Error fetching active donation types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active donation types' },
      { status: 500 }
    );
  }
}
