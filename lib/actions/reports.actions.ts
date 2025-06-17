"use server"

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

/**
 * @description Get aggregated data for the AI summary report.
 * @param {string} clerkOrgId - The Clerk organization ID.
 * @returns {Promise<object>} - A promise that resolves to the summary data.
 */
export async function getAiSummaryData(clerkOrgId: string) {
  try {
    const church = await prisma.church.findUnique({
      where: { clerkOrgId },
      select: { id: true },
    });

    if (!church) {
      throw new Error("Church not found");
    }

    const churchId = church.id;

    // Define date ranges
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // 1. Query Donations
    const donationsCurrentMonth = await prisma.donationTransaction.aggregate({
      where: {
        churchId,
        OR: [
          { status: 'succeeded' },
          { source: 'manual' }
        ],
        transactionDate: { gte: startOfCurrentMonth },
      },
      _sum: { amount: true },
    });

    const donationsPreviousMonth = await prisma.donationTransaction.aggregate({
      where: {
        churchId,
        OR: [
          { status: 'succeeded' },
          { source: 'manual' }
        ],
        transactionDate: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
      },
      _sum: { amount: true },
    });

    // 2. Query Members
    const newMembersThisMonth = await prisma.member.count({
      where: {
        churchId,
        joinDate: { gte: startOfCurrentMonth },
      },
    });

    const totalMembers = await prisma.member.count({
      where: { churchId },
    });

    // 3. Query Expenses
    const expensesCurrentMonth = await prisma.expense.aggregate({
      where: {
        churchId,
        expenseDate: { gte: startOfCurrentMonth }, 
      },
      _sum: { amount: true },
    });

    const summaryData = {
      donations: {
        currentMonth: (donationsCurrentMonth?._sum?.amount ?? 0) / 100,
        previousMonth: (donationsPreviousMonth?._sum?.amount ?? 0) / 100,
      },
      members: {
        newThisMonth: newMembersThisMonth ?? 0,
        total: totalMembers ?? 0,
      },
      expenses: {
        currentMonth: expensesCurrentMonth?._sum?.amount?.toNumber() ?? 0,
      },
    };

    return summaryData;

  } catch (error) {
    console.error("Error fetching AI summary data:", error);
    // Return a default structure on error to prevent API failure
    return {
      donations: { currentMonth: 0, previousMonth: 0 },
      members: { newThisMonth: 0, total: 0 },
      expenses: { currentMonth: 0 },
    };
  }
}


// Helper to get start of week (Sunday)
const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const newDate = new Date(d.setDate(diff));
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

