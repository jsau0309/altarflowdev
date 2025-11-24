"use server"

import { prisma } from '@/lib/db';
import { unstable_noStore as noStore, revalidatePath } from 'next/cache';
import type { Prisma, Member as PrismaMember } from '@prisma/client';
import { DonorDetailsData, DonorFE } from '@/lib/types'; // Removed Member type as createDonor will now return Donor
import { Donor } from '@prisma/client';
import { DonorFilterItem } from './donations.actions';
import { authorizeChurchAccess } from '@/lib/auth/authorize-church-access';
import { logger } from '@/lib/logger';

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
  currentChurchId?: string; // Add the current church ID for context
  error?: string;
};

export async function getDonors(params: { page?: number; limit?: number; query?: string; sortOrder?: 'asc' | 'desc' }): Promise<DonorsApiResponse> {
  noStore();
  const { page = 1, limit = 10, query, sortOrder = 'asc' } = params;
  const skip = (page - 1) * limit;

  const { orgId } = await auth();
  if (!orgId) {
    return {
      error: 'User is not associated with a church.',
      donors: [],
      totalDonors: 0,
      totalPages: 0,
      currentPage: 1,
      currentChurchId: undefined,
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
        currentChurchId: undefined,
      };
    }

    // Get donors who have made donations to this specific church
    const donorIdsFromTransactions = await prisma.donationTransaction.findMany({
      where: {
        churchId: church.id,
      },
      select: {
        donorId: true,
      },
      distinct: ['donorId'],
    });

    const transactionDonorIds = donorIdsFromTransactions.map(d => d.donorId).filter(id => id !== null) as string[];

    // Build where clause to include:
    // 1. Manual donors (churchId = current church)
    // 2. Universal donors who have donated to this church
    let whereClause: Prisma.DonorWhereInput = {
      OR: [
        { churchId: church.id }, // Manual donors for this church
        { id: { in: transactionDonorIds } } // Universal donors who donated to this church
      ]
    };

    if (query) {
      // Combine the donor filtering with search query
      whereClause = {
        AND: [
          {
            OR: [
              { churchId: church.id },
              { id: { in: transactionDonorIds } }
            ]
          },
          {
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ]
          }
        ]
      };
    }

    const donorsFromPrisma = await prisma.donor.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: [
        { firstName: sortOrder },
        { lastName: sortOrder },
      ],
      include: {
        Member: {
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
        memberId: donor.Member?.id || null,
        linkedMemberName: donor.Member ? `${donor.Member.firstName || ''} ${donor.Member.lastName || ''}`.trim() : null,
        churchId: donor.churchId || null, // Use donor's own churchId, not from linked member
        linkedMemberChurchId: donor.Member?.churchId || null, // Add the church ID of the linked member
    }));

    return {
      donors,
      totalDonors,
      totalPages: Math.ceil(totalDonors / limit),
      currentPage: page,
      currentChurchId: church.id, // Include the current church ID
    };
  } catch (error) {
    logger.error('Failed to fetch donors', { operation: 'donors.fetch.error' }, error instanceof Error ? error : new Error(String(error)));
    return {
      error: 'Failed to fetch donors.',
      donors: [],
      totalDonors: 0,
      totalPages: 0,
      currentPage: 1,
      currentChurchId: undefined,
    };
  }
}

