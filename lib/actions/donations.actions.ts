"use server";

import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import type { DonationTransactionFE } from '@/lib/types';
import { Prisma } from '@prisma/client';

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
    donationType: {
      select: {
        name: true;
      };
    };
  };
}>;

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
    console.error('[getDonationTransactions] clerkOrgId is required.');
    return { donations: [], totalCount: 0, error: 'Organization ID is required.' };
  }

  // Ensure pageNumber is at least 1
  const validPageNumber = Math.max(1, page);

  // Find the Church by clerkOrgId to get its UUID
  const church = await prisma.church.findUnique({
    where: { clerkOrgId: clerkOrgId }, // Use the passed clerkOrgId
    select: { id: true },
  });

  if (!church) {
    console.error(`[getDonationTransactions] No church found with clerkOrgId: ${clerkOrgId}`);
    return { donations: [], totalCount: 0, error: 'Church configuration not found.' };
  }

  const churchUuid = church.id; // This is the actual UUID for the church
  console.log(`[getDonationTransactions] Found church UUID: ${churchUuid} for clerkOrgId: ${clerkOrgId}`);

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

    console.log('[getDonationTransactions] Querying DonationTransactions with whereClause (using churchUuid):', JSON.stringify(whereClause, null, 2));
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

    console.log('[getDonationTransactions] Raw transactions from Prisma:', JSON.stringify(transactions, null, 2));
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
    }));

    console.log('[getDonationTransactions] Formatted donations:', JSON.stringify(formattedDonations, null, 2));
    console.log('[getDonationTransactions] Total count:', totalCount);

    return { donations: formattedDonations, totalCount };

  } catch (error) {
    console.error('[getDonationTransactions] Error fetching donation transactions:', error);
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
    console.error('[getDistinctDonorsForFilter] User not authenticated or no organization ID found.');
    return [];
  }

  const church = await prisma.church.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true },
  });

  if (!church) {
    console.error(`[getDistinctDonorsForFilter] No church found with clerkOrgId: ${orgId}`);
    return [];
  }
  const churchUuid = church.id;

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
    console.error('[getDistinctDonorsForFilter] Error fetching donors:', error);
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
  console.log('[createManualDonation] Received params:', params);
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

    // 2. Fetch Donor details to get donorName and donorEmail
    const donor = await prisma.donor.findUnique({
      where: { id: donorId, churchId: actualChurchUuid }, // Ensure donor belongs to the church
      select: { firstName: true, lastName: true, email: true },
    });

    if (!donor) {
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

    return { success: true, donation: formattedDonation };

  } catch (error) {
    console.error("[createManualDonation] Error:", error);
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
