import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Input validation schema
const inviteSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

// Ensure Supabase environment variables are set for Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables required for admin actions in /api/settings/invitations.');
}

// Create Supabase Admin client
const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

const MAX_STAFF_MEMBERS = 3;

// POST /api/settings/invitations - Invites a new user to the church
export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error: Supabase Admin client not available.' }, { status: 500 });
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { get(name: string) { return cookieStore.get(name)?.value; } },
    }
  );

  try {
    // 1. Get authenticated user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Get user's profile, churchId, and role for validation
    const userProfile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { churchId: true, role: true },
    });

    if (!userProfile || !userProfile.churchId) {
      return NextResponse.json({ error: 'User profile or church association not found' }, { status: 404 });
    }
    // 3. Authorization: Check if user is ADMIN
    if (userProfile.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden: Only admins can invite users.' }, { status: 403 });
    }
    const churchId = userProfile.churchId;

    // 4. Parse and validate request body
    const body = await request.json();
    const validation = inviteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }
    const { email: emailToInvite } = validation.data;

    // --- Add Check for Existing User --- 
    // It might be better to disallow inviting an email that already exists in auth.users
    // or handle it differently (e.g., just add them to the church if they exist but aren't linked)
    // For now, we proceed assuming Supabase invite handles existing users gracefully.

    // 5. Check User Limit
    const staffCount = await prisma.profile.count({
      where: {
        churchId: churchId,
        role: 'STAFF',
      },
    });

    if (staffCount >= MAX_STAFF_MEMBERS) {
      return NextResponse.json({ error: `User limit reached (${MAX_STAFF_MEMBERS} staff members maximum).` }, { status: 403 });
    }

    // 6. Send invite using Supabase Admin client
    console.log(`Attempting to invite ${emailToInvite} for church ${churchId}`);
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      emailToInvite,
      {
        // redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/confirm` // Example redirect URL
        // We might add the churchId here if needed later for the trigger/function
        // data: { church_id_for_profile: churchId } 
      }
    );

    if (inviteError) {
      console.error(`Supabase invite error for ${emailToInvite}:`, inviteError);
      // Provide a more user-friendly error based on common Supabase errors if possible
      if (inviteError.message.includes("User already registered")) {
           return NextResponse.json({ error: "This email address is already registered. Cannot invite."}, { status: 409 }); // 409 Conflict
      }
      return NextResponse.json({ error: 'Failed to send invitation.', details: inviteError.message }, { status: 500 });
    }

    console.log(`Invite sent successfully to ${emailToInvite}. Invite data:`, inviteData);

    // **IMPORTANT**: We still need the mechanism (e.g., DB trigger) to create the Profile
    // record with the correct churchId and role='STAFF' when the user accepts the invite.

    return NextResponse.json({ message: 'Invitation sent successfully.' }, { status: 200 });

  } catch (error) {
    console.error("Error in POST /api/settings/invitations:", error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: 'Failed to process invitation request', details: message }, { status: 500 });
  }
} 