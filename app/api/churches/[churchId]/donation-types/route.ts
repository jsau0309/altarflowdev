import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger';

interface Params {
  churchId: string; // This is the Clerk Organization ID from the path
}

export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { churchId } = await params; // This 'churchId' variable now holds the Clerk Organization ID
  const { userId, orgId } = await auth();

  // SECURITY: Require authentication
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // SECURITY: Verify caller belongs to the requested organization
  if (orgId !== churchId) {
    return NextResponse.json({ error: 'Forbidden: Organization mismatch' }, { status: 403 });
  }

  if (!churchId) {
    return NextResponse.json({ error: 'Church ID (Clerk Organization ID) from path is required' }, { status: 400 });
  }

  try {
    // 1. Find the internal Church record using the clerkOrgId
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: churchId.trim() }, // Use the churchId from path (which is clerkOrgId) to find the Church
    });

    if (!church) {
      return NextResponse.json({ error: `Church not found for Clerk Organization ID: ${churchId}` }, { status: 404 });
    }

    const internalChurchUUID = church.id; // This is the actual UUID for the church

    // 2. Fetch DonationType records for that internalChurchUUID
    const donationTypes = await prisma.donationType.findMany({
      where: {
        churchId: internalChurchUUID,
        // isActive: true, // Optional: You might want to only return active types later
      },
      orderBy: {
        name: 'asc', // Optional: Order them alphabetically or by creation date
      },
    });

    return NextResponse.json(donationTypes, { status: 200 });

  } catch (error) {
    logger.error('Error fetching donation types for church (Clerk Org ID: ${churchId}):', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Failed to fetch donation types', details: errorMessage }, { status: 500 });
  }
}

// POST - Create a new donation type
export async function POST(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { churchId } = await params;
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (orgId !== churchId) {
    return NextResponse.json({ error: 'Forbidden: Organization mismatch' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, isCampaign, goalAmount, startDate, endDate, isRecurringAllowed } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Find the internal Church record
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: churchId.trim() },
    });

    if (!church) {
      return NextResponse.json({ error: `Church not found for Clerk Organization ID: ${churchId}` }, { status: 404 });
    }

    // Create the donation type
    const donationType = await prisma.donationType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        churchId: church.id,
        isCampaign: isCampaign || false,
        goalAmount: goalAmount ? parseFloat(goalAmount) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isRecurringAllowed: isRecurringAllowed !== undefined ? isRecurringAllowed : true,
        isSystemType: false,
        isDeletable: true,
        isActive: true,
      },
    });

    return NextResponse.json(donationType, { status: 201 });

  } catch (error) {
    logger.error('Error creating donation type for church (Clerk Org ID: ${churchId}):', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Failed to create donation type', details: errorMessage }, { status: 500 });
  }
}
