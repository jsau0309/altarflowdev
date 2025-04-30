import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Update schema validation if Member/Campaign IDs are UUIDs
const donationUpdateSchema = z.object({
  donorFirstName: z.string().nullable().optional(),
  donorLastName: z.string().nullable().optional(),
  donorEmail: z.string().email().nullable().optional(),
  memberId: z.string().uuid({ message: "Invalid Member ID format" }).nullable().optional(), // Assuming UUID
  campaignId: z.string().uuid({ message: "Invalid Campaign ID format" }).nullable().optional(), // Assuming UUID
}).partial(); 

// GET /api/donations/[donationId] - Fetch a single donation from the active organization
export async function GET(
  request: NextRequest,
  { params }: { params: { donationId: string } }
) {
  try {
    // 1. Get user and organization context
    const { userId, orgId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      console.error(`User ${userId} attempted GET on donation ${params.donationId} without active org.`);
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }
    // TODO: Role check needed?

    const donationId = params.donationId;

    // 2. Fetch donation only if it belongs to the active org
    const donation = await prisma.donation.findFirst({
      where: { 
        id: donationId, 
        church: { clerkOrgId: orgId } 
      },
      // include: { ... } // Add includes if needed
    });

    if (!donation) {
      // Not found or doesn't belong to this org
      return NextResponse.json({ error: 'Donation not found or access denied' }, { status: 404 });
    }

    return NextResponse.json(donation);

  } catch (error) {
    console.error(`Error fetching donation ${params.donationId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch donation' }, { status: 500 });
  }
}

// PATCH /api/donations/[donationId] - Update a donation in the active organization
export async function PATCH(
  request: NextRequest,
  { params }: { params: { donationId: string } }
) {
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
      console.error(`User ${userId} attempted PATCH on donation ${params.donationId} without active org.`);
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }
    // TODO: Implement role-based access (e.g., only ADMIN using authResult.orgRole)

    const donationId = params.donationId;

    // Remove initial existence check, updateMany handles this with the org check
    // const existingDonation = await prisma.donation.findUnique(...);
    
    // TODO: Consider check here if donation is from Stripe and disallow update?
    // const donationOrg = await prisma.donation.findFirst({ 
    //    where: { id: donationId, church: { clerkOrgId: orgId }, stripePaymentIntentId: { not: null } }, 
    //    select: { id: true }
    // });
    // if (donationOrg) return ...

    const body = await request.json();
    
    // 2. Validate input data
    const validation = donationUpdateSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: 'Invalid input data', details: validation.error.errors }, { status: 400 });
    }
    const donationData = validation.data;

    // 3. Prepare data, handling potential disconnections
    const dataToUpdate: Prisma.DonationUpdateInput = {
      // Only include fields present in the validated data
      ...(donationData.donorFirstName !== undefined && { donorFirstName: donationData.donorFirstName }),
      ...(donationData.donorLastName !== undefined && { donorLastName: donationData.donorLastName }),
      ...(donationData.donorEmail !== undefined && { donorEmail: donationData.donorEmail }),
      member: donationData.memberId === null 
        ? { disconnect: true } 
        : (donationData.memberId ? { connect: { id: donationData.memberId } } : undefined),
      campaign: donationData.campaignId === null
        ? { disconnect: true }
        : (donationData.campaignId ? { connect: { id: donationData.campaignId } } : undefined),
    };

    // Check if there's actually anything to update
    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    // 4. Perform update using updateMany to ensure org boundary
    const updateResult = await prisma.donation.updateMany({
      where: { 
        id: donationId,
        church: { clerkOrgId: orgId } // Ensure org match
        // Optional: Add stripePaymentIntentId: null check if needed
      },
      data: dataToUpdate,
    });

    // 5. Check if update occurred
    if (updateResult.count === 0) {
       return NextResponse.json({ error: 'Donation not found, access denied, or no changes needed' }, { status: 404 });
    }
    
    // 6. Fetch and return updated donation
    const updatedDonation = await prisma.donation.findFirst({
        where: { id: donationId, church: { clerkOrgId: orgId } }
    });

    return NextResponse.json(updatedDonation);

  } catch (error) {
    console.error(`Error updating donation ${params.donationId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003' || error.code === 'P2025') {
          const field = (error.meta as any)?.field_name || 'related record';
          const model = (error.meta as any)?.modelName || 'record';
          console.warn(`Failed donation update due to invalid foreign key on ${field} or ${model} not found.`);
          return NextResponse.json({ error: `Invalid or non-existent ${field} provided for update.` }, { status: 400 });
        }
    }
    return NextResponse.json({ error: 'Failed to update donation' }, { status: 500 });
  }
}

// DELETE /api/donations/[donationId] - Delete a donation from the active organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: { donationId: string } }
) {
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
      console.error(`User ${userId} attempted DELETE on donation ${params.donationId} without active org.`);
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }
    // TODO: Add strict role check here later!

    const donationId = params.donationId;

    // Remove initial existence check

    // TODO: Add check here if donation is from Stripe and disallow delete?
    // const donationOrg = await prisma.donation.findFirst({...}); if (donationOrg) return ...

    // 2. Use deleteMany with compound where clause to ensure ownership
    const deleteResult = await prisma.donation.deleteMany({
      where: { 
        id: donationId, 
        church: { clerkOrgId: orgId } // Ensure deletion only happens for the correct org
        // Optional: Add stripePaymentIntentId: null check if needed
      },
    });

    // 3. Check if a record was actually deleted
    if (deleteResult.count === 0) {
      // Not found or doesn't belong to this org - considered success for idempotency
      return new NextResponse(null, { status: 204 });
    }

    console.log(`Donation ${donationId} deleted successfully by user ${userId} (org ${orgId})`);
    return new NextResponse(null, { status: 204 }); // No Content

  } catch (error) {
     console.error(`Error deleting donation ${params.donationId}:`, error);
     // P2003 (FK constraint) is unlikely on delete unless schema changes
    return NextResponse.json({ error: 'Failed to delete donation' }, { status: 500 });
  }
} 