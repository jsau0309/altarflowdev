import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

// Schema for validating new campaign data (POST)
const campaignCreateSchema = z.object({
  name: z.string().min(1, { message: "Campaign name is required" }),
  description: z.string().nullable().optional(),
  goalAmount: z.number().positive().nullable().optional(),
  startDate: z.string().datetime({ message: "Invalid start date format" }).nullable().optional(),
  endDate: z.string().datetime({ message: "Invalid end date format" }).nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/campaigns - Fetch all campaigns for the active organization
export async function GET(request: NextRequest) {
  try {
    // 1. Get user and organization context
    const { userId, orgId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      logger.error(`User ${userId} attempted to GET campaigns without an active organization.`, { operation: 'api.error' });
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }

    // 2. Fetch campaigns ONLY for the user's active organization
    const campaigns = await prisma.donationType.findMany({
      where: {
        Church: {
          clerkOrgId: orgId
        },
        isCampaign: true,
      },
      orderBy: {
        createdAt: 'desc', // Show newest first
      },
    });

    return NextResponse.json(campaigns);

  } catch (error) {
    logger.error('Error fetching campaigns:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

// POST /api/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  let orgId: string | null | undefined = null; // Declare orgId outside try
  try {
    // 1. Get user and organization context
    const authResult = getAuth(request);
    const userId = authResult.userId;
    orgId = authResult.orgId; // Assign orgId

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // TODO: Add role check (e.g., ADMIN only?) using authResult.orgRole
    if (!orgId) {
      logger.error(`User ${userId} attempted to POST campaign without an active organization.`, { operation: 'api.error' });
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }

    // Remove profile fetch - no longer needed for churchId
    // const userProfile = await prisma.profile.findUnique(...);

    const body = await request.json();
    
    // 2. Validate input data
    const validation = campaignCreateSchema.safeParse(body);
    if (!validation.success) {
        logger.error('Campaign validation error', {
          operation: 'api.campaigns.validation_error',
          errors: validation.error.errors
        });
        return NextResponse.json({ error: 'Invalid input data', details: validation.error.errors }, { status: 400 });
    }
    const campaignData = validation.data;

    // 3. Prepare data for creation - connect church via clerkOrgId
    const dataToCreate: Prisma.DonationTypeCreateInput = {
      name: campaignData.name,
      description: campaignData.description ?? null,
      goalAmount: campaignData.goalAmount != null ? new Prisma.Decimal(campaignData.goalAmount.toFixed(2)) : null,
      startDate: campaignData.startDate ? new Date(campaignData.startDate) : null,
      endDate: campaignData.endDate ? new Date(campaignData.endDate) : null,
      isActive: campaignData.isActive ?? true,
      isCampaign: true,
      isRecurringAllowed: false,
      isSystemType: false,
      isDeletable: true,
      Church: {
        connect: {
          clerkOrgId: orgId
        }
      }
    };

    // 4. Create the campaign
    const newCampaign = await prisma.donationType.create({
      data: dataToCreate,
    });

    return NextResponse.json(newCampaign, { status: 201 }); // 201 Created

  } catch (error) {
    logger.error('Error creating campaign:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    // Add specific check for P2025 (Foreign key constraint failed - church not found)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        logger.error(`Attempted to connect campaign to non-existent church with clerkOrgId: ${orgId}`, { operation: 'api.error' });
        return NextResponse.json({ error: 'Organization not found for creating campaign.'}, { status: 404 });
    }
    return NextResponse.json({ 
      error: 'Failed to create campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 