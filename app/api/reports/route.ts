import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client'; // Import Prisma namespace for types

// GET /api/reports - Fetch basic financial summary for the active organization
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication & Authorization check
    const { userId, orgId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!orgId) {
      console.error(`User ${userId} attempted to GET reports without an active organization.`);
      return NextResponse.json({ error: 'No active organization selected.' }, { status: 400 });
    }
    // TODO: Implement role-based access (e.g., only ADMIN or specific STAFF)
    // Example: if (orgRole !== 'admin') { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

    // --- Data Fetching for the active organization (TODO: Add date range filters later) ---

    // Fetch Donations for the specific org
    const donations = await prisma.donation.findMany({
      where: {
        church: { 
          clerkOrgId: orgId 
        }
        // , donationDate: { gte: startDate, lte: endDate } // Example date filter
      }
    });

    // Fetch Approved Expenses for the specific org
    const expenses = await prisma.expense.findMany({
       where: { 
         status: 'APPROVED', 
         church: { 
           clerkOrgId: orgId 
         }
         // , expenseDate: { gte: startDate, lte: endDate } // Example date filter
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