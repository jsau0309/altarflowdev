import { faker } from '@faker-js/faker';
import type { Expense, Donation, Member, Campaign } from './types';

// Re-export types for use in other modules
export type { Expense, Donation, Member, Campaign };

// --- Mock Data Generation ---

const generateMockExpenses = (count: number): Expense[] => {
  const expenses: Expense[] = [];
  const categories = ['Utilities', 'Supplies', 'Maintenance', 'Salaries', 'Events', 'Outreach'];
  const paymentMethods = ['cash', 'check', 'credit-card', 'bank-transfer'];

  for (let i = 0; i < count; i++) {
    expenses.push({
      id: faker.string.uuid(),
      vendor: faker.company.name(),
      category: faker.helpers.arrayElement(categories),
      amount: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
      date: faker.date.past({ years: 1 }).toISOString().split('T')[0],
      paymentMethod: faker.helpers.arrayElement(paymentMethods),
      // description is not in Expense type, using notes instead
      notes: faker.lorem.sentence(), 
      receiptUrl: faker.datatype.boolean(0.3) ? faker.image.url() : undefined,
    });
  }
  return expenses;
};

const generateMockMembers = (count: number): Member[] => {
  const members: Member[] = [];
  const statuses = ['active', 'visitor', 'inactive', 'new'];
  const languages = ['english', 'spanish', 'both'];

  for (let i = 0; i < count; i++) {
    const hasNotes = faker.datatype.boolean(0.6);
    const hasSmsConsent = faker.datatype.boolean(0.7);
    const hasPhone = faker.datatype.boolean(0.9);
    const phoneNum = hasPhone ? faker.phone.number() : undefined;
    const welcomeSent = hasSmsConsent && hasPhone && faker.datatype.boolean(0.8);
    // Add consent method generation
    const consentMethodValue = hasSmsConsent ? faker.helpers.arrayElement(['verbal', 'written', 'electronic', 'implied']) : 'none';

    members.push({
      id: faker.string.uuid(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      phone: phoneNum,
      joinDate: faker.date.past({ years: 5 }).toISOString().split('T')[0],
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zipCode: faker.location.zipCode(),
      membershipStatus: faker.helpers.arrayElement(statuses),
      language: faker.helpers.arrayElement(languages) as 'english' | 'spanish' | 'both',
      smsConsent: hasSmsConsent,
      phoneVerified: hasPhone && faker.datatype.boolean(0.9),
      welcomeMessageSent: welcomeSent,
      welcomeMessageDate: welcomeSent ? faker.date.recent({ days: 30 }).toISOString() : undefined,
      welcomeMessageStatus: welcomeSent ? faker.helpers.arrayElement(['delivered', 'sent', 'failed']) : undefined,
      // Add mock data for new fields
      smsConsentDate: hasSmsConsent ? faker.date.recent({ days: 60 }).toISOString() : undefined,
      consentMethod: consentMethodValue,
      consentNotes: consentMethodValue !== 'none' && faker.datatype.boolean(0.2) ? faker.lorem.sentence() : undefined,
      notes: hasNotes ? [faker.lorem.paragraph(), faker.lorem.sentence()] : undefined,
    });
  }
  return members;
};

// --- Mock Data Service ---

let mockExpenses: Expense[] = generateMockExpenses(50);
let mockMembers: Member[] = generateMockMembers(100);
// Initialize other data types
let mockDonations: Donation[] = [];
let mockCampaigns: Campaign[] = [];

export const mockDataService = {
  getExpenses: (): Expense[] => {
    // Return a copy to prevent direct modification
    return [...mockExpenses];
  },

  getExpenseById: (id: string): Expense | undefined => {
    return mockExpenses.find(expense => expense.id === id);
  },

  createExpense: (expenseData: Omit<Expense, 'id'>): Expense => {
    const newExpense: Expense = {
      ...expenseData,
      id: faker.string.uuid(),
    };
    mockExpenses.push(newExpense);
    return newExpense;
  },

  updateExpense: (id: string, updates: Partial<Expense>): Expense | undefined => {
    const index = mockExpenses.findIndex(expense => expense.id === id);
    if (index === -1) return undefined;
    
    const updatedExpense = { ...mockExpenses[index], ...updates };
    mockExpenses[index] = updatedExpense;
    return updatedExpense;
  },

  deleteExpense: (id: string): boolean => {
    const initialLength = mockExpenses.length;
    mockExpenses = mockExpenses.filter(expense => expense.id !== id);
    return mockExpenses.length < initialLength;
  },

  // Members
  getMembers: (): Member[] => {
    return [...mockMembers];
  },

  getMemberById: (id: string): Member | undefined => {
    return mockMembers.find(member => member.id === id);
  },

  createMember: (memberData: Omit<Member, 'id'>): Member => {
    const newMember: Member = {
      ...memberData,
      id: faker.string.uuid(),
    };
    mockMembers.push(newMember);
    console.log("Mock Member Created:", newMember); // Log for debugging
    return newMember;
  },

  updateMember: (id: string, updates: Partial<Member>): Member | undefined => {
    const index = mockMembers.findIndex(member => member.id === id);
    if (index === -1) return undefined;
    
    const updatedMember = { ...mockMembers[index], ...updates };
    mockMembers[index] = updatedMember;
    return updatedMember;
  },

  deleteMember: (id: string): boolean => {
    const initialLength = mockMembers.length;
    mockMembers = mockMembers.filter(member => member.id !== id);
    return mockMembers.length < initialLength;
  },

  // TODO: Add similar functions for Donations, Campaigns
  getDonations: (): Donation[] => [],
  getCampaigns: (): Campaign[] => [],
  getDonation: (id: string): Donation | undefined => mockDonations.find(d => d.id === id),
  getMember: (id: string): Member | undefined => mockMembers.find(m => m.id === id),
  getCampaign: (id: string): Campaign | undefined => mockCampaigns.find(c => c.id === id),
};

// NOTE: This requires @faker-js/faker to be installed
// Add it to package.json: npm install @faker-js/faker --save-dev 