"use server"

import { prisma } from '@/lib/db';
import { unstable_noStore as noStore, revalidatePath } from 'next/cache';
import type { Prisma, Donation as PrismaDonation, Campaign as PrismaCampaign, Member as PrismaMember } from '@prisma/client';
import { DonorDetailsData, DonorFE } from '@/lib/types'; // Removed Member type as createDonor will now return Donor
import { Donor } from '@prisma/client';

// Define the payload for creating a new donor
export type CreateDonorPayload = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  memberId?: string | null;
};
import { auth } from '@clerk/nextjs/server';

export type DonorsApiResponse = {
  donors: DonorFE[];
  totalDonors: number;
  totalPages: number;
  currentPage: number;
  error?: string;
};

export async function getDonors(params: { page?: number; limit?: number; query?: string }): Promise<DonorsApiResponse> {
  noStore();
  const { page = 1, limit = 10, query } = params;
  const skip = (page - 1) * limit;

  const { orgId } = await auth();
  if (!orgId) {
    return {
      error: 'User is not associated with a church.',
      donors: [],
      totalDonors: 0,
      totalPages: 0,
      currentPage: 1,
    };
  }

  try {
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });

    if (!church) {
      return {
        error: 'Church not found for the user.',
        donors: [],
        totalDonors: 0,
        totalPages: 0,
        currentPage: 1,
      };
    }

    // Get donors who have made donations to this specific church
    // This ensures each church only sees donors who have donated to them
    const donorIdsForChurch = await prisma.donationTransaction.findMany({
      where: {
        churchId: church.id,
      },
      select: {
        donorId: true,
      },
      distinct: ['donorId'],
    });

    const donorIds = donorIdsForChurch.map(d => d.donorId).filter(id => id !== null) as string[];

    const whereClause: Prisma.DonorWhereInput = {
      id: { in: donorIds },
    };

    if (query) {
      whereClause.AND = {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ]
      };
    }

    const donorsFromPrisma = await prisma.donor.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            churchId: true,
          }
        }
      }
    });

    const totalDonors = await prisma.donor.count({ where: whereClause });

    const donors: DonorFE[] = donorsFromPrisma.map(donor => ({
        id: donor.id,
        firstName: donor.firstName,
        lastName: donor.lastName,
        email: donor.email,
        phone: donor.phone,
        address: [donor.addressLine1, donor.addressLine2].filter(Boolean).join(', '),
        city: donor.city,
        state: donor.state,
        zipCode: donor.postalCode,
        createdAt: donor.createdAt.toISOString(),
        updatedAt: donor.updatedAt.toISOString(),
        memberId: donor.member?.id || null,
        linkedMemberName: donor.member ? `${donor.member.firstName || ''} ${donor.member.lastName || ''}`.trim() : null,
        churchId: donor.member?.churchId || null,
    }));

    return {
      donors,
      totalDonors,
      totalPages: Math.ceil(totalDonors / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error('Failed to fetch donors:', error);
    return {
      error: 'Failed to fetch donors.',
      donors: [],
      totalDonors: 0,
      totalPages: 0,
      currentPage: 1,
    };
  }
}

