import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

interface Params {
  churchId: string;
  methodId: string;
}

// PUT - Update a donation payment method
export async function PUT(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { churchId, methodId } = await params;
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (orgId !== churchId) {
    return NextResponse.json({ error: 'Forbidden: Organization mismatch' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, color, isHidden } = body;

    // Find the church
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: churchId.trim() },
    });

    if (!church) {
      return NextResponse.json({ error: `Church not found` }, { status: 404 });
    }

    // Check if payment method exists and belongs to this church
    const existingMethod = await prisma.donationPaymentMethod.findUnique({
      where: { id: methodId },
    });

    if (!existingMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    if (existingMethod.churchId !== church.id) {
      return NextResponse.json({ error: 'Forbidden: Payment method does not belong to this church' }, { status: 403 });
    }

    // Build update data object
    const updateData: { name?: string; color?: string; isHidden?: boolean } = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (color !== undefined) {
      updateData.color = color.trim();
    }

    if (isHidden !== undefined) {
      updateData.isHidden = isHidden;
    }

    // Ensure at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Update the payment method
    const updatedMethod = await prisma.donationPaymentMethod.update({
      where: { id: methodId },
      data: updateData,
    });

    return NextResponse.json(updatedMethod, { status: 200 });

  } catch (error) {
    console.error(`Error updating donation payment method:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Failed to update donation payment method', details: errorMessage }, { status: 500 });
  }
}

// DELETE - Delete a donation payment method
export async function DELETE(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { churchId, methodId } = await params;
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

    // Check if payment method exists and belongs to this church
    const method = await prisma.donationPaymentMethod.findUnique({
      where: { id: methodId },
      include: {
        _count: {
          select: { DonationTransaction: true },
        },
      },
    });

    if (!method) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    if (method.churchId !== church.id) {
      return NextResponse.json({ error: 'Forbidden: Payment method does not belong to this church' }, { status: 403 });
    }

    // Check if payment method is deletable
    if (!method.isDeletable || method.isSystemMethod) {
      return NextResponse.json({ error: 'Cannot delete system payment method' }, { status: 400 });
    }

    // Check if payment method is in use
    if (method._count.DonationTransaction > 0) {
      return NextResponse.json({
        error: 'Cannot delete payment method that is in use by donations',
        inUse: true,
        donationCount: method._count.DonationTransaction
      }, { status: 400 });
    }

    // Delete the payment method
    await prisma.donationPaymentMethod.delete({
      where: { id: methodId },
    });

    return NextResponse.json({ success: true, message: 'Payment method deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting donation payment method:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Failed to delete donation payment method', details: errorMessage }, { status: 500 });
  }
}
