import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; 

interface Params {
  churchId: string; // This is the Clerk Organization ID from the path
}

export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  const { churchId } = params; // This 'churchId' variable now holds the Clerk Organization ID

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
    console.error(`Error fetching donation types for church (Clerk Org ID: ${churchId}):`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Failed to fetch donation types', details: errorMessage }, { status: 500 });
  }
}
