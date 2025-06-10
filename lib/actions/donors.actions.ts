"use server"

import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore, revalidatePath } from 'next/cache';
import type { Donation as PrismaDonation, Campaign as PrismaCampaign } from '@prisma/client';
import type { DonorDetailsData } from '@/lib/types';

export async function getDonorDetails(donorId: string): Promise<DonorDetailsData | null> {
  noStore(); // Opt out of caching for dynamic data
  if (!donorId) {
    return null;
  }

  try {
    const donorDataFromPrisma = await prisma.member.findUnique({
      where: { id: donorId },
      include: {
        donations: {
          include: {
            campaign: true, // Include campaign details for each donation
          },
          orderBy: {
            donationDate: 'desc',
          },
        },
      },
    });

    if (!donorDataFromPrisma) {
      return null;
    }

    // Explicitly cast to ensure TypeScript recognizes the 'notes' field from the schema
    const donor = donorDataFromPrisma as (typeof donorDataFromPrisma & { notes?: string | null });

    if (!donor) { // This check is technically redundant now but harmless
      return null;
    }

    // Transform the data to match DonorDetailsData, converting dates and Decimals
    return {
      id: donor.id,
      firstName: donor.firstName,
      lastName: donor.lastName,
      email: donor.email,
      phone: donor.phone,
      address: donor.address,
      city: donor.city,
      state: donor.state,
      zipCode: donor.zipCode,
      membershipStatus: donor.membershipStatus,
      joinDate: donor.joinDate?.toISOString() ?? null,
      ministryInvolvement: donor.ministryInvolvement,
      smsConsent: donor.smsConsent,
      smsConsentDate: donor.smsConsentDate?.toISOString() ?? null,
      smsConsentMethod: donor.smsConsentMethod,
      preferredLanguage: donor.language,
      notes: donor.notes ?? null, // Handle potential undefined from assertion
      createdAt: donor.createdAt.toISOString(),
      updatedAt: donor.updatedAt.toISOString(),
      donations: donor.donations.map((donation: PrismaDonation & { campaign: PrismaCampaign | null }) => ({
        id: donation.id,
        amount: donation.amount.toString(), // Convert Decimal to string
        currency: donation.currency,
        donationDate: donation.donationDate.toISOString(),
        donorFirstName: donation.donorFirstName,
        donorLastName: donation.donorLastName,
        donorEmail: donation.donorEmail,
        memberId: donation.memberId,
        campaignId: donation.campaignId,
        stripePaymentIntentId: donation.stripePaymentIntentId,
        createdAt: donation.createdAt.toISOString(),
        updatedAt: donation.updatedAt.toISOString(),
        campaign: donation.campaign ? {
          id: donation.campaign.id,
          name: donation.campaign.name,
          description: donation.campaign.description,
          goalAmount: donation.campaign.goalAmount?.toString() ?? null, // Convert Decimal to string
          startDate: donation.campaign.startDate?.toISOString() ?? null,
          endDate: donation.campaign.endDate?.toISOString() ?? null,
          createdAt: donation.campaign.createdAt.toISOString(),
          updatedAt: donation.campaign.updatedAt.toISOString(),
          // churchId is not part of DonorDetailsData.donations[].campaign type, so omit
        } : null,
      })),
    };
  } catch (error) {
    console.error("Failed to fetch donor details:", error);
    // Consider throwing a more specific error or returning a structured error object
    return null; // Or throw error;
  }
}

// Type for the payload of updateDonorDetails, containing editable fields
// This should align with FormData in EditDonorModal
export type UpdateDonorPayload = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  notes?: string | null;
  membershipStatus?: DonorDetailsData['membershipStatus'];
  joinDate?: string | null; // ISO string
  preferredLanguage?: string | null;
  // ministryInvolvement and smsConsent fields are not in the current EditDonorModal form, so excluded here
};

export async function updateDonorDetails(
  donorId: string,
  payload: UpdateDonorPayload
): Promise<{ success: boolean; data?: DonorDetailsData; error?: string }> {
  if (!donorId) {
    return { success: false, error: "Donor ID is required." };
  }

  try {
    console.log('[updateDonorDetails] Received payload.joinDate:', payload.joinDate);
    const { joinDate, ...restOfPayload } = payload;
    const dataToUpdate: any = {
      ...restOfPayload,
    };

    if (joinDate) {
      dataToUpdate.joinDate = new Date(joinDate);
      console.log('[updateDonorDetails] Converted joinDate to Date object:', dataToUpdate.joinDate, 'Original ISO string:', joinDate);
    } else if (joinDate === null) {
      dataToUpdate.joinDate = null;
    }
    // If joinDate is undefined, it means it wasn't changed in the form, so we don't update it.

    // Map preferredLanguage from payload to language in Prisma schema
    if (payload.preferredLanguage !== undefined) {
      dataToUpdate.language = payload.preferredLanguage;
      delete dataToUpdate.preferredLanguage; // remove preferredLanguage if it was added to avoid Prisma error
    }


    const updatedMember = await prisma.member.update({
      where: { id: donorId },
      data: dataToUpdate,
    });

    // Revalidate the path to the donor details page or any relevant list
    // Adjust the path as necessary, e.g., if you have a specific page for donors
    revalidatePath('/donors'); // Example path, adjust if needed
    revalidatePath(`/donors/${donorId}`); // Revalidate specific donor page if it exists

    // For consistency, we can call getDonorDetails to return the full, transformed data
    // This ensures the returned data structure matches DonorDetailsData including relations like donations
    const fullUpdatedDonor = await getDonorDetails(donorId);
    if (!fullUpdatedDonor) {
      return { success: false, error: "Failed to retrieve updated donor details after update." };
    }

    return { success: true, data: fullUpdatedDonor };

  } catch (error) {
    console.error("Failed to update donor details:", error);
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Check for Prisma-specific errors if needed, e.g., P2002 for unique constraint violation
    // if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
    //   errorMessage = 'This email address is already in use.';
    // }
    return { success: false, error: errorMessage };
  }
}
