import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const [totals, donors, txCount, type] = await Promise.all([
      prisma.donationTransaction.aggregate({
        where: { donationTypeId: id, status: { in: ['succeeded', 'succeeded\n'] } },
        _sum: { amount: true, processingFeeCoveredByDonor: true },
      }),
      prisma.donationTransaction.count({
        where: { donationTypeId: id, status: { in: ['succeeded', 'succeeded\n'] }, donorId: { not: null } },
        select: undefined,
      }),
      prisma.donationTransaction.count({ where: { donationTypeId: id, status: { in: ['succeeded', 'succeeded\n'] } } }),
      prisma.donationType.findUnique({ where: { id }, select: { goalAmount: true, endDate: true, startDate: true } }),
    ])

    const gross = ((totals._sum.amount || 0) as unknown as number) / 100
    const feesCovered = ((totals._sum.processingFeeCoveredByDonor || 0) as unknown as number) / 100
    const totalRaised = gross + feesCovered

    const goalAmount = type?.goalAmount ? parseFloat(type.goalAmount.toString()) : null
    const progressPercent = goalAmount ? Math.min(100, Math.round((totalRaised / goalAmount) * 100)) : 0
    const isGoalReached = goalAmount ? totalRaised >= goalAmount : false

    let daysRemaining: number | null = null
    if (type?.endDate) {
      const now = new Date()
      const diff = Math.ceil((type.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      daysRemaining = Math.max(diff, 0)
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRaised,
        donorCount: donors,
        transactionCount: txCount,
        goalAmount,
        progressPercent,
        isGoalReached,
        daysRemaining,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
