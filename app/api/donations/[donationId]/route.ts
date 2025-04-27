import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-helpers';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Schema for validating updated donation data (PATCH) - Limited use case?
const donationUpdateSchema = z.object({
  // Typically, core details like amount/date of processed donations aren't changed.
  // Maybe allow updating links or non-financial details?
  donorFirstName: z.string().nullable().optional(),
  donorLastName: z.string().nullable().optional(),
  donorEmail: z.string().email().nullable().optional(),
  memberId: z.string().cuid().nullable().optional(),
  campaignId: z.string().cuid().nullable().optional(),
}).partial(); 

// GET /api/donations/[donationId] - Fetch a single donation
export async function GET(
  request: Request,
  { params }: { params: { donationId: string } }
) {
  try {
    // Authentication & Authorization check
    // TODO: Role check needed? Current RLS allows authenticated read.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const donationId = params.donationId;
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      // Example: Include related data
      // include: { 
      //   member: { select: { firstName: true, lastName: true } },
      //   campaign: { select: { name: true } }
      // }
    });

    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
    }

    return NextResponse.json(donation);

  } catch (error) {
    console.error(`Error fetching donation ${params.donationId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch donation' }, { status: 500 });
  }
}

// PATCH /api/donations/[donationId] - Update a donation (Limited Use)
export async function PATCH(
  request: Request,
  { params }: { params: { donationId: string } }
) {
  try {
    // Authentication & Authorization check
    // TODO: Implement role-based access (e.g., only ADMIN)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const donationId = params.donationId;

    // Check existence
    const existingDonation = await prisma.donation.findUnique({ where: { id: donationId }, select: { id: true, stripePaymentIntentId: true } });
    if (!existingDonation) {
       return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
    }
    
    // Prevent updating donations processed via Stripe?
    // if (existingDonation.stripePaymentIntentId) {
    //   return NextResponse.json({ error: 'Cannot modify donations processed online.' }, { status: 403 });
    // }

    const body = await request.json();
    
    // Validate input data
    const validation = donationUpdateSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: 'Invalid input data', details: validation.error.errors }, { status: 400 });
    }
    const donationData = validation.data;

    // Prepare data, handling potential disconnections
    const dataToUpdate: Prisma.DonationUpdateInput = {
      donorFirstName: donationData.donorFirstName,
      donorLastName: donationData.donorLastName,
      donorEmail: donationData.donorEmail,
      // Connect/disconnect logic for relations
      member: donationData.memberId === null 
        ? { disconnect: true } 
        : (donationData.memberId ? { connect: { id: donationData.memberId } } : undefined),
      campaign: donationData.campaignId === null
        ? { disconnect: true }
        : (donationData.campaignId ? { connect: { id: donationData.campaignId } } : undefined),
    };

    const updatedDonation = await prisma.donation.update({
      where: { id: donationId },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedDonation);

  } catch (error) {
    console.error(`Error updating donation ${params.donationId}:`, error);
    // Handle potential foreign key or record not found errors during connect
    if (error instanceof Error && 'code' in error && typeof error.code === 'string' && (error.code === 'P2003' || error.code === 'P2025')) { 
        return NextResponse.json({ error: 'Invalid or non-existent Member or Campaign ID provided for update.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update donation' }, { status: 500 });
  }
}

// DELETE /api/donations/[donationId] - Delete a donation (Use with caution!)
export async function DELETE(
  request: Request,
  { params }: { params: { donationId: string } }
) {
  try {
    // Authentication & Authorization check
    // TODO: Implement role-based access (VERY restricted, e.g., ADMIN only?)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Add strict role check here later!

    const donationId = params.donationId;

    // Check existence 
    const existingDonation = await prisma.donation.findUnique({ where: { id: donationId }, select: { id: true, stripePaymentIntentId: true } });
    if (!existingDonation) {
      return new NextResponse(null, { status: 204 }); // Already deleted
    }
    
    // Prevent deleting donations processed via Stripe?
    // if (existingDonation.stripePaymentIntentId) {
    //   return NextResponse.json({ error: 'Cannot delete donations processed online.' }, { status: 403 });
    // }

    await prisma.donation.delete({
      where: { id: donationId },
    });

    return new NextResponse(null, { status: 204 }); // No Content

  } catch (error) {
     console.error(`Error deleting donation ${params.donationId}:`, error);
    return NextResponse.json({ error: 'Failed to delete donation' }, { status: 500 });
  }
} 