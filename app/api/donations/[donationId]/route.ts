import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Update schema validation if Member/Donation Type IDs are UUIDs
const donationUpdateSchema = z.object({
  donorFirstName: z.string().nullable().optional(),
  donorLastName: z.string().nullable().optional(),
  donorEmail: z.string().email().nullable().optional(),
  memberId: z.string().uuid({ message: "Invalid Member ID format" }).nullable().optional(), // Assuming UUID
  donationTypeId: z.string().uuid({ message: "Invalid Donation Type ID format" }).nullable().optional(), // Assuming UUID
}).partial(); 

// GET /api/donations/[donationId] - Fetch a single donation from the active organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ donationId: string }> }
) {
  try {
    const { donationId } = await params;
    // 1. Get user and organization context
    const { userId, orgId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      console.error(`User ${userId} attempted GET on donation ${donationId} without active org.`);
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }
    // TODO: Role check needed?

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
    const { donationId } = await params;
    console.error(`Error fetching donation ${donationId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch donation' }, { status: 500 });
  }
}

// PATCH /api/donations/[donationId] - Update a donation in the active organization
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ donationId: string }> }
) {
  let orgId: string | null | undefined = null; // Declare outside try
  try {
    const { donationId } = await params;
    // 1. Get user and organization context
    const authResult = getAuth(request);
    const userId = authResult.userId;
    orgId = authResult.orgId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      console.error(`User ${userId} attempted PATCH on donation ${donationId} without active org.`);
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }
    // TODO: Implement role-based access (e.g., only ADMIN using authResult.orgRole)

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

    // 3. Validate foreign keys belong to the same church
    if (donationData.memberId) {
      const member = await prisma.member.findFirst({
        where: {
          id: donationData.memberId,
          church: { clerkOrgId: orgId }
        }
      });
      if (!member) {
        return NextResponse.json({ error: 'Invalid member ID or member does not belong to your organization' }, { status: 400 });
      }
    }
    
    if (donationData.donationTypeId) {
      const donationType = await prisma.donationType.findFirst({
        where: {
          id: donationData.donationTypeId,
          church: { clerkOrgId: orgId }
        }
      });
      if (!donationType) {
        return NextResponse.json({ error: 'Invalid donation type ID or donation type does not belong to your organization' }, { status: 400 });
      }
    }
    
    // 4. Prepare data, handling potential disconnections
    const dataToUpdate: Prisma.DonationUpdateInput = {
      // Only include fields present in the validated data
      ...(donationData.donorFirstName !== undefined && { donorFirstName: donationData.donorFirstName }),
      ...(donationData.donorLastName !== undefined && { donorLastName: donationData.donorLastName }),
      ...(donationData.donorEmail !== undefined && { donorEmail: donationData.donorEmail }),
      member: donationData.memberId === null 
        ? { disconnect: true } 
        : (donationData.memberId ? { connect: { id: donationData.memberId } } : undefined),
      donationType: donationData.donationTypeId === null
        ? { disconnect: true }
        : (donationData.donationTypeId ? { connect: { id: donationData.donationTypeId } } : undefined),
    };

    // Check if there's actually anything to update
    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    // 5. Perform update using updateMany to ensure org boundary
    const updateResult = await prisma.donation.updateMany({
      where: { 
        id: donationId,
        church: { clerkOrgId: orgId } // Ensure org match
        // Optional: Add stripePaymentIntentId: null check if needed
      },
      data: dataToUpdate,
    });

    // 6. Check if update occurred
    if (updateResult.count === 0) {
       return NextResponse.json({ error: 'Donation not found, access denied, or no changes needed' }, { status: 404 });
    }
    
    // 7. Fetch and return updated donation
    const updatedDonation = await prisma.donation.findFirst({
        where: { id: donationId, church: { clerkOrgId: orgId } }
    });

    return NextResponse.json(updatedDonation);

  } catch (error) {
    const { donationId } = await params;
    console.error(`Error updating donation ${donationId}:`, error);
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
  { params }: { params: Promise<{ donationId: string }> }
) {
  let orgId: string | null | undefined = null; // Declare outside try
  try {
    const { donationId } = await params;
    // 1. Get user and organization context
    const authResult = getAuth(request);
    const userId = authResult.userId;
    orgId = authResult.orgId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      console.error(`User ${userId} attempted DELETE on donation ${donationId} without active org.`);
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }
    // TODO: Add strict role check here later!

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
     const { donationId } = await params;
     console.error(`Error deleting donation ${donationId}:`, error);
     // P2003 (FK constraint) is unlikely on delete unless schema changes
    return NextResponse.json({ error: 'Failed to delete donation' }, { status: 500 });
  }
} 