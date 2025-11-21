import { NextRequest, NextResponse } from 'next/server';
// import { createServerClient } from '@supabase/ssr'; // <-- Remove Supabase
// import { createClient } from '@supabase/supabase-js'; // <-- Remove Supabase Admin
import { prisma } from '@/lib/db';
// import { cookies } from 'next/headers'; // <-- Remove if not used
import { getAuth, clerkClient } from '@clerk/nextjs/server'; // Import clerkClient
import { OrganizationMembership } from '@clerk/backend'; // Import type for mapping
import { logger } from '@/lib/logger';

// Removed Supabase Admin Client initialization

// GET /api/settings/users - Fetches user profiles associated with the active organization
export async function GET(request: NextRequest) {

  try {
    // 1. Get authenticated user & organization context
    const { userId, orgId } = getAuth(request);
    
    if (!userId) { 
      logger.error('GET Users Auth Error: No Clerk userId found.', { operation: 'api.error' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      logger.error('User ${userId} tried to GET /users without active org.', { operation: 'api.error' });
      return NextResponse.json([], { status: 200 }); 
    }

    // 2. Get list of member IDs from Clerk for the active organization
    let memberUserIds: string[] = [];
    try {
      const client = await clerkClient();
      // Access the data property of the paginated response
      const membershipsResponse = await client.organizations.getOrganizationMembershipList({ 
          organizationId: orgId,
          // Optional: Add limit if needed to fetch more than default (e.g., 10)
          // limit: 100 
      });
      
      // Extract user IDs from the data array within the response
      memberUserIds = membershipsResponse.data // Access the .data property
          .map((mem: OrganizationMembership) => mem.publicUserData?.userId)
          .filter((id: string | undefined | null): id is string => !!id); 
          
      if (memberUserIds.length === 0) {
           logger.info('No members found in Clerk for organization ${orgId}', { operation: 'api.info' });
           return NextResponse.json([], { status: 200 }); // No members in org
      }
    } catch (clerkError) {
       logger.error('Failed to fetch members from Clerk for org ${orgId}:', { operation: 'api.error' }, clerkError instanceof Error ? clerkError : new Error(String(clerkError)));
       return NextResponse.json({ error: 'Failed to retrieve organization members' }, { status: 500 });
    }

    // 3. Fetch all corresponding profiles from the local database
    const profiles = await prisma.profile.findMany({
      where: { 
        id: { 
          in: memberUserIds // Filter by the list of user IDs from Clerk
        } 
      },
      select: { 
        id: true, 
        firstName: true, 
        lastName: true, 
        role: true,
        email: true, // Assuming email is synced to Profile via webhook
      },
      orderBy: [
        { role: 'asc' }, // Assuming ADMIN comes before STAFF
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    // 4. Return the fetched profiles
    return NextResponse.json(profiles);

  } catch (error) {
    logger.error('Error in GET /api/settings/users:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    // Return the actual Prisma/other error message now for better debugging
    return NextResponse.json({ error: 'Failed to fetch users', details: message }, { status: 500 });
  }
} 