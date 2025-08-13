import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { revalidateTag } from 'next/cache';

// Schema for validating updated member data (PATCH)
const memberUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
  membershipStatus: z.string().nullable().optional(),
  joinDate: z.string().datetime().nullable().optional(),
  ministryInvolvement: z.string().nullable().optional(),
  smsConsent: z.boolean().optional(),
  smsConsentDate: z.string().datetime().nullable().optional(),
  smsConsentMethod: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
}).partial(); // .partial() makes all fields optional

// GET /api/members/[memberId] - Fetch a single member from the active organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    // 1. Get user and organization context
    const { userId, orgId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      console.error(`User ${userId} attempted GET on member ${memberId} without active org.`);
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }

    // 2. Fetch the member *only if* it exists AND belongs to the active organization
    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        church: { // Check the relation
          clerkOrgId: orgId
        }
      },
      // include relations if needed for display
    });

    if (!member) {
      // Returns 404 if member doesn't exist or doesn't belong to this user's org
      return NextResponse.json({ error: 'Member not found or access denied' }, { status: 404 });
    }

    // Authorization check passed implicitly by the query
    return NextResponse.json(member);

  } catch (error) {
    const { memberId } = await params;
    console.error(`Error fetching member ${memberId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 });
  }
}

// PATCH /api/members/[memberId] - Update an existing member in the active organization
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  let orgId: string | null | undefined = null; // Declare orgId outside try
  try {
    const { memberId } = await params;
    // 1. Get user and organization context
    const authResult = getAuth(request);
    const userId = authResult.userId;
    orgId = authResult.orgId;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      console.error(`User ${userId} attempted PATCH on member ${memberId} without active org.`);
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }
    // TODO: Add role-based check? (e.g., authResult.orgRole === 'admin')

    // Remove profile fetch and initial existence check based on old churchId

    const body = await request.json();

    // Debug logging removed: received join date in request body
    
    // 2. Validate input data
    const validation = memberUpdateSchema.safeParse(body);
    if (!validation.success) {
        console.error("Member update validation error:", validation.error.errors);
        return NextResponse.json({ error: 'Invalid input data', details: validation.error.errors }, { status: 400 });
    }
    const memberData = validation.data;

    // 3. Prepare data for update
    const dataToUpdate: any = { ...memberData };
    if (memberData.joinDate !== undefined) {
      dataToUpdate.joinDate = memberData.joinDate ? new Date(memberData.joinDate) : null;
      // Debug logging removed: prepared join date for update
    }
    if (memberData.smsConsentDate !== undefined) {
      dataToUpdate.smsConsentDate = memberData.smsConsentDate ? new Date(memberData.smsConsentDate) : null;
    }
    if (memberData.email !== undefined && memberData.email === '') {
      dataToUpdate.email = null;
    }

    // 4. Perform the update using updateMany with compound where clause
    const updateResult = await prisma.member.updateMany({
      where: { 
        id: memberId,
        church: { // Ensure update only happens for the correct org
          clerkOrgId: orgId
        }
      },
      data: dataToUpdate,
    });

    // 5. Check if the update was successful (if count is 0, member wasn't found in this org)
    if (updateResult.count === 0) {
      return NextResponse.json({ error: 'Member not found or access denied' }, { status: 404 });
    }

    // Invalidate dashboard cache after updating member
    // Debug logging removed: member updated, invalidating cache
    revalidateTag(`dashboard-${orgId}`);

    // 6. Fetch the updated member to return it (optional, but good practice)
    const updatedMember = await prisma.member.findFirst({
      where: {
        id: memberId,
        church: { clerkOrgId: orgId }
      }
    });

    return NextResponse.json(updatedMember);

  } catch (error) {
    const { memberId } = await params;
    console.error(`Error updating member ${memberId}:`, error);
    // Handle potential Prisma errors (e.g., unique constraint on email)
    if (error instanceof Error && 'code' in error && typeof error.code === 'string' && error.code === 'P2002') { 
        let conflictingField = 'unique field';
        if ('meta' in error && typeof error.meta === 'object' && error.meta && 'target' in error.meta && Array.isArray(error.meta.target)) {
            conflictingField = error.meta.target.join(', ');
        }
        return NextResponse.json({ error: `Database constraint violation on ${conflictingField}. Value might already exist.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}

// DELETE /api/members/[memberId] - Delete a member from the active organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  let orgId: string | null | undefined = null; // Declare orgId outside try
  try {
    const { memberId } = await params;
    // 1. Get user and organization context
    const authResult = getAuth(request);
    const userId = authResult.userId;
    orgId = authResult.orgId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      console.error(`User ${userId} attempted DELETE on member ${memberId} without active org.`);
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }
    // TODO: Add role-based check?

    // Remove profile fetch

    // 2. Delete related records first (in a transaction)
    const deleteResult = await prisma.$transaction(async (tx) => {
      // Delete related EmailRecipient records
      await tx.emailRecipient.deleteMany({
        where: { memberId }
      });

      // Delete related EmailPreference if exists
      await tx.emailPreference.deleteMany({
        where: { memberId }
      });

      // Delete related Submission records
      await tx.submission.deleteMany({
        where: { memberId }
      });

      // Delete related Donation records
      await tx.donation.deleteMany({
        where: { memberId }
      });

      // Finally delete the member with compound where clause to ensure ownership
      return await tx.member.deleteMany({
        where: { 
          id: memberId, 
          church: { // Ensure deletion only happens for the correct org
            clerkOrgId: orgId
          }
        },
      });
    });

    // 3. Check if a record was actually deleted
    if (deleteResult.count === 0) {
      console.warn(`DELETE attempt failed for member ${memberId} by user ${userId} (org ${orgId}). Count: ${deleteResult.count}`);
      return NextResponse.json({ error: 'Member not found or access denied' }, { status: 404 });
    }

    // Invalidate dashboard cache after deleting member
    // Debug logging removed: member deleted, invalidating cache
    revalidateTag(`dashboard-${orgId}`);
    
    return new NextResponse(null, { status: 204 }); // No Content

  } catch (error) {
    const { memberId } = await params;
    console.error(`Error deleting member ${memberId}:`, error);
    // Handle potential Prisma errors
    if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
      if (error.code === 'P2003') {
        return NextResponse.json({ 
          error: 'Cannot delete member due to existing related records. Please contact support if this persists.' 
        }, { status: 409 }); // Conflict
      }
      if (error.code === 'P2025') {
        return NextResponse.json({ 
          error: 'Member not found or already deleted.' 
        }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 });
  }
} 