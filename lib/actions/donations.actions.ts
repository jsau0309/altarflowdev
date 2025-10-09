"use server";

import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import type { DonationTransactionFE } from '@/lib/types';
import { Prisma } from '@prisma/client';
import { revalidateTag } from 'next/cache';

export interface DonorFilterItem {
  id: string; // donorId from DonationTransaction
  name: string; // donorName from DonationTransaction
}

interface GetDonationTransactionsParams {
  clerkOrgId: string; // Renamed from churchId, this is the Clerk Organization ID
  page?: number;
  limit?: number;
  // searchTerm?: string; // Removed
  startDate?: Date;
  endDate?: Date;
  donationTypes?: string[];
  donorIds?: string[];
  paymentMethods?: string[]; // Added paymentMethods as it's used in donations-content.tsx
  // Add other filter params as needed: campaignId, etc.
}

interface GetDonationTransactionsResult {
  donations: DonationTransactionFE[];
  totalCount: number;
  error?: string;
}

// Define the precise type for the transaction objects returned by Prisma
export type TransactionWithDonationTypeName = Prisma.DonationTransactionGetPayload<{
  select: {
    id: true;
    churchId: true;
    donationTypeId: true;
    donorClerkId: true;
    donorName: true;
    donorEmail: true;
    amount: true;
    currency: true;
    status: true;
    paymentMethodType: true;
    stripePaymentIntentId: true;
    stripeSubscriptionId: true;
    transactionDate: true;
    processedAt: true;
    donorId: true;
    idempotencyKey: true;
    source: true; // Added source
    // Refund tracking fields
    refundedAmount: true;
    refundedAt: true;
    // Dispute tracking fields
    disputeStatus: true;
    disputeReason: true;
    disputedAt: true;
    donationType: {
      select: {
        name: true;
      };
    };
  };
}>;

// Simple in-memory cache for church ID lookups
const churchIdCache = new Map<string, { id: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getDonationTransactions({
  clerkOrgId, // Renamed from churchId for clarity, this is the Clerk Organization ID
  page = 1,
  limit = 10,
  startDate,
  endDate,
  donationTypes,
  donorIds,
  paymentMethods,
}: GetDonationTransactionsParams): Promise<GetDonationTransactionsResult> {
  if (!clerkOrgId) {
    return { donations: [], totalCount: 0, error: 'Organization ID is required.' };
  }

  // Ensure pageNumber is at least 1
  const validPageNumber = Math.max(1, page);

  // Check cache first
  const cachedChurch = churchIdCache.get(clerkOrgId);
  let churchUuid: string;
  
  if (cachedChurch && Date.now() - cachedChurch.timestamp < CACHE_DURATION) {
    churchUuid = cachedChurch.id;
  } else {
    // Find the Church by clerkOrgId to get its UUID
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: clerkOrgId },
      select: { id: true },
    });

    if (!church) {
      return { donations: [], totalCount: 0, error: 'Church configuration not found.' };
    }

    churchUuid = church.id;
    // Cache the result
    churchIdCache.set(clerkOrgId, { id: churchUuid, timestamp: Date.now() });
  }

  const skip = (validPageNumber - 1) * limit;

  try {
    const whereClause: Prisma.DonationTransactionWhereInput = {
      churchId: churchUuid, // Use the fetched church UUID
    };



    if (startDate && endDate) {
      whereClause.transactionDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (donationTypes && donationTypes.length > 0) {
      whereClause.donationType = {
        name: {
          in: donationTypes,
        },
      };
    }

    if (donorIds && donorIds.length > 0) {
      whereClause.donorId = {
        in: donorIds,
      };
    }

    // Add paymentMethods filter if provided
    if (paymentMethods && paymentMethods.length > 0) {
      whereClause.paymentMethodType = {
        in: paymentMethods,
      };
    }

    const transactions: TransactionWithDonationTypeName[] = await prisma.donationTransaction.findMany({
      where: whereClause,
      select: {
        id: true,
        churchId: true,
        donationTypeId: true,
        donorClerkId: true,
        donorName: true,
        donorEmail: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethodType: true,
        stripePaymentIntentId: true,
        stripeSubscriptionId: true,
        transactionDate: true,
        processedAt: true,
        donorId: true,
        idempotencyKey: true,
        source: true, // Ensure source is selected in the actual findMany query
        // Refund tracking fields
        refundedAmount: true,
        refundedAt: true,
        // Dispute tracking fields
        disputeStatus: true,
        disputeReason: true,
        disputedAt: true,
        donationType: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        transactionDate: 'desc',
      },
      skip: skip,
      take: limit,
    });

    const totalCount = await prisma.donationTransaction.count({
      where: whereClause,
    });

    const formattedDonations: DonationTransactionFE[] = transactions.map(t => ({
      id: t.id,
      churchId: t.churchId,
      donationTypeId: t.donationTypeId,
      donationTypeName: t.donationType.name,
      donorClerkId: t.donorClerkId,
      donorName: t.donorName ?? undefined,
      donorEmail: t.donorEmail ?? undefined,
      amount: (t.amount / 100).toFixed(2),
      currency: t.currency,
      status: t.status,
      paymentMethodType: t.paymentMethodType ?? '',
      stripePaymentIntentId: t.stripePaymentIntentId,
      stripeSubscriptionId: t.stripeSubscriptionId,
      transactionDate: t.transactionDate.toISOString(), // Already present in select, just mapping
      processedAt: t.processedAt ? t.processedAt.toISOString() : null, // Already present in select, just mapping
      donorId: t.donorId,
      idempotencyKey: t.idempotencyKey,
      source: t.source, // Added source
      // Adding the previously missing date fields for DonationTransactionFE
      donationDate: t.transactionDate.toISOString(), // Using transactionDate as donationDate
      createdAt: t.transactionDate.toISOString(), // Fallback: Prisma schema for DonationTransaction doesn't have its own createdAt/updatedAt, using transactionDate
      updatedAt: t.processedAt?.toISOString() ?? t.transactionDate.toISOString(), // Fallback: Using processedAt or transactionDate
      // Refund tracking fields
      refundedAmount: t.refundedAmount,
      refundedAt: t.refundedAt?.toISOString() || null,
      // Dispute tracking fields
      disputeStatus: t.disputeStatus,
      disputeReason: t.disputeReason,
      disputedAt: t.disputedAt?.toISOString() || null
    }));

    return { donations: formattedDonations, totalCount };

  } catch (error) {
    let errorMessage = 'Failed to fetch donation transactions.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { donations: [], totalCount: 0, error: errorMessage };
  }
}

