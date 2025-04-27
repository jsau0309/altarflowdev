import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-helpers';
import { z } from 'zod';

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

// GET /api/members/[memberId] - Fetch a single member
export async function GET(
  request: Request,
  { params }: { params: { memberId: string } }
) {
  try {
    // Ensure user is authenticated to view member details
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = params.memberId;
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Authorization: Current RLS allows any authenticated user to read.
    // No additional API-level auth check needed for GET for now.
    return NextResponse.json(member);

  } catch (error) {
    console.error(`Error fetching member ${params.memberId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 });
  }
}

// PATCH /api/members/[memberId] - Update an existing member
export async function PATCH(
  request: Request,
  { params }: { params: { memberId: string } }
) {
  try {
    // Ensure user is authenticated
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's churchId
    let userChurchId: string;
    try {
      const profile = await prisma.profile.findUniqueOrThrow({
        where: { id: user.id },
        select: { churchId: true },
      });
      if (!profile.churchId) {
        throw new Error('User profile is missing required churchId.');
      }
      userChurchId = profile.churchId;
    } catch (profileError) {
      console.error(`PATCH: Error fetching profile churchId for user ${user.id}:`, profileError);
      return NextResponse.json({ error: 'Could not verify user church affiliation.' }, { status: 403 }); // Forbidden
    }

    const memberId = params.memberId;

    // Check if member exists AND belongs to the user's church before trying to update
    const existingMember = await prisma.member.findUnique({
      where: { 
        id: memberId,
        // Add churchId check here too, although update below also checks
        // This provides an earlier, clearer 404 if mismatched
        churchId: userChurchId, 
      },
      select: { id: true } 
    });

    if (!existingMember) {
       // Member doesn't exist OR doesn't belong to this church
       return NextResponse.json({ error: 'Member not found or access denied' }, { status: 404 });
    }

    const body = await request.json();
    
    // Validate input data
    const validation = memberUpdateSchema.safeParse(body);
    if (!validation.success) {
        console.error("Member update validation error:", validation.error.errors);
        return NextResponse.json({ error: 'Invalid input data', details: validation.error.errors }, { status: 400 });
    }
    const memberData = validation.data;

    // Handle date conversions and potential null values
    const dataToUpdate: any = { ...memberData };
    if (memberData.joinDate !== undefined) {
      dataToUpdate.joinDate = memberData.joinDate ? new Date(memberData.joinDate) : null;
    }
    if (memberData.smsConsentDate !== undefined) {
      dataToUpdate.smsConsentDate = memberData.smsConsentDate ? new Date(memberData.smsConsentDate) : null;
    }
    // Ensure email is null if explicitly set to empty string or null
    if (memberData.email !== undefined && memberData.email === '') {
      dataToUpdate.email = null;
    }

    // Perform the update using a compound where clause
    const updatedMember = await prisma.member.update({
      where: { 
        id: memberId,
        churchId: userChurchId // <<< Ensure update only happens if churchId matches
      },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedMember);

  } catch (error) {
    console.error(`Error updating member ${params.memberId}:`, error);
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

// DELETE /api/members/[memberId] - Delete a member
export async function DELETE(
  request: Request,
  { params }: { params: { memberId: string } }
) {
  try {
    // Ensure user is authenticated
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's churchId
    let userChurchId: string;
    try {
      const profile = await prisma.profile.findUniqueOrThrow({
        where: { id: user.id },
        select: { churchId: true },
      });
      if (!profile.churchId) {
        throw new Error('User profile is missing required churchId.');
      }
      userChurchId = profile.churchId;
    } catch (profileError) {
      console.error(`DELETE: Error fetching profile churchId for user ${user.id}:`, profileError);
      return NextResponse.json({ error: 'Could not verify user church affiliation.' }, { status: 403 }); // Forbidden if profile issue
    }

    const memberId = params.memberId;

    // Use deleteMany with compound where clause to ensure ownership
    // deleteMany returns a count, which is useful
    const deleteResult = await prisma.member.deleteMany({
      where: { 
        id: memberId, 
        churchId: userChurchId // <<< Ensure member belongs to user's church
      },
    });

    // Check if a record was actually deleted
    if (deleteResult.count === 0) {
      // This means either the member didn't exist OR it didn't belong to the user's church
      console.warn(`DELETE attempt failed for member ${memberId} by user ${user.id} (church ${userChurchId}). Count: ${deleteResult.count}`);
      // Return 404 - Not Found, as the user shouldn't find/delete this resource
      return NextResponse.json({ error: 'Member not found or access denied' }, { status: 404 });
    }

    console.log(`Member ${memberId} deleted successfully by user ${user.id} (church ${userChurchId})`);
    return new NextResponse(null, { status: 204 }); // No Content on successful deletion

  } catch (error) {
    console.error(`Error deleting member ${params.memberId}:`, error);
    // Handle potential Prisma errors (e.g., foreign key constraint if member has related donations)
    if (error instanceof Error && 'code' in error && typeof error.code === 'string' && error.code === 'P2003') { 
        return NextResponse.json({ error: 'Cannot delete member due to existing related records (e.g., donations).' }, { status: 409 }); // Conflict
    }
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 });
  }
} 