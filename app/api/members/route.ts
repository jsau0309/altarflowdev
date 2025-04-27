import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-helpers';
import { z } from 'zod';

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
  ministryInvolvement: z.string().nullable().optional(),
  smsConsent: z.boolean().optional().default(false),
  smsConsentDate: z.string().datetime({ message: "Invalid date format" }).nullable().optional(),
  smsConsentMethod: z.string().nullable().optional(),
});

// GET /api/members - Fetch all members
export async function GET(request: Request) {
  try {
    // 1. Get authenticated user
    const user = await getCurrentUser(); 
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get user's churchId from their profile
    const profile = await prisma.profile.findUnique({
      where: { id: user.id }, 
      select: { churchId: true }, 
    });

    if (!profile || !profile.churchId) {
        console.error(`Profile or churchId not found for user: ${user.id} attempting to GET members.`);
        // Return empty array or error? Returning empty for now, as user might not be fully onboarded.
        // return NextResponse.json({ error: 'User profile or church association not found.' }, { status: 400 }); 
        return NextResponse.json([], { status: 200 }); // Return empty array if no church found
    }
    const churchId = profile.churchId;

    // 3. Fetch members ONLY for the user's church
    const members = await prisma.member.findMany({
      where: { 
        churchId: churchId // Filter by churchId
      },
      orderBy: {
        lastName: 'asc',
      },
    });

    return NextResponse.json(members);

  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

// POST /api/members - Create a new member
export async function POST(request: Request) {
  try {
    // Ensure user is authenticated to create members
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the user's profile to get the church ID using the user's ID
    const profile = await prisma.profile.findUnique({
      where: { id: user.id }, // Use the user's Supabase ID which is the Profile ID
      select: { churchId: true }, // Only select the churchId
    });

    if (!profile || !profile.churchId) {
        console.error(`Profile or churchId not found for user: ${user.id}`);
        return NextResponse.json({ error: 'User profile or church association not found.' }, { status: 400 });
    }

    const body = await request.json();
    
    // Validate input data
    const validation = memberCreateSchema.safeParse(body);
    if (!validation.success) {
        console.error("Member validation error:", validation.error.errors);
        return NextResponse.json({ error: 'Invalid input data', details: validation.error.errors }, { status: 400 });
    }
    const memberData = validation.data;

    // Handle date conversions
    const dataToCreate: any = {
        ...memberData,
        joinDate: memberData.joinDate ? new Date(memberData.joinDate) : null,
        smsConsentDate: memberData.smsConsentDate ? new Date(memberData.smsConsentDate) : null,
    };

    // Ensure email is null if empty string is passed
    if (dataToCreate.email === '') {
      dataToCreate.email = null;
    }
    
    // Add the churchId to the data being created
    dataToCreate.churchId = profile.churchId;

    const newMember = await prisma.member.create({
      data: dataToCreate,
    });

    return NextResponse.json(newMember, { status: 201 }); // 201 Created

  } catch (error) {
    console.error("Error creating member:", error);
     // Handle potential Prisma errors (e.g., unique constraint on email)
    // Check if it's a Prisma error with a code
    if (error instanceof Error && 'code' in error && typeof error.code === 'string' && error.code === 'P2002') { 
        // Extract conflicting field if possible (requires parsing error meta)
        let conflictingField = 'unique field';
        if ('meta' in error && typeof error.meta === 'object' && error.meta && 'target' in error.meta && Array.isArray(error.meta.target)) {
            conflictingField = error.meta.target.join(', ');
        }
        return NextResponse.json({ error: `Database constraint violation on ${conflictingField}. Value might already exist.` }, { status: 409 }); // Conflict
    }
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });
  }
} 