export async function getDonorDetails(donorId: string, churchId?: string): Promise<DonorDetailsData | null> {
  if (!donorId) {
    console.error("[getDonorDetails] Error: donorId is required.");
    return null;
  }

  // Get churchId from auth if not provided
  let effectiveChurchId = churchId;
  if (!effectiveChurchId) {
    const { orgId } = await auth();
    if (orgId) {
      const church = await prisma.church.findUnique({
        where: { clerkOrgId: orgId },
        select: { id: true },
      });
      effectiveChurchId = church?.id;
    }
  }

  try {
    const donorDataFromPrisma = await prisma.donor.findUnique({
      where: { id: donorId },
      select: {
        id: true,
        // churchId does not exist directly on Donor model
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        isPhoneVerified: true,
        createdAt: true,
        updatedAt: true,
        transactions: {
          where: effectiveChurchId ? {
            churchId: effectiveChurchId  // Filter transactions by church
          } : undefined,
          select: {
            id: true,
            amount: true,
            currency: true,
            transactionDate: true,
            donorName: true,
            donorEmail: true,
            donorId: true,
            donationTypeId: true,
            stripePaymentIntentId: true,
            processedAt: true,
            churchId: true,  // Include churchId in selection
            // Only select fields directly on DonationTransaction or needed for mapping
            donationType: { // This is the campaign
              select: {
                id: true,
                name: true,
                description: true,
                isRecurringAllowed: true,
                createdAt: true,
                updatedAt: true,
              }
            },
          },
          orderBy: {
            transactionDate: 'desc',
          },
        },
        member: { // Include linked member details
          select: {
            id: true,
            firstName: true,
            lastName: true,
            churchId: true, // Fetch churchId from the linked Member
          }
        },
      },
    });

    if (!donorDataFromPrisma) {
      return null;
    }

    const { transactions, member, ...donorDetails } = donorDataFromPrisma;

    // Define a type for the selected transaction structure for clarity
    type SelectedTransaction = Prisma.DonationTransactionGetPayload<{
      select: {
        id: true;
        amount: true;
        currency: true;
        transactionDate: true;
        donorName: true;
        donorEmail: true;
        donorId: true; 
        donationTypeId: true;
        stripePaymentIntentId: true;
        processedAt: true;
        donationType: { 
          select: {
            id: true;
            name: true;
            description: true;
            isRecurringAllowed: true; 
            createdAt: true;
            updatedAt: true;
          }
        };
      }
    }>;

    return {
      id: donorDetails.id,
      churchId: member?.churchId || null, // Derive churchId from linked member
      firstName: donorDetails.firstName ?? '',
      lastName: donorDetails.lastName ?? '',
      email: donorDetails.email,
      phone: donorDetails.phone,
      address: [donorDetails.addressLine1, donorDetails.addressLine2].filter(Boolean).join(', '),
      city: donorDetails.city,
      state: donorDetails.state,
      zipCode: donorDetails.postalCode,
      // Member-specific fields - providing defaults
      membershipStatus: 'Visitor', // Default, will be overridden by actual member data if linked
      joinDate: null, // Default
      ministryInvolvement: null, // Default
      smsConsent: donorDetails.isPhoneVerified,
      smsConsentDate: null, // Default
      smsConsentMethod: null, // Default
      preferredLanguage: 'en', // Default
      notes: null, // Default, Donor model does not have notes
      createdAt: donorDetails.createdAt.toISOString(),
      updatedAt: donorDetails.updatedAt.toISOString(),
      memberId: member?.id || null,
      linkedMemberName: member ? `${member.firstName} ${member.lastName}`.trim() : null,
      donations: transactions.map((tx: SelectedTransaction) => ({
        id: tx.id,
        amount: (tx.amount / 100).toFixed(2),
        currency: tx.currency,
        donationDate: tx.transactionDate.toISOString(),
        donorFirstName: tx.donorName?.split(' ')[0] ?? donorDetails.firstName ?? null,
        donorLastName: tx.donorName?.split(' ').slice(1).join(' ') ?? donorDetails.lastName ?? null,
        donorEmail: tx.donorEmail ?? donorDetails.email ?? null,
        memberId: tx.donorId, // Link transaction to a Donor record via donorId
        campaignId: tx.donationTypeId,
        stripePaymentIntentId: tx.stripePaymentIntentId,
        createdAt: tx.transactionDate.toISOString(),
        updatedAt: tx.processedAt?.toISOString() ?? tx.transactionDate.toISOString(),
        campaign: tx.donationType ? {
          id: tx.donationType.id,
          name: tx.donationType.name,
          description: tx.donationType.description,
          goalAmount: null, // Not available on DonationType model
          startDate: null,  // Not available on DonationType model
          endDate: null,    // Not available on DonationType model
          createdAt: tx.donationType.createdAt.toISOString(),
          updatedAt: tx.donationType.updatedAt.toISOString(),
        } : null,
      })),
    };
  } catch (error) {
    console.error("Failed to fetch donor details:", error);
    return null;
  }
}

