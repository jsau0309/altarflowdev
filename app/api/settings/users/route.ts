import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// Ensure Supabase environment variables are set for Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables required for admin actions in /api/settings/users.');
  // Consider how to handle this failure - maybe throw an error during build/startup?
}

// Create Supabase Admin client - needed to fetch user details like email
const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

// GET /api/settings/users - Fetches users associated with the admin's church
export async function GET(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error: Supabase Admin client not available.' }, { status: 500 });
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        // No need for set/remove in GET
      },
    }
  );

  try {
    // 1. Get authenticated user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      console.error("GET Users Auth Error:", sessionError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Get the user's churchId from their profile
    const userProfile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { churchId: true },
    });

    if (!userProfile || !userProfile.churchId) {
      console.error(`User ${userId} profile or churchId not found for GET /users.`);
      return NextResponse.json({ error: 'User profile or church association not found' }, { status: 404 });
    }
    const churchId = userProfile.churchId;

    // 3. Fetch all profiles associated with this church
    const profiles = await prisma.profile.findMany({
      where: { churchId: churchId },
      select: { 
        id: true, 
        firstName: true, 
        lastName: true, 
        role: true 
      },
      orderBy: [
        { role: 'asc' },
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    // 4. Get the list of user IDs from the profiles
    const profileUserIds = profiles.map(p => p.id);

    // 5. Fetch user details (like email) from Supabase Auth using Admin client
    // Note: listUsers is paginated; for simplicity, assume fewer than 50 users per church.
    // For >50 users, proper pagination handling is needed.
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      // No explicit filter by IDs here, we'll filter client-side. 
      // Filtering by ID in Supabase API is complex/not standard via listUsers.
      page: 1,
      perPage: 1000, // Fetch a large number to likely get all relevant users
    });

    if (usersError) {
      console.error("Error fetching users from Supabase Auth:", usersError);
      throw new Error('Failed to retrieve user details.');
    }

    // 6. Create a map for quick lookup of Supabase user details by ID
    const supabaseUserMap = new Map(usersData.users.map(u => [u.id, u]));

    // 7. Combine profile data with Supabase auth data
    const combinedUsers = profiles.map(profile => {
      const supabaseUser = supabaseUserMap.get(profile.id);
      return {
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: profile.role,
        email: supabaseUser?.email || null, // Get email from Supabase user
        // Add other fields if needed, e.g., last_sign_in_at from supabaseUser?
      };
    });

    return NextResponse.json(combinedUsers);

  } catch (error) {
    console.error("Error in GET /api/settings/users:", error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: 'Failed to fetch users', details: message }, { status: 500 });
  }
} 