// lib/types.ts

// Centralized type definitions for the application
import type { Member as PrismaMember } from '@prisma/client';

export interface Donation {
  id: string;
  // donorId: string; // This refers to memberId in Prisma schema
  memberId?: string | null; // Reflects Prisma schema
  campaignId?: string | null; // Reflects Prisma schema
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
  endDate?: string | null; // Prisma: DateTime?, serializes to string
  // allowRecurring?: boolean; // Not in Prisma model
  // recurringOptions?: { // Not in Prisma model
  //   frequencies: string[];
  // };
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  isActive?: boolean;
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
  updatedAt: string; // Assume ISO string from API
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
  donations: Array<{
    id: string;
    amount: string; // Prisma Decimal serializes to string
    currency: string;
    donationDate: string; // ISO string
    donorFirstName: string | null;
    donorLastName: string | null;
    donorEmail: string | null;
    memberId: string | null;
    campaignId: string | null;
    // churchId: string; // Client might not need this for display
    stripePaymentIntentId: string | null;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    campaign: {
      id: string;
      name: string;
      description: string | null;
      goalAmount: string | null; // Prisma Decimal serializes to string
      startDate: string | null; // ISO string
      endDate: string | null; // ISO string
      // churchId: string; // Client might not need this for display
      createdAt: string; // ISO string
      updatedAt: string; // ISO string
    } | null;
  }>;
};

// ... existing code ...

export type DonationTransactionFE = {
  id: string;
  churchId: string;
  donationTypeId: string;
  donationTypeName: string; // Added from relation
  campaignId: string | null;
  donorClerkId: string | null;
  donorName: string | null;
  donorEmail: string | null;
  amount: number; // Converted to dollars
  currency: string;
  status: string;
  paymentMethodType: string | null;
  stripePaymentIntentId: string | null;
  stripeSubscriptionId: string | null;
  transactionDate: string; // ISO string
  processedAt: string | null; // ISO string
  donorId: string | null;
  idempotencyKey: string | null;
};