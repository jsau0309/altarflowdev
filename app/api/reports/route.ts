import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-helpers';
import { Prisma } from '@prisma/client'; // Import Prisma namespace for types

// GET /api/reports - Fetch basic financial summary
export async function GET(request: Request) {
  try {
    // Authentication & Authorization check
    // TODO: Implement role-based access (e.g., only ADMIN or specific STAFF)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- Data Fetching (TODO: Add date range filters later) ---

    // Fetch Donations
    const donations = await prisma.donation.findMany({
      // where: { donationDate: { gte: startDate, lte: endDate } } // Example date filter
    });

    // Fetch Approved Expenses
    const expenses = await prisma.expense.findMany({
       where: { 
         status: 'APPROVED' // Only consider approved expenses for summary
         // expenseDate: { gte: startDate, lte: endDate } // Example date filter
       }
    });

    // --- Calculations ---

    // Calculate total donation amount
    const totalDonationAmount = donations.reduce((sum, donation) => {
      // Ensure amount is treated as a number for summation
      return sum + new Prisma.Decimal(donation.amount).toNumber(); 
    }, 0);

    // Calculate total approved expense amount
    const totalExpenseAmount = expenses.reduce((sum, expense) => {
      return sum + new Prisma.Decimal(expense.amount).toNumber();
    }, 0);

    const summary = {
      totalDonationAmount: totalDonationAmount,
      numberOfDonations: donations.length,
      totalExpenseAmount: totalExpenseAmount,
      numberOfExpenses: expenses.length,
      netAmount: totalDonationAmount - totalExpenseAmount,
      // Could add more summaries: donations by campaign, expenses by category etc. later
      // Example: Add timestamp of when the report was generated
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(summary);

  } catch (error) {
    console.error("Error generating financial report:", error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
} 