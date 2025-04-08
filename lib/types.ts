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

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email?: string; // Added from donations-content
  phone?: string; // Added from donations-content
  joinDate: string; // Added from donations-content
  address?: string; // Added from add-donor-modal
  city?: string; // Added from add-donor-modal
  state?: string; // Added from add-donor-modal
  zipCode?: string; // Added from add-donor-modal
  membershipStatus?: string; // Added from add-donor-modal (mock usage)
  // Fields from add-member-modal
  language?: 'english' | 'spanish' | 'both';
  smsConsent?: boolean;
  phoneVerified?: boolean;
  welcomeMessageSent?: boolean;
  welcomeMessageDate?: string; // ISO string date
  welcomeMessageStatus?: 'pending' | 'sent' | 'delivered' | 'failed' | undefined;
  // Update notes to be an array of strings
  notes?: string[];
} 