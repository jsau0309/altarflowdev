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

export async function getTopDonorsThisMonth(churchId: string): Promise<Array<{ donorName: string; totalAmount: number }>> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month

    const topDonorSums = await prisma.donationTransaction.groupBy({
      by: ['donorId'],
      where: {
        churchId,
        transactionDate: { gte: startOfMonth, lte: endOfMonth },
        OR: [{ status: 'succeeded' }, { source: 'manual' }],
        donorId: { not: null }, // Ensure we only consider transactions linked to a donor
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: 3,
    });

    if (!topDonorSums || topDonorSums.length === 0) {
      return [];
    }

    const donorIds = topDonorSums.map(sum => sum.donorId).filter(id => id !== null) as string[];

    if (donorIds.length === 0) {
        return [];
    }

    const donors = await prisma.donor.findMany({
      where: {
        id: { in: donorIds },
        churchId: churchId, 
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const donorMap = new Map(donors.map(donor => [donor.id, donor]));

    const result = topDonorSums.map(sum => {
      const donor = donorMap.get(sum.donorId as string); 
      const firstName = donor?.firstName ?? '';
      const lastName = donor?.lastName ?? '';
      let donorName = `${firstName} ${lastName}`.trim();
      
      if (!donorName) {
        donorName = "Anonymous Donor"; 
      }
      
      return {
        donorName,
        totalAmount: (sum._sum.amount ?? 0) / 100,
      };
    });
    
    return result;

  } catch (error) {
    console.error("Error fetching top donors this month:", error);
    throw new Error("Failed to fetch top donors."); 
  }
}

export async function getMostUsedPaymentMethodThisMonth(churchId: string): Promise<{ paymentMethodType: string; count: number } | null> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month

    const result = await prisma.donationTransaction.groupBy({
      by: ['paymentMethodType'], // Corrected
      where: {
        churchId,
        transactionDate: { gte: startOfMonth, lte: endOfMonth },
        OR: [{ status: 'succeeded' }, { source: 'manual' }],
        paymentMethodType: { not: null }, // Corrected
      },
      _count: {
        paymentMethodType: true, // Corrected
      },
      orderBy: {
        _count: {
          paymentMethodType: 'desc', // Corrected
        },
      },
      take: 1,
    });

    if (!result || result.length === 0 || !result[0].paymentMethodType) { // Corrected
      return null; 
    }
    
    return {
      paymentMethodType: result[0].paymentMethodType, // Corrected
      count: result[0]._count.paymentMethodType,   // Corrected
    };

  } catch (error) {
    console.error("Error fetching most used payment method this month:", error);
    throw new Error("Failed to fetch most used payment method.");
  }
}

