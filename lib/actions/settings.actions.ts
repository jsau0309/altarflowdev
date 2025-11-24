"use server"; // Add the 'use server' directive

// import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
// Removed unused imports - all configuration functions moved to flows.actions.ts
import { logger } from '@/lib/logger';

/**
 * Fetches the church profile associated with the currently authenticated user's active organization.
 * Throws an error if user is not authenticated, no org is active, or the church record is not found.
 */
export async function getAuthenticatedChurchProfile() {
    // Get user and organization context directly using auth()
    const { userId, orgId } = await auth();

    if (!userId) {
        logger.error('getAuthenticatedChurchProfile Auth Error: No Clerk userId found.', { operation: 'actions.error' });
        throw new Error("Unauthorized"); // Throw error for server component/action handler
    }
    if (!orgId) {
        logger.error('User ${userId} has no active organization selected.', { operation: 'actions.error' });
        // Depending on usage, might return null or throw specific error
        throw new Error("No active organization selected.");
    }

    // Remove profile fetch
    // const userProfile = await prisma.profile.findUnique(...);

    // Fetch the church details using the clerkOrgId
    const church = await prisma.church.findUnique({
        where: { clerkOrgId: orgId }, // Find using clerkOrgId
        select: {
            // Select fields needed by callers
            name: true,
            phone: true,
            address: true,
            website: true,
            // Consider selecting id and clerkOrgId too?
            // id: true,
            // clerkOrgId: true,
        },
    });

    if (!church) {
        logger.error('Church not found for clerkOrgId: ${orgId}', { operation: 'actions.error' });
        // Indicates potential sync issue or org selected that doesn't exist locally
        throw new Error("Associated church record not found for the active organization.");
    }

    return church;
}

// Removed getFormConfiguration as it's moved and refactored in flows.actions.ts

// Removed saveFormConfiguration as it's moved and refactored in flows.actions.ts