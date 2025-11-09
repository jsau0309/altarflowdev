import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

interface Params {
  churchId: string;
  typeId: string;
}

// PUT - Update a donation type
export async function PUT(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { churchId, typeId } = await params;
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (orgId !== churchId) {
    return NextResponse.json({ error: 'Forbidden: Organization mismatch' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, color } = body;

    if (!name || !color) {
      return NextResponse.json({ error: 'Name and color are required' }, { status: 400 });
    }

    // Find the church
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: churchId.trim() },
    });

    if (!church) {
      return NextResponse.json({ error: `Church not found` }, { status: 404 });
    }

    // Check if donation type exists and belongs to this church
    const existingType = await prisma.donationType.findUnique({
      where: { id: typeId },
    });

    if (!existingType) {
      return NextResponse.json({ error: 'Donation type not found' }, { status: 404 });
    }

    if (existingType.churchId !== church.id) {
      return NextResponse.json({ error: 'Forbidden: Donation type does not belong to this church' }, { status: 403 });
    }

    // Update the donation type
    const updatedType = await prisma.donationType.update({
      where: { id: typeId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color.trim(),
      },
    });

    return NextResponse.json(updatedType, { status: 200 });

  } catch (error) {
    console.error(`Error updating donation type:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Failed to update donation type', details: errorMessage }, { status: 500 });
  }
}

// DELETE - Delete a donation type
export async function DELETE(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { churchId, typeId } = await params;
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (orgId !== churchId) {
    return NextResponse.json({ error: 'Forbidden: Organization mismatch' }, { status: 403 });
  }

  try {
    // Find the church
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: churchId.trim() },
    });

    if (!church) {
      return NextResponse.json({ error: `Church not found` }, { status: 404 });
    }

    // Check if donation type exists and belongs to this church
    const donationType = await prisma.donationType.findUnique({
      where: { id: typeId },
      include: {
        _count: {
          select: { DonationTransaction: true },
        },
      },
    });

    if (!donationType) {
      return NextResponse.json({ error: 'Donation type not found' }, { status: 404 });
    }

    if (donationType.churchId !== church.id) {
      return NextResponse.json({ error: 'Forbidden: Donation type does not belong to this church' }, { status: 403 });
    }

    // Check if donation type is deletable
    if (!donationType.isDeletable || donationType.isSystemType) {
      return NextResponse.json({ error: 'Cannot delete system donation type' }, { status: 400 });
    }

    // Check if donation type is in use
    if (donationType._count.DonationTransaction > 0) {
      return NextResponse.json({
        error: 'Cannot delete donation type that is in use by transactions',
        inUse: true,
        transactionCount: donationType._count.DonationTransaction
      }, { status: 400 });
    }

    // Delete the donation type
    await prisma.donationType.delete({
      where: { id: typeId },
    });

    return NextResponse.json({ success: true, message: 'Donation type deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting donation type:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Failed to delete donation type', details: errorMessage }, { status: 500 });
  }
}
