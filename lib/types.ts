// lib/types.ts

// Centralized type definitions for the application

export interface Donation {
  id: string;
  donorId: string;
  campaignId: string;
  amount: number;
  date: string; // Use string for consistency, parse when needed
  paymentMethod: string;
  isDigital: boolean; // Added from donations-content
  receiptUrl?: string; // Added from donations-content
  notes?: string; // Added from donations-content
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
  description: string;
  goal: number;
  raised: number;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  allowRecurring?: boolean; // Added from donations-content
  recurringOptions?: { // Added from donations-content
    frequencies: string[];
  };
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
  membershipStatus: string | null;
  joinDate: string | null; // Dates might be strings after JSON serialization
  ministryInvolvement: string | null;
  smsConsent: boolean;
  smsConsentDate: string | null;
  smsConsentMethod: string | null;
  language: string | null; // Added from form
  churchId: string;
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
// ... existing code ... 