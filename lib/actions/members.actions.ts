"use server";

import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { authorizeChurchAccess } from '@/lib/auth/authorize-church-access';
import { logger } from '@/lib/logger';

export interface MemberForLinkingSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  churchId: string;
}

export interface MemberSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

/**
 * Fetches a summary list of all members for a given church.
 * Used for populating selection lists, e.g., when linking a donor to a member.
 */
export async function getMembersForChurch(churchId: string): Promise<MemberSummary[]> {
  if (!churchId) {
    logger.error('[getMembersForChurch] Church ID is required.', { operation: 'actions.error' });
    return [];
  }

  try {
    // Authorization check - verify user has access to this church
    const authResult = await authorizeChurchAccess(churchId);
    if (!authResult.success) {
      logger.error('[getMembersForChurch] Authorization failed', { operation: 'actions.members.auth_failed', error: authResult.error });
      return [];
    }

    const members = await prisma.member.findMany({
      where: {
        churchId: authResult.churchId,
        // Optionally, filter by active status if needed, e.g., status: 'Active'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: [
        {
          lastName: 'asc',
        },
        {
          firstName: 'asc',
        },
      ],
    });

    return members.map(member => ({
      id: member.id,
      firstName: member.firstName ?? '', // Ensure no nulls for display
      lastName: member.lastName ?? '',   // Ensure no nulls for display
      email: member.email,
    }));

  } catch (error) {
    logger.error('[getMembersForChurch] Failed to fetch members for church ${churchId}:', { operation: 'actions.error' }, error instanceof Error ? error : new Error(String(error)));
    return []; // Return empty array on error
  }
}

/**
 * Fetches a summary list of all members from the current user's church.
 * Used for populating selection lists, e.g., when linking a donor to a member.
 */
export async function getAllMembersForLinking(): Promise<MemberForLinkingSummary[]> {
  const { orgId } = await auth();
  if (!orgId) {
    logger.error('[getAllMembersForLinking] User is not associated with a church.', { operation: 'actions.error' });
    return [];
  }

  try {
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });

    if (!church) {
      logger.error('[getAllMembersForLinking] Church not found for orgId: ${orgId}', { operation: 'actions.error' });
      return [];
    }

    const members = await prisma.member.findMany({
      where: {
        churchId: church.id,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        churchId: true,
      },
      orderBy: [
        {
          lastName: 'asc',
        },
        {
          firstName: 'asc',
        },
      ],
    });

    return members.map(member => ({
      id: member.id,
      firstName: member.firstName ?? '', // Ensure no nulls for display
      lastName: member.lastName ?? '',   // Ensure no nulls for display
      email: member.email,
      churchId: member.churchId,
    }));

  } catch (error) {
    logger.error('[getAllMembersForLinking] Failed to fetch members for orgId ${orgId}:', { operation: 'actions.error' }, error instanceof Error ? error : new Error(String(error)));
    return []; // Return empty array on error
  }
}