export async function createDonor(
  payload: CreateDonorPayload
): Promise<{ success: boolean; data?: DonorFE; error?: string }> {
  const { orgId } = await auth();
  if (!orgId) {
    return { success: false, error: "User is not associated with a church." };
  }

  try {
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true }
    });

    if (!church) {
      return { success: false, error: "Church not found for the user." };
    }
    
    // Only check for duplicates if email or phone are provided
    if (payload.email || payload.phone) {
      const orConditions: Prisma.DonorWhereInput[] = [];
      
      // Only add email condition if email is provided and not empty
      if (payload.email && payload.email.trim() !== '') {
        orConditions.push({ 
          email: payload.email, 
          churchId: church.id 
        });
      }
      
      // Only add phone condition if phone is provided and not empty
      if (payload.phone && payload.phone.trim() !== '') {
        orConditions.push({ 
          phone: payload.phone, 
          churchId: church.id 
        });
      }

      if (orConditions.length > 0) {
        const existingDonor = await prisma.donor.findFirst({
          where: {
            OR: orConditions,
          },
        });

        if (existingDonor) {
          // Provide more specific error message
          if (payload.email && existingDonor.email === payload.email) {
            return { success: false, error: 'A donor with this email address already exists in this church.' };
          } else if (payload.phone && existingDonor.phone === payload.phone) {
            return { success: false, error: 'A donor with this phone number already exists in this church.' };
          }
        }
      }
    }
    
    // Check for exact name match (non-blocking - just for logging/future warning system)
    const nameMatch = await prisma.donor.findFirst({
      where: {
        churchId: church.id,
        firstName: payload.firstName,
        lastName: payload.lastName,
      },
    });
    
    if (nameMatch) {
      console.log(`Warning: A donor with the name ${payload.firstName} ${payload.lastName} already exists in this church.`);
      // In the future, you might want to return a warning flag with the success response
    }

    // Extract memberId from payload and handle it separately
    const { memberId, ...donorData } = payload;
    
    const newDonor = await prisma.donor.create({
      data: {
        ...donorData,
        churchId: church.id, // Associate donor with the church
        memberId: memberId || undefined, // Link to member if provided
      },
    });

    // Fetch the created donor with member details to get the linked member name
    const donorWithMember = await prisma.donor.findUnique({
      where: { id: newDonor.id },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });
    
    const donorFE: DonorFE = {
      id: newDonor.id,
      firstName: newDonor.firstName,
      lastName: newDonor.lastName,
      email: newDonor.email,
      phone: newDonor.phone,
      address: [newDonor.addressLine1, newDonor.addressLine2].filter(Boolean).join(', '),
      city: newDonor.city,
      state: newDonor.state,
      zipCode: newDonor.postalCode,
      createdAt: newDonor.createdAt.toISOString(),
      updatedAt: newDonor.updatedAt.toISOString(),
      memberId: donorWithMember?.member?.id || null,
      linkedMemberName: donorWithMember?.member ? `${donorWithMember.member.firstName} ${donorWithMember.member.lastName}`.trim() : null,
      churchId: newDonor.churchId,
    };

    revalidatePath('/donations'); // Assuming donors are displayed under donations path

    return { success: true, data: donorFE };
  } catch (error: any) {
    console.error("Failed to create donor:", error);
    let errorMessage = "An unknown error occurred while creating the donor.";
    if (error.code === 'P2002' && error.meta?.target) {
      const target = error.meta.target as string[];
      if (target.includes('email')) {
        errorMessage = 'A donor with this email address already exists.';
      } else if (target.includes('phone')) {
        errorMessage = 'A donor with this phone number already exists.';
      } else {
        errorMessage = 'A donor with this information already exists (e.g., email or phone).';
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

export type UpdateDonorPayload = {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;      // Maps to Donor.addressLine1
  // addressLine2?: string | null; // Not in current UI, but Donor model has it
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;     // Maps to Donor.postalCode
  country?: string | null;
  
  memberId?: string | null;   // For linking/unlinking a Member record
  // notes field from UI is not currently on Donor model. Add to schema if needed.
};

export async function updateDonorDetails(
  donorId: string,
  payload: UpdateDonorPayload
): Promise<DonorDetailsData | null> {
  if (!donorId) {
    console.error("[updateDonorDetails] Donor ID is required.");
    return null;
  }

  try {
    const dataToUpdate: Prisma.DonorUpdateInput = {};

    // Map payload fields to Donor model fields
    if (payload.firstName !== undefined) dataToUpdate.firstName = payload.firstName;
    if (payload.lastName !== undefined) dataToUpdate.lastName = payload.lastName;
    if (payload.email !== undefined) dataToUpdate.email = payload.email; 
    if (payload.phone !== undefined) dataToUpdate.phone = payload.phone; 
    if (payload.address !== undefined) dataToUpdate.addressLine1 = payload.address;
    if (payload.city !== undefined) dataToUpdate.city = payload.city;
    if (payload.state !== undefined) dataToUpdate.state = payload.state;
    if (payload.zipCode !== undefined) dataToUpdate.postalCode = payload.zipCode;
    if (payload.country !== undefined) dataToUpdate.country = payload.country;

    // Handle memberId linking/unlinking
    if (payload.memberId !== undefined) {
      if (payload.memberId === null) {
        dataToUpdate.member = { disconnect: true };
      } else {
        dataToUpdate.member = { connect: { id: payload.memberId } };
      }
    }
    
    // Prevent update if no actual data fields (excluding memberId if it was undefined) were provided
    const { memberId, ...otherPayloadFields } = payload; // memberId is destructured here for the check below
    if (Object.keys(otherPayloadFields).length === 0 && payload.memberId === undefined) {
      // If only memberId was in payload and it was undefined, or payload was empty.
      // Fetch current donor data to return, as no update was performed.
      console.log(`[updateDonorDetails] No fields to update for donor ${donorId} other than potentially memberId, or payload was empty. Fetching current details.`);
      return getDonorDetails(donorId, undefined); // Will use auth to get churchId
    }

    const updatedDonor = await prisma.donor.update({
      where: { id: donorId },
      data: dataToUpdate,
    });

    revalidatePath('/donors'); 
    revalidatePath(`/donors/${donorId}`); 

    return getDonorDetails(updatedDonor.id, undefined); // Will use auth to get churchId

  } catch (error: any) {
    console.error("Failed to update donor details:", error);
    let errorMessage = "An unknown error occurred while updating donor.";
    if (error.code === 'P2002' && error.meta?.target) { // Prisma unique constraint violation
        const target = error.meta.target as string[];
        if (target?.includes('email')) {
            errorMessage = 'A donor with this email address already exists.';
        } else if (target?.includes('phone')) {
            errorMessage = 'A donor with this phone number already exists.';
        } else {
            errorMessage = `This update violates a unique constraint on field(s): ${target.join(', ')}.`;
        }
    } else if (error.code === 'P2025') { // Record to update not found
        errorMessage = error.message || `Donor with ID ${donorId} not found.`;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    return null;
  }
}
