"use server";

import { prisma } from "@/lib/prisma";
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
