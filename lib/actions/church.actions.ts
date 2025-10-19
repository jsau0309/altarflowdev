"use server";

import { prisma } from '@/lib/db';
import { Church, DonationType } from "@prisma/client";

// Serialized version of DonationType for Client Components
type SerializedDonationType = Omit<DonationType, 'goalAmount'> & {
  goalAmount: string | null;
};

interface ChurchData {
  church: Church;
  donationTypes: SerializedDonationType[];
}

export async function getChurchBySlug(slug: string): Promise<ChurchData | null> {
  try {
    const church = await prisma.church.findUnique({
      where: { slug },
    });

    if (!church) {
      return null;
    }

    // Use UTC midnight for consistent date comparisons (database stores dates at UTC midnight)
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0); // Reset to UTC midnight for date-only comparison

    const donationTypes = await prisma.donationType.findMany({
      where: {
        churchId: church.id,
        isActive: true, // Only active donation types
        OR: [
          { isCampaign: false }, // System types (Tithe, Offering) always show
          { // For campaigns, check if they've started and haven't ended
            AND: [
              { isCampaign: true },
              { startDate: { lte: now } }, // Campaign has started
              {
                OR: [
                  { endDate: null }, // No end date (ongoing)
                  { endDate: { gte: now } } // End date hasn't passed
                ]
              }
            ]
          }
        ]
      },
      orderBy: [
        { isSystemType: 'desc' }, // System types first
        { name: 'asc' }
      ]
    });

    // Serialize Decimal fields to strings for Client Components
    const serializedDonationTypes: SerializedDonationType[] = donationTypes.map(dt => ({
      ...dt,
      goalAmount: dt.goalAmount ? dt.goalAmount.toString() : null,
    }));

    return { church, donationTypes: serializedDonationTypes };
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