export async function getDonorDetails(donorId: string, churchId?: string): Promise<DonorDetailsData | null> {
  if (!donorId) {
    logger.error('donorId is required.', { operation: 'donors.get_details.error' });
    return null;
  }

  // Authorization check - verify user has access to this church
  // Get churchId from auth if not provided, then verify authorization
  let effectiveChurchId: string;

  if (churchId) {
    // If churchId is provided, verify user has access to it
    const authResult = await authorizeChurchAccess(churchId);
    if (!authResult.success) {
      logger.error('Authorization failed', { operation: 'donors.get_details.auth_error', error: authResult.error });
      return null;
    }
    effectiveChurchId = authResult.churchId!;
  } else {
    // Get churchId from current user's organization
    const { orgId } = await auth();
    if (!orgId) {
      logger.error('No orgId found in auth', { operation: 'donors.get_details.no_org' });
      return null;
    }

    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });

    if (!church) {
      logger.error('Church not found for orgId', { operation: 'donors.get_details.no_church', orgId });
      return null;
    }

    effectiveChurchId = church.id;
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
        DonationTransaction: {
          where: {
            ...(effectiveChurchId ? { churchId: effectiveChurchId } : {}),
            status: 'succeeded'  // Only fetch successful donations
          },
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,  // Include status to filter out pending donations
            transactionDate: true,
            donorName: true,
            donorEmail: true,
            donorId: true,
            donationTypeId: true,
            stripePaymentIntentId: true,
            processedAt: true,
            churchId: true,  // Include churchId in selection
            // Only select fields directly on DonationTransaction or needed for mapping
            DonationType: {
              select: {
                id: true,
                name: true,
                description: true,
                isRecurringAllowed: true,
                isCampaign: true,
                goalAmount: true,
                startDate: true,
                endDate: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
              }
            },
          },
          orderBy: {
            transactionDate: 'desc',
          },
        },
        Member: { // Include linked member details
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

    const { DonationTransaction: transactions, Member: member, ...donorDetails} = donorDataFromPrisma;

    // Define a type for the selected transaction structure for clarity
    type SelectedTransaction = Prisma.DonationTransactionGetPayload<{
      select: {
        id: true;
        amount: true;
        currency: true;
        status: true;
        transactionDate: true;
        donorName: true;
        donorEmail: true;
        donorId: true; 
        donationTypeId: true;
        stripePaymentIntentId: true;
        processedAt: true;
        DonationType: {
          select: {
            id: true;
            name: true;
            description: true;
            isRecurringAllowed: true;
            isCampaign: true;
            goalAmount: true;
            startDate: true;
            endDate: true;
            isActive: true;
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
      donations: transactions.map((tx: SelectedTransaction) => {
        // Extract donor name from transaction or fall back to donor details
        // Use a more robust approach than simple space splitting
        let txFirstName: string | null = null;
        let txLastName: string | null = null;

        if (tx.donorName) {
          const nameParts = tx.donorName.trim().split(/\s+/); // Split on any whitespace
          if (nameParts.length === 1) {
            // Single name - treat as first name
            txFirstName = nameParts[0];
          } else if (nameParts.length >= 2) {
            // Multiple parts - first is firstName, rest is lastName
            txFirstName = nameParts[0];
            txLastName = nameParts.slice(1).join(' ');
          }
        }

        return {
          id: tx.id,
          amount: (tx.amount / 100).toFixed(2),
          currency: tx.currency,
          status: tx.status,  // Include status field
          donationDate: tx.transactionDate.toISOString(),
          donorFirstName: txFirstName ?? donorDetails.firstName ?? null,
          donorLastName: txLastName ?? donorDetails.lastName ?? null,
          donorEmail: tx.donorEmail ?? donorDetails.email ?? null,
          memberId: tx.donorId, // Link transaction to a Donor record via donorId
          donationTypeId: tx.donationTypeId,
          stripePaymentIntentId: tx.stripePaymentIntentId,
          createdAt: tx.transactionDate.toISOString(),
          updatedAt: tx.processedAt?.toISOString() ?? tx.transactionDate.toISOString(),
          donationType: tx.DonationType
            ? {
                id: tx.DonationType.id,
                name: tx.DonationType.name,
                description: tx.DonationType.description,
                isCampaign: tx.DonationType.isCampaign,
                isActive: tx.DonationType.isActive,
                goalAmount: tx.DonationType.goalAmount ? tx.DonationType.goalAmount.toString() : null,
                startDate: tx.DonationType.startDate?.toISOString() ?? null,
                endDate: tx.DonationType.endDate?.toISOString() ?? null,
                createdAt: tx.DonationType.createdAt.toISOString(),
                updatedAt: tx.DonationType.updatedAt.toISOString(),
              }
            : null,
        };
      }),
    };
  } catch (error) {
    logger.error('Failed to fetch donor details', { operation: 'donors.fetch_details.error' }, error instanceof Error ? error : new Error(String(error)));
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
      logger.warn('Donor with same name already exists in church', { operation: 'donors.create.duplicate_name_warning', firstName: payload.firstName, lastName: payload.lastName });
      // In the future, you might want to return a warning flag with the success response
    }

    // Extract memberId from payload and handle it separately
    const { memberId, ...donorData } = payload;
    
    const newDonor = await prisma.donor.create({
      data: {
        ...donorData,
        churchId: church.id, // Associate donor with the church
        memberId: memberId || undefined, // Link to member if provided
        updatedAt: new Date(),
      },
    });

    // Fetch the created donor with member details to get the linked member name
    const donorWithMember = await prisma.donor.findUnique({
      where: { id: newDonor.id },
      include: {
        Member: {
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
      memberId: donorWithMember?.Member?.id || null,
      linkedMemberName: donorWithMember?.Member ? `${donorWithMember.Member.firstName} ${donorWithMember.Member.lastName}`.trim() : null,
      churchId: newDonor.churchId,
    };

    revalidatePath('/donations'); // Assuming donors are displayed under donations path

    return { success: true, data: donorFE };
  } catch (error: any) {
    logger.error('Failed to create donor', { operation: 'donors.create.error' }, error instanceof Error ? error : new Error(String(error)));
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

// Get all donors available for manual donation selection
// Returns: Manual donors for this church + Universal donors who have donated to this church
export async function getAllDonorsForManualDonation(): Promise<DonorFilterItem[]> {
  noStore();
  
  const { orgId } = await auth();
  if (!orgId) {
    logger.error('No organization ID found for manual donation donors', { operation: 'donors.manual_donation.no_org' });
    return [];
  }

  try {
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true }
    });

    if (!church) {
      logger.error('Church not found for manual donation donors', { operation: 'donors.manual_donation.no_church' });
      return [];
    }

    // Get donor IDs from transactions for this church
    const donorIdsFromTransactions = await prisma.donationTransaction.findMany({
      where: {
        churchId: church.id,
      },
      select: {
        donorId: true,
      },
      distinct: ['donorId'],
    });

    const transactionDonorIds = donorIdsFromTransactions
      .map(d => d.donorId)
      .filter(id => id !== null) as string[];

    // Fetch all donors that are either:
    // 1. Manual donors for this church (churchId = church.id)
    // 2. Universal donors who have donated to this church
    const donors = await prisma.donor.findMany({
      where: {
        OR: [
          { churchId: church.id }, // Manual donors
          { id: { in: transactionDonorIds } } // Universal donors with donations
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ],
    });

    return donors.map(donor => ({
      id: donor.id,
      name: `${donor.firstName || ''} ${donor.lastName || ''}`.trim() || donor.email || 'Unknown Donor',
    }));
  } catch (error) {
    logger.error('Failed to fetch donors for manual donation', { operation: 'donors.manual_donation.error' }, error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function updateDonorDetails(
  donorId: string,
  payload: UpdateDonorPayload
): Promise<DonorDetailsData | null> {
  if (!donorId) {
    logger.error('Donor ID is required', { operation: 'donors.update_details.no_id' });
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
        dataToUpdate.Member = { disconnect: true };
      } else {
        dataToUpdate.Member = { connect: { id: payload.memberId } };
      }
    }
    
    // Prevent update if no actual data fields (excluding memberId if it was undefined) were provided
    const { memberId, ...otherPayloadFields } = payload; // memberId is destructured here for the check below
    if (Object.keys(otherPayloadFields).length === 0 && payload.memberId === undefined) {
      // If only memberId was in payload and it was undefined, or payload was empty.
      // Fetch current donor data to return, as no update was performed.
      logger.debug('No fields to update for donor, fetching current details', { operation: 'donors.update_details.no_changes', donorId });
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
    logger.error('Failed to update donor details', { operation: 'donors.update_details.error' }, error instanceof Error ? error : new Error(String(error)));
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
