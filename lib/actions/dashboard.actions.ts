"use server"

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { startOfWeek, startOfMonth, startOfYear, subMonths, subWeeks, endOfWeek, endOfMonth, endOfYear } from "date-fns";
import { revalidateTag } from "next/cache";

interface DashboardSummary {
  donationSummary: {
    monthlyChange: number;
    weeklyTotal: number;
    monthlyTotal: number;
    yearlyTotal: number;
  };
  expenseSummary: {
    monthlyChange: number;
    weeklyTotal: number;
    monthlyTotal: number;
    yearlyTotal: number;
  };
  memberActivity: {
    newMembers: number;
    activeMembers: number;
    recentMembers: {
      id: string;
      firstName: string;
      lastName: string;
      joinDate: string;
    }[];
  };
}

export async function getDashboardSummary(): Promise<DashboardSummary | null> {
  const { orgId } = await auth();
  
  if (!orgId) {
    console.error("No organization ID found");
    return null;
  }

  try {
    // Get church by clerk org ID
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true }
    });

    if (!church) {
      console.error("Church not found for org:", orgId);
      return null;
    }

    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    const thisWeekEnd = endOfWeek(now);
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const thisYearStart = startOfYear(now);
    const thisYearEnd = endOfYear(now);

    // Fetch all data in parallel for better performance
    const [
      // Donations - This Week
      donationsThisWeek,
      // Donations - This Month
      donationsThisMonth,
      // Donations - Last Month
      donationsLastMonth,
      // Donations - This Year
      donationsThisYear,
      // Expenses - This Week
      expensesThisWeek,
      // Expenses - This Month
      expensesThisMonth,
      // Expenses - Last Month
      expensesLastMonth,
      // Expenses - This Year
      expensesThisYear,
      // Members - New this month
      newMembers,
      // Members - Total active
      totalActiveMembers,
      // Recent members
      recentMembers
    ] = await Promise.all([
      // Donations queries
      prisma.donationTransaction.aggregate({
        where: {
          churchId: church.id,
          transactionDate: { gte: thisWeekStart, lte: thisWeekEnd },
          status: { in: ['succeeded', 'succeeded\n'] }
        },
        _sum: { amount: true }
      }),
      prisma.donationTransaction.aggregate({
        where: {
          churchId: church.id,
          transactionDate: { gte: thisMonthStart, lte: thisMonthEnd },
          status: { in: ['succeeded', 'succeeded\n'] }
        },
        _sum: { amount: true }
      }),
      prisma.donationTransaction.aggregate({
        where: {
          churchId: church.id,
          transactionDate: { gte: lastMonthStart, lte: lastMonthEnd },
          status: { in: ['succeeded', 'succeeded\n'] }
        },
        _sum: { amount: true }
      }),
      prisma.donationTransaction.aggregate({
        where: {
          churchId: church.id,
          transactionDate: { gte: thisYearStart, lte: thisYearEnd },
          status: { in: ['succeeded', 'succeeded\n'] }
        },
        _sum: { amount: true }
      }),
      
      // Expenses queries
      prisma.expense.aggregate({
        where: {
          churchId: church.id,
          expenseDate: { gte: thisWeekStart, lte: thisWeekEnd },
          status: { in: ['APPROVED', 'PENDING'] }
        },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: {
          churchId: church.id,
          expenseDate: { gte: thisMonthStart, lte: thisMonthEnd },
          status: { in: ['APPROVED', 'PENDING'] }
        },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: {
          churchId: church.id,
          expenseDate: { gte: lastMonthStart, lte: lastMonthEnd },
          status: { in: ['APPROVED', 'PENDING'] }
        },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: {
          churchId: church.id,
          expenseDate: { gte: thisYearStart, lte: thisYearEnd },
          status: { in: ['APPROVED', 'PENDING'] }
        },
        _sum: { amount: true }
      }),
      
      // Members queries
      prisma.member.count({
        where: {
          churchId: church.id,
          joinDate: { gte: thisMonthStart, lte: thisMonthEnd }
        }
      }),
      prisma.member.count({
        where: {
          churchId: church.id,
          membershipStatus: { in: ['Member', 'Visitor'] }
        }
      }),
      prisma.member.findMany({
        where: {
          churchId: church.id,
          joinDate: { not: null }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          joinDate: true
        },
        orderBy: { joinDate: 'desc' },
        take: 5
      })
    ]);

    // Convert amounts from cents to dollars for donations
    const weeklyDonations = (donationsThisWeek._sum.amount || 0) / 100;
    const monthlyDonations = (donationsThisMonth._sum.amount || 0) / 100;
    const lastMonthDonations = (donationsLastMonth._sum.amount || 0) / 100;
    const yearlyDonations = (donationsThisYear._sum.amount || 0) / 100;

    // Expenses are already in dollars
    const weeklyExpenses = parseFloat(expensesThisWeek._sum.amount?.toString() || '0');
    const monthlyExpenses = parseFloat(expensesThisMonth._sum.amount?.toString() || '0');
    const lastMonthExpenses = parseFloat(expensesLastMonth._sum.amount?.toString() || '0');
    const yearlyExpenses = parseFloat(expensesThisYear._sum.amount?.toString() || '0');

    // Calculate percentage changes
    const donationMonthlyChange = lastMonthDonations > 0 
      ? ((monthlyDonations - lastMonthDonations) / lastMonthDonations) * 100 
      : 0;
    
    const expenseMonthlyChange = lastMonthExpenses > 0 
      ? ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
      : 0;

    return {
      donationSummary: {
        monthlyChange: donationMonthlyChange,
        weeklyTotal: weeklyDonations,
        monthlyTotal: monthlyDonations,
        yearlyTotal: yearlyDonations
      },
      expenseSummary: {
        monthlyChange: expenseMonthlyChange,
        weeklyTotal: weeklyExpenses,
        monthlyTotal: monthlyExpenses,
        yearlyTotal: yearlyExpenses
      },
      memberActivity: {
        newMembers: newMembers,
        activeMembers: totalActiveMembers,
        recentMembers: recentMembers.map(member => ({
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          joinDate: member.joinDate?.toISOString() || new Date().toISOString()
        }))
      }
    };
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return null;
  }
}

// Function to invalidate dashboard cache when data changes
export async function invalidateDashboardCache() {
  const { orgId } = await auth();
  if (orgId) {
    revalidateTag(`dashboard-${orgId}`);
  }
}