import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-helpers';
import { z } from 'zod';

// Schema for validating updated campaign data (PATCH)
const campaignUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  goalAmount: z.number().positive().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
}).partial(); // Make all fields optional for PATCH

// GET /api/campaigns/[campaignId] - Fetch a single campaign
export async function GET(
  request: Request,
  { params }: { params: { campaignId: string } }
) {
  try {
    // Authentication check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaignId = params.campaignId;
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Authorization: Current RLS allows authenticated read. No extra API check needed for now.
    return NextResponse.json(campaign);

  } catch (error) {
    console.error(`Error fetching campaign ${params.campaignId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
  }
}

// PATCH /api/campaigns/[campaignId] - Update an existing campaign
export async function PATCH(
  request: Request,
  { params }: { params: { campaignId: string } }
) {
  try {
    // Authentication & Authorization check
    // TODO: Implement role-based access (e.g., only ADMIN)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaignId = params.campaignId;

    // Check existence first
    const existingCampaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } });
    if (!existingCampaign) {
       return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const body = await request.json();
    
    // Validate input data
    const validation = campaignUpdateSchema.safeParse(body);
    if (!validation.success) {
        console.error("Campaign update validation error:", validation.error.errors);
        return NextResponse.json({ error: 'Invalid input data', details: validation.error.errors }, { status: 400 });
    }
    const campaignData = validation.data;

    // Handle date conversions and potential nulls
    const dataToUpdate: any = { ...campaignData };
    if (campaignData.startDate !== undefined) {
      dataToUpdate.startDate = campaignData.startDate ? new Date(campaignData.startDate) : null;
    }
    if (campaignData.endDate !== undefined) {
      dataToUpdate.endDate = campaignData.endDate ? new Date(campaignData.endDate) : null;
    }
    if (campaignData.goalAmount !== undefined) {
      dataToUpdate.goalAmount = campaignData.goalAmount;
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedCampaign);

  } catch (error) {
    console.error(`Error updating campaign ${params.campaignId}:`, error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

// DELETE /api/campaigns/[campaignId] - Delete a campaign
export async function DELETE(
  request: Request,
  { params }: { params: { campaignId: string } }
) {
  try {
    // Authentication & Authorization check
    // TODO: Implement role-based access (e.g., only ADMIN)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaignId = params.campaignId;

    // Check existence first
    const existingCampaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } });
    if (!existingCampaign) {
      return new NextResponse(null, { status: 204 }); // Already deleted
    }

    // Authorization: Currently allows any authenticated user. Add role checks later.
    await prisma.campaign.delete({
      where: { id: campaignId },
    });

    return new NextResponse(null, { status: 204 }); // No Content

  } catch (error) {
     console.error(`Error deleting campaign ${params.campaignId}:`, error);
     // Handle potential Prisma errors (e.g., foreign key constraint if campaign has related donations)
     if (error instanceof Error && 'code' in error && typeof error.code === 'string' && error.code === 'P2003') { 
         return NextResponse.json({ error: 'Cannot delete campaign due to existing related records (e.g., donations).' }, { status: 409 }); // Conflict
     }
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
} 