export async function getDistinctDonorsForFilter(): Promise<DonorFilterItem[]> {
  const { orgId } = await auth();
  if (!orgId) {
    return [];
  }

  // Check cache first
  const cachedChurch = churchIdCache.get(orgId);
  let churchUuid: string;
  
  if (cachedChurch && Date.now() - cachedChurch.timestamp < CACHE_DURATION) {
    churchUuid = cachedChurch.id;
  } else {
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });

    if (!church) {
      return [];
    }
    
    churchUuid = church.id;
    // Cache the result
    churchIdCache.set(orgId, { id: churchUuid, timestamp: Date.now() });
  }

  try {
    const donors = await prisma.donor.findMany({
      where: {
        churchId: churchUuid,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    });

    const donorList: DonorFilterItem[] = donors.map(donor => ({
      id: donor.id,
      name: `${donor.firstName} ${donor.lastName}`.trim(),
    }));

    return donorList;

  } catch (error) {
    // Error fetching donors
    return [];
  }
}

// --- Create Manual Donation --- 

export interface CreateManualDonationParams {
  churchId: string;
  amount: number; // In cents
  donationDate: Date;
  donorId: string; // ID of an existing Donor record
  donationTypeName: string; // e.g., "Tithe", "Offering"
  paymentMethod: string; // e.g., "Cash", "Check"
  notes?: string | null;
}

export interface CreateManualDonationResult {
  success: boolean;
  donation?: DonationTransactionFE; 
  error?: string;
}

