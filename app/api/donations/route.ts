import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Schema for validating manual donation data (POST)
const donationCreateSchema = z.object({
  amount: z.number().positive({ message: "Amount must be positive" }),
  currency: z.string().length(3).optional().default("USD"),
  donationDate: z.string().datetime({ message: "Invalid date format" }).optional(), // Optional, defaults to now
  donorFirstName: z.string().nullable().optional(),
  donorLastName: z.string().nullable().optional(),
  donorEmail: z.string().email().nullable().optional(),
  memberId: z.string().uuid({ message: "Invalid Member ID format" }).nullable().optional(), 
  donationTypeId: z.string().uuid({ message: "Invalid Donation Type ID format" }).nullable().optional(), 
  // stripePaymentIntentId will be added later during Stripe integration
});

// GET /api/donations - Fetch all donations for the active organization
export async function GET(request: NextRequest) {
  try {
    // 1. Get user and organization context
    const { userId, orgId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      console.error(`User ${userId} attempted GET donations without active org.`);
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }
    // TODO: Implement role-based access?

    // 2. Fetch donations for the active organization
    const donations = await prisma.donation.findMany({
      where: {
        church: { // Filter by the related church
          clerkOrgId: orgId
        }
      },
      orderBy: {
        donationDate: 'desc',
      },
      // include: { ... } // Add includes if needed
    });

    return NextResponse.json(donations);

  } catch (error) {
    console.error("Error fetching donations:", error);
    return NextResponse.json({ error: 'Failed to fetch donations' }, { status: 500 });
  }
}

// POST /api/donations - Manually create a new donation record for the active organization
export async function POST(request: NextRequest) {
  let orgId: string | null | undefined = null; // Declare outside try
  try {
    // 1. Get user and organization context
    const authResult = getAuth(request);
    const userId = authResult.userId;
    orgId = authResult.orgId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      console.error(`User ${userId} attempted POST donation without active org.`);
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }
    // TODO: Implement role-based access?

    const body = await request.json();
    
    // 2. Validate input data
    const validation = donationCreateSchema.safeParse(body);
    if (!validation.success) {
        console.error("Donation validation error:", validation.error.errors);
        return NextResponse.json({ error: 'Invalid input data', details: validation.error.errors }, { status: 400 });
    }
    const donationData = validation.data;

    // 3. Prepare data, connecting church via clerkOrgId
    const dataToCreate: Prisma.DonationCreateInput = {
        amount: donationData.amount,
        currency: donationData.currency,
        donationDate: donationData.donationDate ? new Date(donationData.donationDate) : new Date(),
        donorFirstName: donationData.donorFirstName,
        donorLastName: donationData.donorLastName,
        donorEmail: donationData.donorEmail,
        // Connect relations if IDs are provided
        ...(donationData.memberId && { member: { connect: { id: donationData.memberId } } }),
        ...(donationData.donationTypeId && { donationType: { connect: { id: donationData.donationTypeId } } }),
        // Connect the church relation using the Clerk orgId
        church: {
          connect: { clerkOrgId: orgId }
        }
    };

    // 4. Create the donation
    const newDonation = await prisma.donation.create({
      data: dataToCreate,
    });

    // TODO: Stripe Integration Point?

    return NextResponse.json(newDonation, { status: 201 }); 

  } catch (error) {
    console.error("Error creating donation:", error);
    // Handle potential foreign key constraint errors & P2025
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
            // Determine which foreign key failed if possible from error.meta.field_name
            const field = (error.meta as any)?.field_name || 'related record';
            console.warn(`Failed donation creation due to invalid foreign key on ${field}`);
            return NextResponse.json({ error: `Invalid ${field} provided.` }, { status: 400 });
        } else if (error.code === 'P2025') { 
            // Likely means the church, member, or campaign record to connect was not found
            const target = (error.meta as any)?.modelName || 'record';
             // Check if the church itself was the issue
            if ((error.meta as any)?.cause?.includes('church')) {
                 console.error(`Attempted to connect donation to non-existent church with clerkOrgId: ${orgId}`);
                 return NextResponse.json({ error: 'Organization not found for creating donation.'}, { status: 404 });
            }
            console.warn(`Failed donation creation because referenced ${target} not found.`);
            return NextResponse.json({ error: `Referenced ${target} not found.` }, { status: 404 });
        }
    } 
    return NextResponse.json({ error: 'Failed to create donation' }, { status: 500 });
  }
} 