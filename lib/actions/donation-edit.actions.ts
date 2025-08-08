"use server"

import { prisma } from '@/lib/db';
import { auth } from "@clerk/nextjs/server";
import { DonationTransactionFE } from "@/lib/types";
import { revalidateTag } from 'next/cache';

export interface EditDonationParams {
  donationId: string;
  amount: number; // In cents
  donationDate: Date;
  donorId: string;
  donationTypeName: string;
  paymentMethod: string;
  editReason: string;
}

export interface EditDonationResult {
  success: boolean;
  donation?: DonationTransactionFE;
  error?: string;
}

// Check if a manual donation is still editable (within 24 hours)
export async function isDonationEditable(donationId: string): Promise<{ editable: boolean; timeRemaining?: string }> {
  try {
    const donation = await prisma.donationTransaction.findUnique({
      where: { id: donationId },
      select: { 
        createdAt: true,
        processedAt: true,
        transactionDate: true, 
        source: true,
        status: true 
      }
    });

    if (!donation) {
      return { editable: false };
    }

    // Only manual donations can be edited
    if (donation.source !== 'manual') {
      return { editable: false };
    }

    // Only succeeded donations can be edited (not pending/failed)
    if (donation.status !== 'succeeded') {
      return { editable: false };
    }

    // Check if within 24-hour window
    // Use processedAt if available (for manual donations), otherwise use transactionDate
    const now = new Date();
    const referenceDate = donation.processedAt || donation.transactionDate;
    const createdAt = new Date(referenceDate);
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCreation > 24) {
      return { editable: false };
    }

    // Calculate time remaining
    const hoursRemaining = Math.floor(24 - hoursSinceCreation);
    const minutesRemaining = Math.floor((24 - hoursSinceCreation - hoursRemaining) * 60);
    
    let timeRemaining = "";
    if (hoursRemaining > 0) {
      timeRemaining = `${hoursRemaining}h ${minutesRemaining}m`;
    } else {
      timeRemaining = `${minutesRemaining}m`;
    }

    return { editable: true, timeRemaining };
  } catch (error) {
    console.error("Error checking donation editability:", error);
    return { editable: false };
  }
}

export async function editManualDonation(params: EditDonationParams): Promise<EditDonationResult> {
  const { userId, orgId } = await auth();
  
  if (!userId || !orgId) {
    return { success: false, error: "User is not authenticated or not associated with a church." };
  }

  const {
    donationId,
    amount,
    donationDate,
    donorId,
    donationTypeName,
    paymentMethod,
    editReason
  } = params;

  try {
    // First check if donation is editable
    const editableCheck = await isDonationEditable(donationId);
    if (!editableCheck.editable) {
      return { success: false, error: "This donation can no longer be edited. The 24-hour edit window has expired." };
    }

    // Fetch the existing donation
    const existingDonation = await prisma.donationTransaction.findUnique({
      where: { id: donationId },
      include: {
        donationType: true,
        donor: true
      }
    });

    if (!existingDonation) {
      return { success: false, error: "Donation not found." };
    }

    // Get church record
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true }
    });

    if (!church) {
      return { success: false, error: "Church not found." };
    }

    // Verify donation belongs to this church
    if (existingDonation.churchId !== church.id) {
      return { success: false, error: "You don't have permission to edit this donation." };
    }

    // Find donation type
    const donationType = await prisma.donationType.findUnique({
      where: {
        churchId_name: {
          churchId: church.id,
          name: donationTypeName
        }
      }
    });

    if (!donationType) {
      return { success: false, error: `Donation type "${donationTypeName}" not found.` };
    }

    // Get donor details
    const donor = await prisma.donor.findUnique({
      where: { id: donorId, churchId: church.id },
      select: { firstName: true, lastName: true, email: true }
    });

    if (!donor) {
      return { success: false, error: "Donor not found." };
    }

    // Prepare edit history entry
    const editHistoryEntry = {
      editedAt: new Date().toISOString(),
      editedBy: userId,
      changes: {
        amount: existingDonation.amount !== amount ? { from: existingDonation.amount, to: amount } : null,
        donorId: existingDonation.donorId !== donorId ? { from: existingDonation.donorId, to: donorId } : null,
        donationType: existingDonation.donationTypeId !== donationType.id ? { from: existingDonation.donationType.name, to: donationTypeName } : null,
        paymentMethod: existingDonation.paymentMethodType !== paymentMethod ? { from: existingDonation.paymentMethodType, to: paymentMethod } : null,
        date: existingDonation.transactionDate.toISOString() !== donationDate.toISOString() ? { from: existingDonation.transactionDate.toISOString(), to: donationDate.toISOString() } : null
      },
      reason: editReason
    };

    // Get existing edit history or create new array
    const existingHistory = existingDonation.editHistory as any[] || [];
    const updatedHistory = [...existingHistory, editHistoryEntry];

    // Update the donation
    const updatedDonation = await prisma.donationTransaction.update({
      where: { id: donationId },
      data: {
        amount,
        transactionDate: donationDate,
        donorId,
        donorName: `${donor.firstName || ''} ${donor.lastName || ''}`.trim() || null,
        donorEmail: donor.email || null,
        donationTypeId: donationType.id,
        paymentMethodType: paymentMethod.toLowerCase(),
        lastEditedAt: new Date(),
        lastEditedBy: userId,
        editReason,
        originalAmount: existingDonation.originalAmount || existingDonation.amount, // Store original amount on first edit
        editHistory: updatedHistory
      },
      include: {
        donationType: {
          select: {
            name: true
          }
        }
      }
    });

    // Format for frontend
    const formattedDonation: DonationTransactionFE = {
      id: updatedDonation.id,
      churchId: updatedDonation.churchId,
      donationTypeId: updatedDonation.donationTypeId,
      donationTypeName: updatedDonation.donationType.name,
      donorClerkId: updatedDonation.donorClerkId,
      donorName: updatedDonation.donorName ?? undefined,
      donorEmail: updatedDonation.donorEmail ?? undefined,
      amount: (updatedDonation.amount / 100).toFixed(2),
      currency: updatedDonation.currency,
      status: updatedDonation.status,
      paymentMethodType: updatedDonation.paymentMethodType ?? '',
      stripePaymentIntentId: updatedDonation.stripePaymentIntentId,
      stripeSubscriptionId: updatedDonation.stripeSubscriptionId,
      transactionDate: updatedDonation.transactionDate.toISOString(),
      processedAt: updatedDonation.processedAt ? updatedDonation.processedAt.toISOString() : null,
      donorId: updatedDonation.donorId,
      idempotencyKey: updatedDonation.idempotencyKey,
      source: updatedDonation.source,
      donationDate: updatedDonation.transactionDate.toISOString(),
      createdAt: updatedDonation.createdAt.toISOString(),
      updatedAt: updatedDonation.lastEditedAt?.toISOString() ?? updatedDonation.createdAt.toISOString(),
    };

    // Invalidate dashboard cache after editing donation
    console.log(`[ACTION] Donation edited successfully. Invalidating cache for org: ${orgId}`);
    revalidateTag(`dashboard-${orgId}`);

    return { success: true, donation: formattedDonation };

  } catch (error) {
    console.error("Error editing donation:", error);
    return { success: false, error: "Failed to edit donation. Please try again." };
  }
}