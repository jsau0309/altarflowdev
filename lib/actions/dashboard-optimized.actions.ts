"use server"

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { auth } from "@clerk/nextjs/server";
import { startOfWeek, startOfMonth, startOfYear, subMonths } from "date-fns";
import { unstable_cache, revalidateTag } from "next/cache";
import { logger } from '@/lib/logger';

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
  const { orgId } = await auth();
  
  if (!orgId) {
    logger.error('No organization ID found', { operation: 'actions.error' });
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
          logger.error('Church not found for org', { operation: 'actions.dashboard.church_not_found', orgId });
          return null;
        }

        const now = new Date();
        const thisWeekStart = startOfWeek(now);
        const thisMonthStart = startOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const thisYearStart = startOfYear(now);

        // Use raw SQL for better performance - single query to get all donation data
        // GROSS LOGIC: If fees covered, add all fees. If not covered, amount only (no platform fee).
        // SECURITY: Using Prisma.sql for proper parameterization to prevent SQL injection
        const donationStats = await prisma.$queryRaw(Prisma.sql`
          SELECT
            COALESCE(SUM(CASE WHEN "transactionDate" >= ${thisWeekStart} THEN
              CASE WHEN "processingFeeCoveredByDonor" > 0
                THEN amount + "processingFeeCoveredByDonor" + "platformFeeAmount"
                ELSE amount
              END
            ELSE 0 END), 0) as weekly_total,
            COALESCE(SUM(CASE WHEN "transactionDate" >= ${thisMonthStart} THEN
              CASE WHEN "processingFeeCoveredByDonor" > 0
                THEN amount + "processingFeeCoveredByDonor" + "platformFeeAmount"
                ELSE amount
              END
            ELSE 0 END), 0) as monthly_total,
            COALESCE(SUM(CASE WHEN "transactionDate" >= ${lastMonthStart} AND "transactionDate" < ${thisMonthStart} THEN
              CASE WHEN "processingFeeCoveredByDonor" > 0
                THEN amount + "processingFeeCoveredByDonor" + "platformFeeAmount"
                ELSE amount
              END
            ELSE 0 END), 0) as last_month_total,
            COALESCE(SUM(CASE WHEN "transactionDate" >= ${thisYearStart} THEN
              CASE WHEN "processingFeeCoveredByDonor" > 0
                THEN amount + "processingFeeCoveredByDonor" + "platformFeeAmount"
                ELSE amount
              END
            ELSE 0 END), 0) as yearly_total
          FROM "DonationTransaction"
          WHERE "churchId" = ${church.id}::uuid
            AND status IN ('succeeded', 'succeeded\n')
            AND "transactionDate" >= ${thisYearStart}
        `) as Array<{
          weekly_total: bigint;
          monthly_total: bigint;
          last_month_total: bigint;
          yearly_total: bigint;
        }>;

        // Single query for expense data
        // SECURITY: Using Prisma.sql for proper parameterization
        const expenseStats = await prisma.$queryRaw(Prisma.sql`
          SELECT
            COALESCE(SUM(CASE WHEN "expenseDate" >= ${thisWeekStart} THEN amount ELSE 0 END), 0)::float as weekly_total,
            COALESCE(SUM(CASE WHEN "expenseDate" >= ${thisMonthStart} THEN amount ELSE 0 END), 0)::float as monthly_total,
            COALESCE(SUM(CASE WHEN "expenseDate" >= ${lastMonthStart} AND "expenseDate" < ${thisMonthStart} THEN amount ELSE 0 END), 0)::float as last_month_total,
            COALESCE(SUM(CASE WHEN "expenseDate" >= ${thisYearStart} THEN amount ELSE 0 END), 0)::float as yearly_total
          FROM "Expense"
          WHERE "churchId" = ${church.id}::uuid
            AND status IN ('APPROVED', 'PENDING')
            AND "expenseDate" >= ${thisYearStart}
        `) as Array<{
          weekly_total: number;
          monthly_total: number;
          last_month_total: number;
          yearly_total: number;
        }>;

        // Single query for member stats (exclude visitors from active count)
        // SECURITY: Using Prisma.sql for proper parameterization
        const memberStats = await prisma.$queryRaw(Prisma.sql`
          SELECT
            COUNT(CASE WHEN "joinDate" >= ${thisMonthStart} AND "membershipStatus" = 'Member' THEN 1 END) as new_members,
            COUNT(CASE WHEN "membershipStatus" = 'Member' THEN 1 END) as active_members
          FROM "Member"
          WHERE "churchId" = ${church.id}::uuid
        `) as Array<{
          new_members: bigint;
          active_members: bigint;
        }>;

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

        // Process results with safe defaults if queries return empty arrays
        const donationData = donationStats[0] || {
          weekly_total: BigInt(0),
          monthly_total: BigInt(0),
          last_month_total: BigInt(0),
          yearly_total: BigInt(0)
        };
        const expenseData = expenseStats[0] || {
          weekly_total: 0,
          monthly_total: 0,
          last_month_total: 0,
          yearly_total: 0
        };
        const memberData = memberStats[0] || {
          new_members: BigInt(0),
          active_members: BigInt(0)
        };

        // Convert BigInt to Number with proper precision (divide before converting to avoid precision loss)
        const weeklyDonations = Number(donationData.weekly_total / BigInt(100));
        const monthlyDonations = Number(donationData.monthly_total / BigInt(100));
        const lastMonthDonations = Number(donationData.last_month_total / BigInt(100));
        const yearlyDonations = Number(donationData.yearly_total / BigInt(100));

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

        logger.debug('Dashboard queries completed in ${Date.now() - startTime}ms', { operation: 'actions.debug' });

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
        logger.error('Error fetching dashboard summary:', { operation: 'actions.error' }, error instanceof Error ? error : new Error(String(error)));
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