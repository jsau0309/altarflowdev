import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger';

interface Params {
  churchId: string; // This is the Clerk Organization ID from the path
}

// GET - Fetch all donation payment methods for a church
export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { churchId } = await params;
  const { userId, orgId } = await auth();
  const { searchParams } = new URL(request.url);
  const includeHidden = searchParams.get('includeHidden') === 'true';

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
    // Find the internal Church record using the clerkOrgId
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: churchId.trim() },
    });

    if (!church) {
      return NextResponse.json({ error: `Church not found for Clerk Organization ID: ${churchId}` }, { status: 404 });
    }

    const internalChurchUUID = church.id;

    // Fetch DonationPaymentMethod records for that church (exclude hidden methods unless includeHidden is true)
    const paymentMethods = await prisma.donationPaymentMethod.findMany({
      where: {
        churchId: internalChurchUUID,
        ...(includeHidden ? {} : { isHidden: false }),
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(paymentMethods, { status: 200 });

  } catch (error) {
    logger.error(`Error fetching donation payment methods for church (Clerk Org ID: ${churchId}):`, { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Failed to fetch donation payment methods', details: errorMessage }, { status: 500 });
  }
}

// POST - Create a new donation payment method
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
    const { name, color } = body;

    if (!name || !color) {
      return NextResponse.json({ error: 'Name and color are required' }, { status: 400 });
    }

    // Find the internal Church record
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: churchId.trim() },
    });

    if (!church) {
      return NextResponse.json({ error: `Church not found for Clerk Organization ID: ${churchId}` }, { status: 404 });
    }

    // Create the donation payment method
    const paymentMethod = await prisma.donationPaymentMethod.create({
      data: {
        name: name.trim(),
        color: color.trim(),
        churchId: church.id,
        isSystemMethod: false,
        isDeletable: true,
      },
    });

    return NextResponse.json(paymentMethod, { status: 201 });

  } catch (error) {
    logger.error(`Error creating donation payment method for church (Clerk Org ID: ${churchId}):`, { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Failed to create donation payment method', details: errorMessage }, { status: 500 });
  }
}