export async function createManualDonation(
  params: CreateManualDonationParams
): Promise<CreateManualDonationResult> {
  // Manual donation creation
  const {
    churchId,
    amount,
    donationDate,
    donorId,
    donationTypeName,
    paymentMethod,
    // notes, // Temporarily removed
  } = params;
  // const notes = params.notes; // Temporarily removed as 'notes' is not in CreateManualDonationParams

  try {
    const clerkOrgId = churchId; // churchId from params is actually clerkOrgId

    // 1. Validate clerkOrgId and donorId (basic check)
    if (!clerkOrgId || !donorId) {
      return { success: false, error: "Organization ID and Donor ID are required." };
    }

    // Fetch the actual church UUID from the Church table using clerkOrgId
    const churchRecord = await prisma.church.findUnique({
      where: { clerkOrgId: clerkOrgId },
      select: { id: true },
    });

    if (!churchRecord) {
      return { success: false, error: `Church with Organization ID ${clerkOrgId} not found.` };
    }
    const actualChurchUuid = churchRecord.id;

    // 2. Fetch Donor details and validate church access
    // Accept donors who are EITHER:
    // - Manual donors (churchId matches)
    // - Universal donors (churchId is null) linked to a member of this church
    const donor = await prisma.donor.findFirst({
      where: {
        id: donorId,
        OR: [
          { churchId: actualChurchUuid }, // Manual donor
          {
            churchId: null, // Universal donor
            member: {
              is: {
                churchId: actualChurchUuid, // Linked to a member of this church
              },
            },
          }
        ]
      },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        churchId: true,
        member: {
          select: { churchId: true }
        }
      },
    });

    if (!donor) {
      // Provide specific error messages
      const universalDonor = await prisma.donor.findUnique({
        where: { id: donorId },
        select: { churchId: true, memberId: true }
      });

      if (universalDonor?.churchId === null && !universalDonor.memberId) {
        return { success: false, error: 'donations:editDonorModal.errors.universalDonorNotLinked' };
      } else if (universalDonor?.churchId === null && universalDonor.memberId) {
        return { success: false, error: 'donations:editDonorModal.errors.universalDonorDifferentChurch' };
      }
      return { success: false, error: `Donor with ID ${donorId} not found for this church.` };
    }
    const donorName = `${donor.firstName || ''} ${donor.lastName || ''}`.trim() || null;
    const donorEmail = donor.email || null;


    // 3. Find DonationType ID based on actualChurchUuid and donationTypeName
    const donationTypeRecord = await prisma.donationType.findUnique({
      where: {
        churchId_name: { // Using the @@unique([churchId, name])
          churchId: actualChurchUuid,
          name: donationTypeName,
        },
      },
      select: { id: true },
    });

    if (!donationTypeRecord) {
      return { success: false, error: `Donation type "${donationTypeName}" not found for this church.` };
    }
    const donationTypeId = donationTypeRecord.id;

    // 4. Create the DonationTransaction
    // Manual donations (cash/check) have no processing fees
    const newTransaction = await prisma.donationTransaction.create({
      data: {
        churchId: actualChurchUuid,
        donationTypeId: donationTypeId,
        donorId: donorId,
        donorName: donorName,
        donorEmail: donorEmail,
        amount: amount, // Assumed to be in cents
        currency: "usd", // Defaulting to USD
        status: "succeeded", // Manual donations are typically considered successful immediately
        paymentMethodType: paymentMethod.toLowerCase(), // e.g., 'cash', 'check'
        isRecurring: false, // Manual donations are one-time by default
        transactionDate: donationDate,
        processedAt: new Date(), // Mark as processed immediately
        source: "manual", // Crucial field
        // No fee tracking - will use Stripe Reports API when needed
        // notes: notes, // Temporarily removed
      },
      select: {
        id: true,
        churchId: true,
        donationTypeId: true,
        donorClerkId: true,
        donorName: true,
        donorEmail: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethodType: true,
        stripePaymentIntentId: true,
        stripeSubscriptionId: true,
        transactionDate: true,
        processedAt: true,
        donorId: true,
        idempotencyKey: true,
        // notes: true, // Temporarily removed
        source: true,
        donationType: {
          select: {
            name: true,
          },
        },
      },
    });

    // 5. Format the created transaction to DonationTransactionFE
    const formattedDonation: DonationTransactionFE = {
      id: newTransaction.id,
      churchId: newTransaction.churchId,
      donationTypeId: newTransaction.donationTypeId,
      donationTypeName: newTransaction.donationType.name,
      donorClerkId: newTransaction.donorClerkId,
      donorName: newTransaction.donorName ?? undefined,
      donorEmail: newTransaction.donorEmail ?? undefined,
      amount: (newTransaction.amount / 100).toFixed(2),
      currency: newTransaction.currency,
      status: newTransaction.status,
      paymentMethodType: newTransaction.paymentMethodType ?? '',
      stripePaymentIntentId: newTransaction.stripePaymentIntentId,
      stripeSubscriptionId: newTransaction.stripeSubscriptionId,
      transactionDate: newTransaction.transactionDate.toISOString(),
      processedAt: newTransaction.processedAt ? newTransaction.processedAt.toISOString() : null,
      donorId: newTransaction.donorId,
      idempotencyKey: newTransaction.idempotencyKey,
      // notes: newTransaction.notes ?? undefined, // Temporarily removed
      source: newTransaction.source,
      donationDate: newTransaction.transactionDate.toISOString(), 
      createdAt: newTransaction.transactionDate.toISOString(), 
      updatedAt: newTransaction.processedAt?.toISOString() ?? newTransaction.transactionDate.toISOString(),
    };

    // Invalidate dashboard cache after creating donation
    console.log(`[ACTION] Manual donation created successfully. Invalidating cache for org: ${clerkOrgId}`);
    revalidateTag(`dashboard-${clerkOrgId}`);

    return { success: true, donation: formattedDonation };

  } catch (error) {
    // Error creating manual donation
    let errorMessage = "Failed to create manual donation.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        errorMessage = `A record with these details already exists. (Fields: ${error.meta?.target})`
      }
    }
    return { success: false, error: errorMessage };
  }
}
