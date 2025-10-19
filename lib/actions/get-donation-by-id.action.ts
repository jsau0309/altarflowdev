"use server"

import { prisma } from '@/lib/db';
import { auth } from "@clerk/nextjs/server";
import type { DonationTransactionFE } from "@/lib/types";

export interface DonationWithEditHistory extends DonationTransactionFE {
  editReason?: string | null;
  lastEditedBy?: string | null;
  lastEditedAt?: string | null;
  editHistory?: any;
  // Include refund and dispute fields from base type
}

export async function getDonationById(donationId: string): Promise<DonationWithEditHistory | null> {
  const { orgId } = await auth();
  
  if (!orgId || !donationId) {
    return null;
  }

  try {
    // Get church by clerk org ID
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });

    if (!church) {
      return null;
    }

    // Fetch the specific donation
    const donation = await prisma.donationTransaction.findFirst({
      where: {
        id: donationId,
        churchId: church.id, // Ensure it belongs to this church
      },
      include: {
        donationType: {
          select: {
            name: true,
            isCampaign: true,
          },
        },
        donor: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!donation) {
      return null;
    }

    // Format for frontend
    const formattedDonation: DonationWithEditHistory = {
      id: donation.id,
      churchId: donation.churchId,
      donationTypeId: donation.donationTypeId,
      donationTypeName: donation.donationType.name,
      donationTypeIsCampaign: donation.donationType.isCampaign,
      donorClerkId: donation.donorClerkId,
      donorName: donation.donorName ?? (donation.donor ? `${donation.donor.firstName} ${donation.donor.lastName}`.trim() : undefined),
      donorEmail: donation.donorEmail ?? undefined,
      amount: (donation.amount / 100).toFixed(2),
      currency: donation.currency,
      status: donation.status,
      paymentMethodType: donation.paymentMethodType ?? '',
      stripePaymentIntentId: donation.stripePaymentIntentId,
      stripeSubscriptionId: donation.stripeSubscriptionId,
      transactionDate: donation.transactionDate.toISOString(),
      processedAt: donation.processedAt ? donation.processedAt.toISOString() : null,
      donorId: donation.donorId,
      idempotencyKey: donation.idempotencyKey,
      source: donation.source,
      donationDate: donation.transactionDate.toISOString(),
      createdAt: donation.createdAt.toISOString(),
      updatedAt: donation.lastEditedAt?.toISOString() ?? donation.createdAt.toISOString(),
      // Include edit tracking fields
      editReason: donation.editReason,
      lastEditedBy: donation.lastEditedBy,
      lastEditedAt: donation.lastEditedAt?.toISOString() || null,
      editHistory: donation.editHistory,
      // Include refund tracking fields
      refundedAmount: donation.refundedAmount,
      refundedAt: donation.refundedAt?.toISOString() || null,
      // Include dispute tracking fields
      disputeStatus: donation.disputeStatus,
      disputeReason: donation.disputeReason,
      disputedAt: donation.disputedAt?.toISOString() || null,
    };

    return formattedDonation;
  } catch (error) {
    console.error("Error fetching donation by ID:", error);
    return null;
  }
}