"use server"

import { prisma } from '@/lib/db';
import { auth } from "@clerk/nextjs/server";
import { startOfWeek, startOfMonth, startOfYear, subMonths, endOfWeek, endOfMonth, endOfYear } from "date-fns";
import { unstable_cache, revalidateTag } from "next/cache";

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

// Optimized version with single query approach
export async function getDashboardSummaryOptimized(): Promise<DashboardSummary | null> {
  const startTime = Date.now();
  const { orgId } = await auth();
  
  if (!orgId) {
    console.error("No organization ID found");
    return null;
  }

  // Use Next.js cache with 5 minute revalidation
  const getCachedSummary = unstable_cache(
    async () => {
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
        const thisMonthStart = startOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const thisYearStart = startOfYear(now);

        // Use raw SQL for better performance - single query to get all donation data
        const donationStats = await prisma.$queryRaw<Array<{
          weekly_total: bigint;
          monthly_total: bigint;
          last_month_total: bigint;
          yearly_total: bigint;
        }>>`
          SELECT 
            COALESCE(SUM(CASE WHEN "transactionDate" >= ${thisWeekStart} THEN amount ELSE 0 END), 0) as weekly_total,
            COALESCE(SUM(CASE WHEN "transactionDate" >= ${thisMonthStart} THEN amount ELSE 0 END), 0) as monthly_total,
            COALESCE(SUM(CASE WHEN "transactionDate" >= ${lastMonthStart} AND "transactionDate" < ${thisMonthStart} THEN amount ELSE 0 END), 0) as last_month_total,
            COALESCE(SUM(CASE WHEN "transactionDate" >= ${thisYearStart} THEN amount ELSE 0 END), 0) as yearly_total
          FROM "DonationTransaction"
          WHERE "churchId" = ${church.id}::uuid
            AND status IN ('succeeded', 'succeeded\n')
            AND "transactionDate" >= ${thisYearStart}
        `;

        // Single query for expense data
        const expenseStats = await prisma.$queryRaw<Array<{
          weekly_total: number;
          monthly_total: number;
          last_month_total: number;
          yearly_total: number;
        }>>`
          SELECT 
            COALESCE(SUM(CASE WHEN "expenseDate" >= ${thisWeekStart} THEN amount ELSE 0 END), 0)::float as weekly_total,
            COALESCE(SUM(CASE WHEN "expenseDate" >= ${thisMonthStart} THEN amount ELSE 0 END), 0)::float as monthly_total,
            COALESCE(SUM(CASE WHEN "expenseDate" >= ${lastMonthStart} AND "expenseDate" < ${thisMonthStart} THEN amount ELSE 0 END), 0)::float as last_month_total,
            COALESCE(SUM(CASE WHEN "expenseDate" >= ${thisYearStart} THEN amount ELSE 0 END), 0)::float as yearly_total
          FROM "Expense"
          WHERE "churchId" = ${church.id}::uuid
            AND status IN ('APPROVED', 'PENDING')
            AND "expenseDate" >= ${thisYearStart}
        `;

        // Single query for member stats (exclude visitors from active count)
        const memberStats = await prisma.$queryRaw<Array<{
          new_members: bigint;
          active_members: bigint;
        }>>`
          SELECT 
            COUNT(CASE WHEN "joinDate" >= ${thisMonthStart} AND "membershipStatus" = 'Member' THEN 1 END) as new_members,
            COUNT(CASE WHEN "membershipStatus" = 'Member' THEN 1 END) as active_members
          FROM "Member"
          WHERE "churchId" = ${church.id}::uuid
        `;

        // Get recent members (exclude visitors)
        const recentMembers = await prisma.member.findMany({
          where: {
            churchId: church.id,
            joinDate: { not: null },
            membershipStatus: 'Member'
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            joinDate: true
          },
          orderBy: { joinDate: 'desc' },
          take: 5
        });

        // Process results
        const donationData = donationStats[0];
        const expenseData = expenseStats[0];
        const memberData = memberStats[0];

        const weeklyDonations = Number(donationData.weekly_total) / 100;
        const monthlyDonations = Number(donationData.monthly_total) / 100;
        const lastMonthDonations = Number(donationData.last_month_total) / 100;
        const yearlyDonations = Number(donationData.yearly_total) / 100;

        const weeklyExpenses = expenseData.weekly_total;
        const monthlyExpenses = expenseData.monthly_total;
        const lastMonthExpenses = expenseData.last_month_total;
        const yearlyExpenses = expenseData.yearly_total;

        const donationMonthlyChange = lastMonthDonations > 0 
          ? ((monthlyDonations - lastMonthDonations) / lastMonthDonations) * 100 
          : 0;
        
        const expenseMonthlyChange = lastMonthExpenses > 0 
          ? ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
          : 0;

        console.log(`Dashboard queries completed in ${Date.now() - startTime}ms`);

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
            newMembers: Number(memberData.new_members),
            activeMembers: Number(memberData.active_members),
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
    },
    [`dashboard-${orgId}`],
    {
      revalidate: 300, // Cache for 5 minutes
      tags: [`dashboard-${orgId}`]
    }
  );

  return getCachedSummary();
}

// Function to invalidate dashboard cache when data changes
export async function invalidateDashboardCache() {
  const { orgId } = await auth();
  if (orgId) {
    // This will invalidate the unstable_cache
    revalidateTag(`dashboard-${orgId}`);
  }
}