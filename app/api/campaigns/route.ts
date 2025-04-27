import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-helpers';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Schema for validating new campaign data (POST)
const campaignCreateSchema = z.object({
  name: z.string().min(1, { message: "Campaign name is required" }),
  description: z.string().nullable().optional(),
  goalAmount: z.number().positive().nullable().optional(),
  startDate: z.string().datetime({ message: "Invalid start date format" }).nullable().optional(),
  endDate: z.string().datetime({ message: "Invalid end date format" }).nullable().optional(),
});

// GET /api/campaigns - Fetch all campaigns
export async function GET() {
  try {
    // Ensure user is authenticated to view campaigns
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement pagination later
    const campaigns = await prisma.campaign.findMany({
      orderBy: {
        createdAt: 'desc', // Show newest first
      },
    });

    return NextResponse.json(campaigns);

  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

// POST /api/campaigns - Create a new campaign
export async function POST(request: Request) {
  try {
    // Ensure user is authenticated to create campaigns
    // TODO: Add role check (e.g., ADMIN only?)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to get church information
    const userProfile = await prisma.profile.findUnique({
      where: { id: user.id },
      include: { church: true }
    });

    if (!userProfile?.church) {
      return NextResponse.json({ error: 'User is not associated with a church' }, { status: 400 });
    }

    const body = await request.json();
    
    // Validate input data
    const validation = campaignCreateSchema.safeParse(body);
    if (!validation.success) {
        console.error("Campaign validation error:", validation.error.errors);
        return NextResponse.json({ error: 'Invalid input data', details: validation.error.errors }, { status: 400 });
    }
    const campaignData = validation.data;

    // Handle date conversions and potential number conversion for goal
    const dataToCreate: Prisma.CampaignCreateInput = {
        ...campaignData,
        startDate: campaignData.startDate ? new Date(campaignData.startDate) : null,
        endDate: campaignData.endDate ? new Date(campaignData.endDate) : null,
        goalAmount: campaignData.goalAmount,
        church: {
            connect: {
                id: userProfile.church.id
            }
        }
    };

    const newCampaign = await prisma.campaign.create({
      data: dataToCreate,
    });

    return NextResponse.json(newCampaign, { status: 201 }); // 201 Created

  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json({ 
      error: 'Failed to create campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 