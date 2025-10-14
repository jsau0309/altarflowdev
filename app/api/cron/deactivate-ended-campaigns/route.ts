import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Find campaigns ended by date
    const endedByDate = await prisma.donationType.updateMany({
      where: {
        isCampaign: true,
        isActive: true,
        endDate: { lt: now },
      },
      data: { isActive: false },
    })

    // Find campaigns ended by goal (compute totals and deactivate)
    const activeCampaigns = await prisma.donationType.findMany({
      where: { isCampaign: true, isActive: true, goalAmount: { not: null } },
      select: { id: true, goalAmount: true },
    })

    let goalDeactivated = 0
    for (const c of activeCampaigns) {
      const totals = await prisma.donationTransaction.aggregate({
        where: { donationTypeId: c.id, status: { in: ['succeeded', 'succeeded\n'] } },
        _sum: { amount: true, processingFeeCoveredByDonor: true },
      })
      const gross = ((totals._sum.amount || 0) as unknown as number) / 100
      const fees = ((totals._sum.processingFeeCoveredByDonor || 0) as unknown as number) / 100
      const raised = gross + fees
      const goal = c.goalAmount ? parseFloat(c.goalAmount.toString()) : null
      if (goal !== null && raised >= goal) {
        await prisma.donationType.update({ where: { id: c.id }, data: { isActive: false } })
        goalDeactivated++
      }
    }

    return NextResponse.json({ success: true, endedByDate: endedByDate.count, endedByGoal: goalDeactivated })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to deactivate ended campaigns' }, { status: 500 })
  }
}
