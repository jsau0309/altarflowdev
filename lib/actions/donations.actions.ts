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
  searchTerm?: string; // Search across donor name, email, donation type, amount
  startDate?: Date;
  endDate?: Date;
  donationTypes?: string[];
  donorIds?: string[];
  paymentMethods?: string[]; // Added paymentMethods as it's used in donations-content.tsx
  statuses?: string[]; // Added statuses for filtering by donation status
  // Add other filter params as needed
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
    donorName: true;
    donorEmail: true;
    amount: true;
    currency: true;
    status: true;
    paymentMethodType: true;
    paymentMethodId: true;
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
    // Anonymous/International donor fields
    isAnonymous: true;
    isInternational: true;
    donorCountry: true;
    DonationType: {
      select: {
        name: true;
        isCampaign: true;
      };
    };
    DonationPaymentMethod: {
      select: {
        name: true;
        color: true;
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
  searchTerm,
  startDate,
  endDate,
  donationTypes,
  donorIds,
  paymentMethods,
  statuses,
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
      whereClause.DonationType = {
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

    // Add status filter if provided
    if (statuses && statuses.length > 0) {
      whereClause.status = {
        in: statuses,
      };
    }

    // Build payment method OR conditions (if filtered)
    const paymentMethodConditions: Prisma.DonationTransactionWhereInput[] = [];
    if (paymentMethods && paymentMethods.length > 0) {
      paymentMethodConditions.push(
        {
          paymentMethodType: {
            in: paymentMethods.map(m => m.toLowerCase()),
          },
        },
        {
          DonationPaymentMethod: {
            name: {
              in: paymentMethods,
            },
          },
        }
      );
    }

    // Add search term filter if provided
    if (searchTerm && searchTerm.trim().length > 0) {
      const searchLower = searchTerm.toLowerCase().trim();

      // Check if search term is numeric (for amount search)
      const searchAsNumber = parseFloat(searchTerm);
      const isNumeric = !isNaN(searchAsNumber);

      // Spanish to English mapping for system values
      const spanishToEnglishMap: Record<string, string[]> = {
        // Payment methods (Spanish → English)
        'efectivo': ['Cash'],
        'cheque': ['Check'],
        'tarjeta': ['Card'],
        'transferencia': ['Bank Transfer', 'BankTransfer'],
        'bancaria': ['Bank Transfer', 'BankTransfer'],
        'banco': ['Bank Transfer', 'BankTransfer'],
        'zelle': ['Zelle'],
        // Donation types (Spanish → English system types)
        'diezmo': ['Tithe'],
        'ofrenda': ['Offering'],
        // Status (Spanish → English)
        'completado': ['completed'],
        'pendiente': ['pending'],
        'cancelado': ['canceled', 'cancelled'],
        'fallido': ['failed'],
        'exitoso': ['completed'],
        'éxito': ['completed'],
      };

      // Get English equivalents for Spanish search terms
      const searchTerms = [searchTerm]; // Always include original search term
      for (const [spanish, englishTerms] of Object.entries(spanishToEnglishMap)) {
        if (searchLower.includes(spanish)) {
          searchTerms.push(...englishTerms);
        }
      }

      // Build search conditions - search across: donor name, type, method, amount, status
      const searchConditions: Prisma.DonationTransactionWhereInput[] = [];

      // For each search term (original + English equivalents), add search conditions
      for (const term of searchTerms) {
        searchConditions.push(
          // 1. Search in donor name
          {
            donorName: {
              contains: term,
              mode: 'insensitive',
            },
          },
          // 2. Search in donation type name
          {
            DonationType: {
              name: {
                contains: term,
                mode: 'insensitive',
              },
            },
          },
          // 3. Search in payment method type (legacy Stripe methods)
          {
            paymentMethodType: {
              contains: term,
              mode: 'insensitive',
            },
          },
          // 4. Search in payment method name (custom methods)
          {
            DonationPaymentMethod: {
              name: {
                contains: term,
                mode: 'insensitive',
              },
            },
          },
          // 5. Search in status
          {
            status: {
              contains: term,
              mode: 'insensitive',
            },
          }
        );
      }

      // 6. If search is numeric, also search by amount
      if (isNumeric) {
        searchConditions.push({
          amount: Math.round(searchAsNumber * 100), // Convert to cents
        });
      }

      // 7. Special handling for "General Collection" / "Colecta General"
      // If searching for "colecta" or "general", also match "General Collection"
      if (searchLower.includes('colecta') || searchLower.includes('general')) {
        searchConditions.push({
          donorName: {
            equals: 'General Collection',
          },
        });
      }

      // Combine search and payment method filters properly
      // Both search and payment methods use OR logic
      // If both exist, we need to AND them together
      if (paymentMethodConditions.length > 0) {
        // Both search and payment methods are active
        whereClause.AND = [
          { OR: searchConditions },         // Must match one of the search conditions
          { OR: paymentMethodConditions },  // AND must match one of the payment methods
        ];
      } else {
        // Only search is active
        whereClause.OR = searchConditions;
      }
    } else if (paymentMethodConditions.length > 0) {
      // Only payment methods filter is active (no search)
      whereClause.OR = paymentMethodConditions;
    }

    const transactions: TransactionWithDonationTypeName[] = await prisma.donationTransaction.findMany({
      where: whereClause,
      select: {
        id: true,
        churchId: true,
        donationTypeId: true,
        donorName: true,
        donorEmail: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethodType: true,
        paymentMethodId: true,
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
        // Anonymous/International donor fields
        isAnonymous: true,
        isInternational: true,
        donorCountry: true,
        DonationType: {
          select: {
            name: true,
            isCampaign: true,
          },
        },
        DonationPaymentMethod: {
          select: {
            name: true,
            color: true,
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
      donationTypeName: t.DonationType.name,
      donationTypeIsCampaign: t.DonationType.isCampaign,
      donorName: t.donorName ?? undefined,
      donorEmail: t.donorEmail ?? undefined,
      amount: (t.amount / 100).toFixed(2),
      currency: t.currency,
      status: t.status,
      paymentMethodType: t.paymentMethodType ?? '',
      paymentMethodId: t.paymentMethodId,
      paymentMethod: t.DonationPaymentMethod ? {
        name: t.DonationPaymentMethod.name,
        color: t.DonationPaymentMethod.color,
      } : null,
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
      disputedAt: t.disputedAt?.toISOString() || null,
      // Anonymous/International donor fields
      isAnonymous: t.isAnonymous,
      isInternational: t.isInternational,
      donorCountry: t.donorCountry
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

// Get available donation types for filter (includes Tithe, Offering, and all active Campaigns)
export async function getAvailableDonationTypes(): Promise<string[]> {
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
    const donationTypes = await prisma.donationType.findMany({
      where: {
        churchId: churchUuid,
        isActive: true, // Only show active types
      },
      select: {
        name: true,
      },
      orderBy: [
        { isSystemType: 'desc' }, // System types (Tithe, Offering) first
        { name: 'asc' },
      ],
    });

    return donationTypes.map(dt => dt.name);
  } catch {
    return [];
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

  } catch {
    // Error fetching donors
    return [];
  }
}

// --- Create Manual Donation --- 

export interface CreateManualDonationParams {
  churchId: string;
  amount: number; // In cents
  donationDate: Date;
  donorId?: string | null; // ID of an existing Donor record (optional for general collections)
  donationTypeName: string; // e.g., "Tithe", "Offering" (campaigns included)
  paymentMethod: string; // e.g., "Cash", "Check"
  notes?: string | null;
  isGeneralCollection?: boolean; // True for general collections (no specific donor)
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
    if (!clerkOrgId) {
      return { success: false, error: "Organization ID is required." };
    }

    // For individual donations, donorId is required
    if (!params.isGeneralCollection && !donorId) {
      return { success: false, error: "Donor ID is required for individual donations." };
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

    // 2. Fetch Donor details and validate church access (skip for general collections)
    let donorName: string | null = null;
    let donorEmail: string | null = null;

    if (params.isGeneralCollection) {
      // For general collections, set a standard name
      donorName = "General Collection";
    } else {
      // For individual donations, fetch donor details
      // Accept donors who are EITHER:
      // - Manual donors (churchId matches)
      // - Universal donors (churchId is null) linked to a member of this church
      const donor = await prisma.donor.findFirst({
        where: {
          id: donorId!,
          OR: [
            { churchId: actualChurchUuid }, // Manual donor
            {
              churchId: null, // Universal donor
              Member: {
                // Prisma requires relation filters to use the `is` wrapper for one-to-one relations
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
          Member: {
            select: { churchId: true }
          }
        },
      });

      if (!donor) {
        // Provide specific error messages
        const universalDonor = await prisma.donor.findUnique({
          where: { id: donorId! },
          select: { churchId: true, memberId: true }
        });

        if (universalDonor?.churchId === null && !universalDonor.memberId) {
          return { success: false, error: 'donations:editDonorModal.errors.universalDonorNotLinked' };
        } else if (universalDonor?.churchId === null && universalDonor.memberId) {
          return { success: false, error: 'donations:editDonorModal.errors.universalDonorDifferentChurch' };
        }
        return { success: false, error: `Donor with ID ${donorId} not found for this church.` };
      }
      donorName = `${donor.firstName || ''} ${donor.lastName || ''}`.trim() || null;
      donorEmail = donor.email || null;
    }


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

    // 4. Look up or auto-create the DonationPaymentMethod
    let paymentMethodRecord = await prisma.donationPaymentMethod.findUnique({
      where: {
        churchId_name: {
          churchId: actualChurchUuid,
          name: paymentMethod, // e.g., 'Cash', 'Check'
        },
      },
      select: { id: true },
    });

    // Auto-create payment method if it doesn't exist (for backward compatibility)
    if (!paymentMethodRecord) {
      const defaultColors: Record<string, string> = {
        'Cash': '#10B981',       // Green
        'Check': '#3B82F6',      // Blue
        'Card': '#8B5CF6',       // Purple
        'Bank Transfer': '#F59E0B', // Amber
      };

      paymentMethodRecord = await prisma.donationPaymentMethod.create({
        data: {
          churchId: actualChurchUuid,
          name: paymentMethod,
          color: defaultColors[paymentMethod] || '#6B7280', // Default to gray
          isSystemMethod: ['Cash', 'Check', 'Card', 'Bank Transfer'].includes(paymentMethod),
          isDeletable: true,
        },
        select: { id: true },
      });
    }

    // 5. Create the DonationTransaction
    // Manual donations (cash/check) have no processing fees
    const newTransaction = await prisma.donationTransaction.create({
      data: {
        churchId: actualChurchUuid,
        donationTypeId: donationTypeId,
        donorId: params.isGeneralCollection ? null : (donorId || null), // Null for general collections
        donorName: donorName,
        donorEmail: donorEmail,
        amount: amount, // Assumed to be in cents
        currency: "usd", // Defaulting to USD
        status: "succeeded", // Manual donations are typically considered successful immediately
        paymentMethodId: paymentMethodRecord.id, // NEW: Link to DonationPaymentMethod
        paymentMethodType: paymentMethod.toLowerCase(), // LEGACY: Keep for backward compatibility
        isRecurring: false, // Manual donations are one-time by default
        transactionDate: donationDate,
        processedAt: new Date(), // Mark as processed immediately
        source: "manual", // Crucial field
        isAnonymous: params.isGeneralCollection || false, // Mark general collections as anonymous
        // No fee tracking - will use Stripe Reports API when needed
        // notes: notes, // Temporarily removed
      },
      include: {
        DonationType: {
          select: {
            name: true,
            isCampaign: true,
          },
        },
      },
    });

    // 6. Format the created transaction to DonationTransactionFE
    const formattedDonation: DonationTransactionFE = {
      id: newTransaction.id,
      churchId: newTransaction.churchId,
      donationTypeId: newTransaction.donationTypeId,
      donationTypeName: newTransaction.DonationType.name,
      donationTypeIsCampaign: newTransaction.DonationType.isCampaign,
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
