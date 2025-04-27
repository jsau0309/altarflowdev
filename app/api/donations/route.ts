import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-helpers';
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
  memberId: z.string().cuid({ message: "Invalid Member ID format" }).nullable().optional(), 
  campaignId: z.string().cuid({ message: "Invalid Campaign ID format" }).nullable().optional(), 
  // stripePaymentIntentId will be added later during Stripe integration
});

// GET /api/donations - Fetch all donations
export async function GET(request: Request) {
  try {
    // Authentication & Authorization check
    // TODO: Implement role-based access (e.g., only ADMIN or specific STAFF)
    const user = await getCurrentUser(); 
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement pagination, filtering (by date, campaign, member) later
    const donations = await prisma.donation.findMany({
      orderBy: {
        donationDate: 'desc', // Show most recent first
      },
      // Example: Include related data
      // include: { 
      //   member: { select: { firstName: true, lastName: true } },
      //   campaign: { select: { name: true } }
      // }
    });

    return NextResponse.json(donations);

  } catch (error) {
    console.error("Error fetching donations:", error);
    return NextResponse.json({ error: 'Failed to fetch donations' }, { status: 500 });
  }
}

// POST /api/donations - Manually create a new donation record
export async function POST(request: Request) {
  try {
    // Authentication & Authorization check
    // TODO: Implement role-based access (who can manually record donations?)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input data
    const validation = donationCreateSchema.safeParse(body);
    if (!validation.success) {
        console.error("Donation validation error:", validation.error.errors);
        return NextResponse.json({ error: 'Invalid input data', details: validation.error.errors }, { status: 400 });
    }
    const donationData = validation.data;

    // Handle data type conversions and defaults
    const dataToCreate: Prisma.DonationCreateInput = {
        amount: donationData.amount,
        currency: donationData.currency,
        donationDate: donationData.donationDate ? new Date(donationData.donationDate) : new Date(),
        donorFirstName: donationData.donorFirstName,
        donorLastName: donationData.donorLastName,
        donorEmail: donationData.donorEmail,
        // Connect relations if IDs are provided
        ...(donationData.memberId && { member: { connect: { id: donationData.memberId } } }),
        ...(donationData.campaignId && { campaign: { connect: { id: donationData.campaignId } } }),
        // stripePaymentIntentId will be null initially
    };

    const newDonation = await prisma.donation.create({
      data: dataToCreate,
    });

    // TODO: Stripe Integration Point (if creating via API before payment)
    // - This might involve creating a Stripe PaymentIntent here
    // - Or this POST route might only be called *after* a successful payment webhook

    return NextResponse.json(newDonation, { status: 201 }); // 201 Created

  } catch (error) {
    console.error("Error creating donation:", error);
    // Handle potential foreign key constraint errors if memberId/campaignId are invalid
    if (error instanceof Error && 'code' in error && typeof error.code === 'string' && error.code === 'P2003') { 
        return NextResponse.json({ error: 'Invalid Member or Campaign ID provided.' }, { status: 400 });
    }
    if (error instanceof Error && 'code' in error && typeof error.code === 'string' && error.code === 'P2025') { // Record to connect not found
        return NextResponse.json({ error: 'Referenced Member or Campaign not found.' }, { status: 404 });
    } 
    return NextResponse.json({ error: 'Failed to create donation' }, { status: 500 });
  }
} 