import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET - List all donation types/campaigns for church
export async function GET(req: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    // Get all donation types (both defaults and campaigns)
    const donationTypes = await prisma.donationType.findMany({
      where: {
        churchId: church.id,
      },
      orderBy: [
        { isCampaign: 'asc' }, // Defaults first
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: donationTypes,
    });
  } catch (error) {
    console.error('Error fetching donation types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch donation types' },
      { status: 500 }
    );
  }
}

// POST - Create new campaign (admin only)
export async function POST(req: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get church and verify user is admin
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

    // Verify user is admin
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!profile || profile.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can create campaigns' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, description, goalAmount, endDate, startDate, displayOrder } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingType = await prisma.donationType.findUnique({
      where: {
        churchId_name: {
          churchId: church.id,
          name: name.trim(),
        },
      },
    });

    if (existingType) {
      return NextResponse.json(
        { error: 'A donation type or campaign with this name already exists' },
        { status: 400 }
      );
    }

    // Create campaign
    const campaign = await prisma.donationType.create({
      data: {
        churchId: church.id,
        name: name.trim(),
        description: description?.trim() || null,
        isCampaign: true,
        isActive: true,
        isRecurringAllowed: false, // Campaigns are one-time only for v1
        goalAmount: goalAmount ? new Prisma.Decimal(goalAmount) : null,
        endDate: endDate ? new Date(endDate) : null,
        startDate: startDate ? new Date(startDate) : new Date(),
        displayOrder: displayOrder ?? 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: campaign,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
