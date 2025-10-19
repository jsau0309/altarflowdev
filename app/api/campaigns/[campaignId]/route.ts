import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Schema for validating updated campaign data (PATCH)
const campaignUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  goalAmount: z.number().positive().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
}).partial(); // Make all fields optional for PATCH

// GET /api/campaigns/[campaignId] - Fetch a single campaign from the active organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params;
    // 1. Get user and organization context
    const { userId, orgId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      console.error(`User ${userId} attempted GET on campaign ${campaignId} without active org.`);
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }

    // campaignId already extracted from await params

    // 2. Fetch campaign only if it belongs to the active org
    const campaign = await prisma.donationType.findFirst({
      where: { 
        id: campaignId, 
        church: { clerkOrgId: orgId },
        isCampaign: true,
      },
    });

    if (!campaign) {
      // Not found or doesn't belong to this org
      return NextResponse.json({ error: 'Campaign not found or access denied' }, { status: 404 });
    }

    // Authorization check passed implicitly by the query
    return NextResponse.json(campaign);

  } catch (error) {
    const { campaignId } = await params;
    console.error(`Error fetching campaign ${campaignId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
  }
}

// PATCH /api/campaigns/[campaignId] - Update an existing campaign in the active organization
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  let orgId: string | null | undefined = null; // Declare outside try
  try {
    const { campaignId } = await params;
    // 1. Get user and organization context
    const authResult = getAuth(request);
    const userId = authResult.userId;
    orgId = authResult.orgId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      console.error(`User ${userId} attempted PATCH on campaign ${campaignId} without active org.`);
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }
    // TODO: Implement role-based access (e.g., only ADMIN using authResult.orgRole)

    // campaignId already extracted from await params

    // Remove initial existence check - updateMany handles this implicitly with the org check
    // const existingCampaign = await prisma.campaign.findUnique(...);

    const body = await request.json();
    
    // 2. Validate input data
    const validation = campaignUpdateSchema.safeParse(body);
    if (!validation.success) {
        console.error("Campaign update validation error:", validation.error.errors);
        return NextResponse.json({ error: 'Invalid input data', details: validation.error.errors }, { status: 400 });
    }
    const campaignData = validation.data;

    // 3. Prepare data for update
    const dataToUpdate: Prisma.DonationTypeUpdateInput = {};
    if (campaignData.name !== undefined) dataToUpdate.name = campaignData.name;
    if (campaignData.description !== undefined) dataToUpdate.description = campaignData.description;
    if (campaignData.startDate !== undefined) {
      dataToUpdate.startDate = campaignData.startDate ? new Date(campaignData.startDate) : null;
    }
    if (campaignData.endDate !== undefined) {
      dataToUpdate.endDate = campaignData.endDate ? new Date(campaignData.endDate) : null;
    }
    if (campaignData.goalAmount !== undefined) {
      dataToUpdate.goalAmount = campaignData.goalAmount === null ? null : new Prisma.Decimal(Number(campaignData.goalAmount).toFixed(2));
    }
    if (campaignData.isActive !== undefined) {
      dataToUpdate.isActive = campaignData.isActive;
    }

    // Check if there's actually anything to update
    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    // 4. Perform the update using updateMany to ensure org boundary
    const updateResult = await prisma.donationType.updateMany({
      where: { 
        id: campaignId, 
        church: { clerkOrgId: orgId },
        isCampaign: true,
      },
      data: dataToUpdate,
    });

    // 5. Check if the update was successful
    if (updateResult.count === 0) {
      return NextResponse.json({ error: 'Campaign not found or access denied' }, { status: 404 });
    }

    // 6. Fetch the updated campaign to return it
    const updatedCampaign = await prisma.donationType.findFirst({
       where: { 
         id: campaignId, 
         church: { clerkOrgId: orgId },
         isCampaign: true,
       }
    });

    return NextResponse.json(updatedCampaign);

  } catch (error) {
    const { campaignId } = await params;
    console.error(`Error updating campaign ${campaignId}:`, error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

// DELETE /api/campaigns/[campaignId] - Delete a campaign from the active organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  let orgId: string | null | undefined = null; // Declare outside try
  try {
    const { campaignId } = await params;
    // 1. Get user and organization context
    const authResult = getAuth(request);
    const userId = authResult.userId;
    orgId = authResult.orgId;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      console.error(`User ${userId} attempted DELETE on campaign ${campaignId} without active org.`);
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }
    // TODO: Implement role-based access (e.g., only ADMIN using authResult.orgRole)

    // campaignId already extracted from await params

    // Remove initial existence check

    // 2. Use deleteMany with compound where clause to ensure ownership
    const existing = await prisma.donationType.findFirst({
      where: {
        id: campaignId,
        church: { clerkOrgId: orgId },
        isCampaign: true,
      },
      select: { id: true, isSystemType: true, isDeletable: true }
    });

    if (!existing) {
      return new NextResponse(null, { status: 204 });
    }

    // Prevent deletion of system types
    if (!existing.isDeletable || existing.isSystemType) {
      return NextResponse.json(
        { error: 'This donation type cannot be deleted' },
        { status: 400 }
      );
    }

    const transactionCount = await prisma.donationTransaction.count({
      where: {
        donationTypeId: campaignId,
        church: { clerkOrgId: orgId },
      },
    });

    if (transactionCount > 0) {
      await prisma.donationType.update({
        where: { id: campaignId },
        data: { isActive: false },
      });
    } else {
      await prisma.donationType.delete({ where: { id: campaignId } });
    }

    console.log(`Campaign ${campaignId} deleted (soft=${transactionCount > 0}) by user ${userId} (org ${orgId})`);
    return new NextResponse(null, { status: 204 }); // No Content

  } catch (error) {
     const { campaignId } = await params;
     console.error(`Error deleting campaign ${campaignId}:`, error);
     // Handle potential Prisma errors (e.g., foreign key constraint if campaign has related donations)
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') { 
         return NextResponse.json({ error: 'Cannot delete campaign due to existing related records (e.g., donations).' }, { status: 409 }); // Conflict
     }
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
} 