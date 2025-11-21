import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Metrics Endpoint
 *
 * Returns business metrics and system statistics
 * Can be used for custom dashboards or monitoring tools
 *
 * @endpoint GET /api/health/metrics
 */
export async function GET() {
  try {
    // Get metrics from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Query donation and member metrics
    const [donationStats, memberStats, expenseStats] = await Promise.all([
      // Donation metrics
      prisma.donationTransaction.groupBy({
        by: ['status'],
        where: {
          transactionDate: { gte: oneDayAgo },
        },
        _count: true,
        _sum: {
          amount: true,
        },
      }),

      // Member metrics
      prisma.member.count({
        where: {
          createdAt: { gte: oneDayAgo },
        },
      }),

      // Expense metrics
      prisma.expense.count({
        where: {
          createdAt: { gte: oneDayAgo },
        },
      }),
    ]);

    // Calculate success rates
    const totalDonations = donationStats.reduce((sum: number, stat) => sum + stat._count, 0);
    const successfulDonations = donationStats.find((s) => s.status === 'succeeded')?._count || 0;
    const donationSuccessRate = totalDonations > 0 ? (successfulDonations / totalDonations) * 100 : 0;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      period: '24h',
      metrics: {
        donations: {
          total: totalDonations,
          successful: successfulDonations,
          successRate: `${donationSuccessRate.toFixed(2)}%`,
          totalAmount: donationStats.reduce((sum: number, stat) => sum + (stat._sum.amount || 0), 0),
          byStatus: donationStats.map((stat) => ({
            status: stat.status,
            count: stat._count,
            amount: stat._sum.amount,
          })),
        },
        expenses: {
          newExpenses: expenseStats,
        },
        members: {
          newMembers: memberStats,
        },
        system: {
          nodeVersion: process.version,
          uptime: process.uptime(),
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            unit: 'MB',
          },
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