export async function getBiggestDonationThisMonth(churchId: string): Promise<{ donorName?: string; amount: number } | null> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const biggestDonation = await prisma.donationTransaction.findFirst({
      where: {
        churchId,
        transactionDate: { gte: startOfMonth, lte: endOfMonth },
        OR: [{ status: 'succeeded' }, { source: 'manual' }],
      },
      orderBy: {
        amount: 'desc',
      },
      include: {
        donor: { // Include donor details
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!biggestDonation) {
      return null;
    }

    let donorName;
    if (biggestDonation.donor) {
      const firstName = biggestDonation.donor.firstName ?? '';
      const lastName = biggestDonation.donor.lastName ?? '';
      donorName = `${firstName} ${lastName}`.trim();
      if (!donorName) donorName = "Anonymous Donor";
    } else if (biggestDonation.donorClerkId) {
      // If donor relationship is not populated but donorClerkId exists,
      // you might want to fetch donor details using donorClerkId here.
      // For simplicity, we'll mark as "Registered Donor (Details Unavailable)" or similar.
      // Or, if donorName was directly on DonationTransaction, use that.
      // For now, let's assume if `donor` isn't populated, we can't easily get the name here.
      // The schema might have a direct `donorName` field on `DonationTransaction` for manual entries.
      // If `biggestDonation.donorName` exists on the model, use it:
      // donorName = biggestDonation.donorName || "Anonymous Donor";
    }
     if (!donorName && biggestDonation.donorName) { // Check if donorName field exists directly on transaction
      donorName = biggestDonation.donorName;
    }


    return {
      donorName: donorName || "Anonymous Donor", // Default if no name could be constructed
      amount: biggestDonation.amount / 100,
    };

  } catch (error) {
    console.error("Error fetching biggest donation this month:", error);
    throw new Error("Failed to fetch biggest donation.");
  }
}

export async function getExpenseTrendData(churchId: string): Promise<Array<{ month: string; totalExpenses: number }>> {
  try {
    const now = new Date();
    const trendData: Array<{ month: string; totalExpenses: number }> = [];

    for (let i = 5; i >= 0; i--) { // Loop for current month and 5 previous months
      const targetMonthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), 1);
      const endOfMonth = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0); // Last day of target month

      const monthlyExpense = await prisma.expense.aggregate({
        where: {
          churchId,
          expenseDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: {
          amount: true,
        },
      });

      const monthYear = `${startOfMonth.getFullYear()}-${(startOfMonth.getMonth() + 1).toString().padStart(2, '0')}`;
      trendData.push({
        month: monthYear,
        totalExpenses: monthlyExpense._sum.amount?.toNumber() ?? 0,
      });
    }

    return trendData;

  } catch (error) {
    console.error("Error fetching expense trend data:", error);
    throw new Error("Failed to fetch expense trend data.");
  }
}

export async function getDonationTrendData(churchId: string): Promise<Array<{ month: string; totalDonations: number }>> {
  try {
    const now = new Date();
    const trendData: Array<{ month: string; totalDonations: number }> = [];

    for (let i = 5; i >= 0; i--) { // Loop for current month and 5 previous months
      const targetMonthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), 1);
      const endOfMonth = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0); // Last day of target month

      const monthlyDonation = await prisma.donationTransaction.aggregate({
        where: {
          churchId,
          transactionDate: { gte: startOfMonth, lte: endOfMonth },
          OR: [{ status: 'succeeded' }, { source: 'manual' }],
        },
        _sum: {
          amount: true,
        },
      });

      const monthYear = `${startOfMonth.getFullYear()}-${(startOfMonth.getMonth() + 1).toString().padStart(2, '0')}`;
      trendData.push({
        month: monthYear,
        totalDonations: (monthlyDonation._sum.amount ?? 0) / 100,
      });
    }

    return trendData;

  } catch (error) {
    console.error("Error fetching donation trend data:", error);
    throw new Error("Failed to fetch donation trend data.");
  }
}

export async function getActiveMemberList(churchId: string): Promise<Array<{ id: string; firstName: string | null; lastName: string | null; email: string | null }>> {
  try {
    const activeMembers = await prisma.member.findMany({
      where: {
        churchId,
        membershipStatus: 'Member',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        // Potentially add joinDate or other relevant fields if needed for the LLM context
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ]
    });

    return activeMembers.map(member => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
    }));

  } catch (error) {
    console.error("Error fetching active member list:", error);
    throw new Error("Failed to fetch active member list.");
  }
}

export async function getVisitorList(churchId: string): Promise<Array<{ id: string; firstName: string | null; lastName: string | null; email: string | null; createdAt: Date }>> {
  try {
    const visitorMembers = await prisma.member.findMany({
      where: {
        churchId,
        membershipStatus: 'Visitor',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true, // To give an idea of when they became a visitor
      },
      orderBy: [
        { createdAt: 'desc' }, // Show newest visitors first
        { lastName: 'asc' },
        { firstName: 'asc' },
      ]
    });

    return visitorMembers.map(member => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      createdAt: member.createdAt,
    }));

  } catch (error) {
    console.error("Error fetching visitor list:", error);
    throw new Error("Failed to fetch visitor list.");
  }
}







