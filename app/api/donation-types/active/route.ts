import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const clerkOrgId = url.searchParams.get('orgId') || undefined

    let churchId: string | undefined
    if (clerkOrgId) {
      const church = await prisma.church.findUnique({ where: { clerkOrgId }, select: { id: true } })
      if (church) churchId = church.id
    }

    const now = new Date()

    const types = await prisma.donationType.findMany({
      where: {
        ...(churchId ? { churchId } : {}),
        OR: [
          { isCampaign: false }, // defaults always shown
          {
            isCampaign: true,
            isActive: true,
            startDate: { lte: now },
            // end condition: either not ended by date; goal check done client-side via stats
          },
        ],
      },
      orderBy: [{ isCampaign: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, data: types })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch active donation types' }, { status: 500 })
  }
}