export async function getDashboardSummary() {
  const { orgId } = await auth();

  if (!orgId) {
    console.warn("getDashboardSummary called without authentication. Returning empty data.");
    return {
      donationSummary: { weeklyTotal: 0, monthlyTotal: 0, yearlyTotal: 0, monthlyChange: 0 },
      expenseSummary: { weeklyTotal: 0, monthlyTotal: 0, yearlyTotal: 0, monthlyChange: 0 },
      memberActivity: { newMembers: 0, activeMembers: 0, recentMembers: [] },
    };
  }

  try {
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });

    if (!church) {
      console.warn(`No church found for orgId: ${orgId}. Returning empty data.`);
      return {
        donationSummary: { weeklyTotal: 0, monthlyTotal: 0, yearlyTotal: 0, monthlyChange: 0 },
        expenseSummary: { weeklyTotal: 0, monthlyTotal: 0, yearlyTotal: 0, monthlyChange: 0 },
        memberActivity: { newMembers: 0, activeMembers: 0, recentMembers: [] },
      };
    }

    const churchId = church.id;

    // --- Date Ranges ---
    const now = new Date();
    const startOfWeek = getStartOfWeek(now);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    endOfPreviousMonth.setHours(23, 59, 59, 999);

    // --- Aggregation Queries ---
    const donationWhereClause = {
      churchId,
      OR: [{ status: 'succeeded' as const }, { source: 'manual' as const }]
    };

    const expenseWhereClause = { churchId };

    const [
      donationsThisWeek,
      donationsThisMonth,
      donationsThisYear,
      donationsPreviousMonth,
      expensesThisWeek,
      expensesThisMonth,
      expensesThisYear,
      expensesPreviousMonth,
      newMembersThisMonth,
      activeMembers,
      recentMembers
    ] = await prisma.$transaction([
      // Donations
      prisma.donationTransaction.aggregate({ where: { ...donationWhereClause, transactionDate: { gte: startOfWeek } }, _sum: { amount: true } }),
      prisma.donationTransaction.aggregate({ where: { ...donationWhereClause, transactionDate: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.donationTransaction.aggregate({ where: { ...donationWhereClause, transactionDate: { gte: startOfYear } }, _sum: { amount: true } }),
      prisma.donationTransaction.aggregate({ where: { ...donationWhereClause, transactionDate: { gte: startOfPreviousMonth, lte: endOfPreviousMonth } }, _sum: { amount: true } }),
      // Expenses
      prisma.expense.aggregate({ where: { ...expenseWhereClause, expenseDate: { gte: startOfWeek } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { ...expenseWhereClause, expenseDate: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { ...expenseWhereClause, expenseDate: { gte: startOfYear } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { ...expenseWhereClause, expenseDate: { gte: startOfPreviousMonth, lte: endOfPreviousMonth } }, _sum: { amount: true } }),
      // Members
      prisma.member.count({ where: { churchId, joinDate: { gte: startOfMonth } } }),
      prisma.member.count({ where: { churchId, membershipStatus: 'Member' } }),
      prisma.member.findMany({ where: { churchId }, orderBy: { joinDate: 'desc' }, take: 5, select: { id: true, firstName: true, lastName: true, joinDate: true } })
    ]);

    // --- Process Donation Results ---
    const prevMonthDonations = (donationsPreviousMonth._sum.amount ?? 0) / 100;
    const currentMonthDonations = (donationsThisMonth._sum.amount ?? 0) / 100;
    let donationChange = 0;
    if (prevMonthDonations > 0) {
      donationChange = ((currentMonthDonations - prevMonthDonations) / prevMonthDonations) * 100;
    } else if (currentMonthDonations > 0) {
      donationChange = 100; 
    }

    // --- Process Expense Results ---
    const prevMonthExpenses = expensesPreviousMonth._sum.amount?.toNumber() ?? 0;
    const currentMonthExpenses = expensesThisMonth._sum.amount?.toNumber() ?? 0;
    let expenseChange = 0;
    if (prevMonthExpenses > 0) {
      expenseChange = ((currentMonthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100;
    } else if (currentMonthExpenses > 0) {
      expenseChange = 100;
    }

    const recentMembersData = recentMembers.map(m => ({
        ...m,
        joinDate: m.joinDate?.toISOString() ?? new Date().toISOString(),
    }));

    return {
      donationSummary: {
        weeklyTotal: (donationsThisWeek._sum.amount ?? 0) / 100,
        monthlyTotal: currentMonthDonations,
        yearlyTotal: (donationsThisYear._sum.amount ?? 0) / 100,
        monthlyChange: donationChange,
      },
      expenseSummary: {
        weeklyTotal: expensesThisWeek._sum.amount?.toNumber() ?? 0,
        monthlyTotal: currentMonthExpenses,
        yearlyTotal: expensesThisYear._sum.amount?.toNumber() ?? 0,
        monthlyChange: expenseChange,
      },
      memberActivity: {
        newMembers: newMembersThisMonth,
        activeMembers: activeMembers,
        recentMembers: recentMembersData,
      },
    };

  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return {
      donationSummary: { weeklyTotal: 0, monthlyTotal: 0, yearlyTotal: 0, monthlyChange: 0 },
      expenseSummary: { weeklyTotal: 0, monthlyTotal: 0, yearlyTotal: 0, monthlyChange: 0 },
      memberActivity: { newMembers: 0, activeMembers: 0, recentMembers: [] },
    };
  }
}
