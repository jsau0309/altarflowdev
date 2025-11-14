// lib/types.ts

// Centralized type definitions for the application
import type { Member as PrismaMember } from '@prisma/client';

export interface Donation {
  id: string;
  // donorId: string; // This refers to memberId in Prisma schema
  memberId?: string | null; // Reflects Prisma schema
  donationTypeId?: string | null; // Reflects Prisma schema
  amount: string; // Prisma Decimal serializes to string
  donationDate: string; // Reflects Prisma schema and server action (ISO string)
  currency: string; // From Prisma schema
  // paymentMethod: string; // Not in Prisma Donation, consider removing if not used elsewhere
  // isDigital: boolean; // Not in Prisma Donation
  // receiptUrl?: string; // Not in Prisma Donation
  // notes?: string; // Not in Prisma Donation
  donorFirstName?: string | null;
  donorLastName?: string | null;
  donorEmail?: string | null;
  stripePaymentIntentId?: string | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface Expense {
  id: string;
  vendor: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: string;
  receiptUrl?: string; // Assuming expenses might also have receipts
  notes?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null; // Prisma: String?
  goalAmount: string | null; // Prisma: Decimal?, serializes to string
  // raised: number; // This is a calculated field, not directly in Prisma model
  // isActive: boolean; // Not in Prisma model
  startDate: string | null; // Prisma: DateTime?, serializes to string
  endDate: string | null; // Prisma: DateTime?, serializes to string
  // allowRecurring?: boolean; // Not in Prisma model
  // recurringOptions?: { // Not in Prisma model
  //   frequencies: string[];
  // };
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  isActive?: boolean;
  isRecurringAllowed?: boolean;
  isCampaign?: boolean;
  isSystemType?: boolean;
  isDeletable?: boolean;
  churchId?: string | null;
}

// Member type based on Prisma schema (ensure it stays in sync)
export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  membershipStatus: PrismaMember['membershipStatus'];
  joinDate: string | null; // Dates might be strings after JSON serialization
  ministryInvolvement: string | null;
  smsConsent: boolean;
  smsConsentDate: string | null;
  smsConsentMethod: string | null;
  preferredLanguage: string | null;
  notes: string | null; // Added from form
  // churchId: string; // Removed as client-side likely doesn't need internal DB ID
  // Add audit timestamps
  createdAt: string; // Assume ISO string from API
  // Email preference data
  emailPreference?: {
    isSubscribed: boolean;
    unsubscribedAt: string | null;
  } | null;
  updatedAt: string; // Assume ISO string from API
};

// Donor type (example, update as needed)
export type DonorFE = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  createdAt: string;
  updatedAt: string;
  memberId?: string | null; // ID of the linked member
  linkedMemberName?: string | null; // Name of the linked member for display
  churchId?: string | null; // From linked member, for context in modals
};

// Donor type (example, update as needed)
export type Donor = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  // Update notes to be an array of strings
  notes?: string[];
  // Add audit timestamps to the existing Member type
  createdAt: string; // Assume ISO string from API
  updatedAt: string; // Assume ISO string from API
}

// Expense type (example, adjust based on your actual schema and API returns)
// Type for data returned by getDonorDetails server action
export type DonorDetailsData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  membershipStatus: PrismaMember['membershipStatus']; // This is MembershipStatus | null
  joinDate: string | null;
  ministryInvolvement: string | null;
  smsConsent: boolean;
  smsConsentDate: string | null;
  smsConsentMethod: string | null;
  preferredLanguage: string | null; // Renamed from 'language'
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  churchId: string | null; // ID of the church this donor is associated with (e.g., via linked member)
  memberId: string | null; // ID of the linked Member record
  linkedMemberName: string | null; // Name of the linked Member for display
  donations: Array<{
    id: string;
    amount: string; // Prisma Decimal serializes to string
    currency: string;
    status: string; // 'pending', 'succeeded', 'failed', etc.
    donationDate: string; // ISO string
    donorFirstName: string | null;
    donorLastName: string | null;
    donorEmail: string | null;
    memberId: string | null;
    donationTypeId: string | null;
    // churchId: string; // Client might not need this for display
    stripePaymentIntentId: string | null;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    donationType: {
      id: string;
      name: string;
      description: string | null;
      isCampaign: boolean;
      isActive: boolean;
      goalAmount: string | null; // Prisma Decimal serializes to string
      startDate: string | null; // ISO string
      endDate: string | null; // ISO string
      // churchId: string; // Client might not need this for display
      createdAt: string; // ISO string
      updatedAt: string; // ISO string
    } | null;
  }>;
};

// Interface for the data returned by the function
export interface DonationReportData {
  totalDonations: number;
  averageDonation: number;
  uniqueDonors: number;
  donationRecords: DonationTransactionFE[];
}

export type DonationTransactionFE = Omit<Donation, 'amount'> & {
  amount: string; // amount is a string because Decimal is not supported in client components
  donorName?: string;
  stripePaymentIntentId: string | null;
  stripeSubscriptionId: string | null;
  transactionDate: string; // ISO string
  processedAt: string | null; // ISO string
  donorId: string | null;
  idempotencyKey: string | null;
  paymentMethodType: string;
  paymentMethodId?: string | null;
  paymentMethod?: {
    name: string;
    color: string;
  } | null;
  donationTypeId: string; // Added: Foreign key to DonationType
  donationTypeName: string;
  donationTypeIsCampaign?: boolean;
  churchId: string; // Added: ID of the church
  source: string; // Added: 'manual' or 'stripe'
  status: string; // Added: e.g., 'succeeded', 'pending', 'failed', 'refunded', 'disputed'
  notes?: string | null; // Added: Optional notes
  // Fee tracking fields
  processingFeeCoveredByDonor?: string; // Stripe fees covered by donor (as string)
  platformFeeAmount?: string; // Platform fees (as string)
  // Refund tracking fields
  refundedAmount?: number | null;
  refundedAt?: string | null; // ISO string
  // Dispute tracking fields
  disputeStatus?: string | null;
  disputeReason?: string | null;
  disputedAt?: string | null; // ISO string
  // Anonymous/International donor fields
  isAnonymous?: boolean;
  isInternational?: boolean;
  donorCountry?: string | null;
};