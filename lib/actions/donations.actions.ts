"use server";

import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import type { DonationTransactionFE } from '@/lib/types';
import { Prisma } from '@prisma/client';

interface GetDonationTransactionsParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  // Add other filter params as needed: dateRange, campaignId, paymentMethods, etc.
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
    donationType: {
      select: {
        name: true;
      };
    };
  };
}>;

export async function getDonationTransactions({
  page = 1,
  limit = 10,
  searchTerm,
}: GetDonationTransactionsParams): Promise<GetDonationTransactionsResult> {
  const { orgId } = await auth();
  if (!orgId) {
    return { donations: [], totalCount: 0, error: 'User not authenticated or no organization ID found.' };
  }

  // Find the Church by clerkOrgId to get its UUID
  const church = await prisma.church.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true },
  });

  if (!church) {
    console.error(`[getDonationTransactions] No church found with clerkOrgId: ${orgId}`);
    return { donations: [], totalCount: 0, error: 'Church configuration not found.' };
  }

  const churchUuid = church.id;
  console.log(`[getDonationTransactions] Found church UUID: ${churchUuid} for clerkOrgId: ${orgId}`);

  const skip = (page - 1) * limit;

  try {
    const whereClause: Prisma.DonationTransactionWhereInput = {
      churchId: churchUuid, // Use the fetched church UUID
    };

    if (searchTerm) {
      whereClause.OR = [
        { donorName: { contains: searchTerm, mode: 'insensitive' } },
        { donorEmail: { contains: searchTerm, mode: 'insensitive' } },
      ];
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
      donorName: t.donorName,
      donorEmail: t.donorEmail,
      amount: t.amount / 100, // Convert cents to dollars
      currency: t.currency,
      status: t.status,
      paymentMethodType: t.paymentMethodType,
      stripePaymentIntentId: t.stripePaymentIntentId,
      stripeSubscriptionId: t.stripeSubscriptionId,
      transactionDate: t.transactionDate.toISOString(),
      processedAt: t.processedAt ? t.processedAt.toISOString() : null,
      donorId: t.donorId,
      idempotencyKey: t.idempotencyKey,
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
