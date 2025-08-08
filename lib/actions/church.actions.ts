"use server";

import { prisma } from '@/lib/db';
import { Church, DonationType } from "@prisma/client";

interface ChurchData {
  church: Church;
  donationTypes: DonationType[];
}

export async function getChurchBySlug(slug: string): Promise<ChurchData | null> {
  try {
    const church = await prisma.church.findUnique({
      where: { slug },
    });

    if (!church) {
      return null;
    }

    const donationTypes = await prisma.donationType.findMany({
      where: { churchId: church.id },
      orderBy: { name: 'asc' }, // Optional: order donation types by name
    });

    return { church, donationTypes };
  } catch (error) {
    console.error(`Error fetching church by slug "${slug}":`, error);
    // Optionally, rethrow or handle more gracefully
    return null; 
  }
}

export async function getChurchById(id: string): Promise<Church | null> {
  try {
    const church = await prisma.church.findUnique({
      where: { id }
    });
    return church;
  } catch (error) {
    console.error(`Error fetching church by ID "${id}":`, error);
    return null;
  }
}

export async function getChurchByClerkOrgId(clerkOrgId: string): Promise<Church | null> {
  try {
    const church = await prisma.church.findUnique({
      where: { clerkOrgId } // Query by clerkOrgId
    });
    return church;
  } catch (error) {
    console.error(`Error fetching church by Clerk Org ID "${clerkOrgId}":`, error);
    return null;
  }
}
