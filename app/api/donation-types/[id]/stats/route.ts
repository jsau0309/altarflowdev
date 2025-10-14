import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

// GET - Get campaign statistics
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const { id } = params;

    // Get church from orgId
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });

    if (!church) {
      return NextResponse.json(
        { error: 'Church not found' },
        { status: 404 }
      );
    }

    // Get donation type
    const donationType = await prisma.donationType.findFirst({
      where: {
        id,
        churchId: church.id,
      },
    });

    if (!donationType) {
      return NextResponse.json(
        { error: 'Donation type not found' },
        { status: 404 }
      );
    }

    // Get donation statistics
    const donations = await prisma.donationTransaction.findMany({
      where: {
        donationTypeId: id,
        churchId: church.id,
        status: 'succeeded', // Only count successful donations
      },
      select: {
        amount: true,
        donorId: true,
      },
    });

    // Calculate stats
    const totalRaised = donations.reduce((sum, donation) => sum + donation.amount, 0) / 100; // Convert from cents to dollars
    const transactionCount = donations.length;
    const uniqueDonors = new Set(donations.map(d => d.donorId).filter(Boolean));
    const donorCount = uniqueDonors.size;

    const goalAmount = donationType.goalAmount 
      ? parseFloat(donationType.goalAmount.toString()) 
      : null;

    const progressPercent = goalAmount && goalAmount > 0
      ? Math.min(Math.round((totalRaised / goalAmount) * 100), 100)
      : 0;

    const isGoalReached = goalAmount ? totalRaised >= goalAmount : false;

    // Calculate days remaining
    let daysRemaining: number | null = null;
    if (donationType.endDate) {
      const now = new Date();
      const end = new Date(donationType.endDate);
      const diffTime = end.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    const stats = {
      totalRaised,
      donorCount,
      transactionCount,
      goalAmount,
      progressPercent,
      isGoalReached,
      daysRemaining,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign statistics' },
      { status: 500 }
    );
  }
}
