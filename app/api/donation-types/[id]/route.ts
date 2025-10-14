import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET - Get single donation type/campaign with basic info
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

    return NextResponse.json({
      success: true,
      data: donationType,
    });
  } catch (error) {
    console.error('Error fetching donation type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch donation type' },
      { status: 500 }
    );
  }
}

// PATCH - Update campaign (admin only)
export async function PATCH(
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
        { error: 'Only administrators can update campaigns' },
        { status: 403 }
      );
    }

    // Get existing donation type
    const existingType = await prisma.donationType.findFirst({
      where: {
        id,
        churchId: church.id,
      },
    });

    if (!existingType) {
      return NextResponse.json(
        { error: 'Donation type not found' },
        { status: 404 }
      );
    }

    // Prevent updating default types (Tithe, Offering)
    if (!existingType.isCampaign) {
      return NextResponse.json(
        { error: 'Cannot update default donation types' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, description, goalAmount, endDate, startDate, displayOrder, isActive } = body;

    // If name is being changed, check for duplicates
    if (name && name.trim() !== existingType.name) {
      const duplicateType = await prisma.donationType.findUnique({
        where: {
          churchId_name: {
            churchId: church.id,
            name: name.trim(),
          },
        },
      });

      if (duplicateType) {
        return NextResponse.json(
          { error: 'A donation type or campaign with this name already exists' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Prisma.DonationTypeUpdateInput = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (goalAmount !== undefined) {
      updateData.goalAmount = goalAmount ? new Prisma.Decimal(goalAmount) : null;
    }
    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null;
    }
    if (startDate !== undefined) {
      updateData.startDate = startDate ? new Date(startDate) : null;
    }
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update campaign
    const updatedCampaign = await prisma.donationType.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedCampaign,
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete campaign (set isActive to false)
export async function DELETE(
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
        { error: 'Only administrators can delete campaigns' },
        { status: 403 }
      );
    }

    // Get existing donation type
    const existingType = await prisma.donationType.findFirst({
      where: {
        id,
        churchId: church.id,
      },
    });

    if (!existingType) {
      return NextResponse.json(
        { error: 'Donation type not found' },
        { status: 404 }
      );
    }

    // Prevent deleting default types (Tithe, Offering)
    if (!existingType.isCampaign) {
      return NextResponse.json(
        { error: 'Cannot delete default donation types' },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false
    const deletedCampaign = await prisma.donationType.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      data: deletedCampaign,
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
