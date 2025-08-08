"use server";

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';

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
    console.error('[getMembersForChurch] Church ID is required.');
    return [];
  }

  try {
    const members = await prisma.member.findMany({
      where: {
        churchId: churchId,
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
    console.error(`[getMembersForChurch] Failed to fetch members for church ${churchId}:`, error);
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
    console.error('[getAllMembersForLinking] User is not associated with a church.');
    return [];
  }

  try {
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });

    if (!church) {
      console.error(`[getAllMembersForLinking] Church not found for orgId: ${orgId}`);
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
    console.error(`[getAllMembersForLinking] Failed to fetch members for orgId ${orgId}:`, error);
    return []; // Return empty array on error
  }
}
