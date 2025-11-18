import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { MembershipStatus, Prisma } from '@prisma/client';

// Schema for validating new member data (POST)
const memberCreateSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email format" }).nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
  membershipStatus: z.string().nullable().optional(),
  joinDate: z.string().datetime({ message: "Invalid date format" }).nullable().optional(),
  // ministryInvolvement: z.string().nullable().optional(), // Replaced by ministry_interests
  life_stage: z.string().nullable().optional(),
  ministry_interests: z.array(z.string()).optional(),
  preferred_service_times: z.array(z.string()).optional(),
  smsConsent: z.boolean().optional().default(false),
  smsConsentDate: z.string().datetime({ message: "Invalid date format" }).nullable().optional(),
  smsConsentMethod: z.string().nullable().optional(),
});

// GET /api/members - Fetch all members
export async function GET(request: NextRequest) {
  try {
    // 1. Get authenticated user and organization context using getAuth
    const { userId, orgId } = getAuth(request); 
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      console.error(`User ${userId} attempted to GET members without an active organization.`);
      // Return empty array or error? Returning empty for now, as user might need to select org.
      return NextResponse.json([], { status: 200 }); 
      // Alternative: return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 }); 
    }

    // 2. Fetch members ONLY for the active organization with email preferences
    const members = await prisma.member.findMany({
      where: {
        Church: { // Filter via the related Church model
          clerkOrgId: orgId // Use the Clerk Organization ID
        }
      },
      include: {
        EmailPreference: {
          select: {
            isSubscribed: true,
            unsubscribedAt: true,
          },
        },
      },
      orderBy: {
        joinDate: 'desc',
      },
    });

    return NextResponse.json(members);

  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

// POST /api/members - Create a new member
export async function POST(request: NextRequest) {
  let orgId: string | null | undefined = null; // Declare orgId outside try block, allowing undefined
  try {
    // 1. Ensure user is authenticated and has an active organization using getAuth
    const authResult = getAuth(request);
    const userId = authResult.userId;
    orgId = authResult.orgId; // Assign orgId here (can be string | null | undefined)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
     // Explicitly check for null or undefined orgId before proceeding
     if (!orgId) { 
      console.error(`User ${userId} attempted to POST member without an active organization.`);
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }

    // No need to fetch profile just for churchId anymore

    const body = await request.json();
    
    // 2. Validate input data
    const validation = memberCreateSchema.safeParse(body);
    if (!validation.success) {
        console.error("Member validation error:", validation.error.errors);
        return NextResponse.json({ error: 'Invalid input data', details: validation.error.errors }, { status: 400 });
    }
    const memberData = validation.data;

    // Capitalize membershipStatus if provided
    if (memberData.membershipStatus) {
      memberData.membershipStatus = memberData.membershipStatus.charAt(0).toUpperCase() + memberData.membershipStatus.slice(1);
    }

    // 3. Prepare data for creation
    const dataToCreate = {
        ...memberData,
        joinDate: memberData.joinDate ? new Date(memberData.joinDate) : new Date(),
        smsConsentDate: memberData.smsConsentDate ? new Date(memberData.smsConsentDate) : null,
    };

    // Ensure email is null if empty string is passed
    if (dataToCreate.email === '') {
      dataToCreate.email = null;
    }
    
    // 4. Create the new member, connecting it to the church via clerkOrgId
    // The check `if (!orgId)` above ensures orgId is a string here
    const newMember = await prisma.member.create({
      data: {
        ...dataToCreate,
        membershipStatus: dataToCreate.membershipStatus as MembershipStatus | null | undefined,
        Church: {
          connect: {
            clerkOrgId: orgId // orgId is guaranteed to be a string here
          }
        }
      } as Prisma.MemberCreateInput,
    });

    // Invalidate dashboard cache after creating member
    // Debug logging removed: member created, invalidating cache
    revalidateTag(`dashboard-${orgId}`);

    return NextResponse.json(newMember, { status: 201 }); // 201 Created

  } catch (error) {
    console.error("Error creating member:", error);
     // Handle potential Prisma errors (e.g., unique constraint on email)
    if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
      if (error.code === 'P2002') { // Unique constraint violation
        let conflictingField = 'unique field';
        if ('meta' in error && typeof error.meta === 'object' && error.meta && 'target' in error.meta && Array.isArray(error.meta.target)) {
            conflictingField = error.meta.target.join(', ');
        }
        return NextResponse.json({ error: `Database constraint violation on ${conflictingField}. Value might already exist.` }, { status: 409 }); // Conflict
      } else if (error.code === 'P2025') { // Referenced record not found (e.g., Church with clerkOrgId)
        // orgId is accessible here from the outer scope
        console.error(`Attempted to connect member to non-existent church with clerkOrgId: ${orgId}`); 
        return NextResponse.json({ error: 'Organization not found for creating member.' }, { status: 404 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });
  }
} 