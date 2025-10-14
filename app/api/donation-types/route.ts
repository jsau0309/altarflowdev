import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getAuth } from '@clerk/nextjs/server'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  isCampaign: z.boolean().default(true),
  isActive: z.boolean().default(true),
  goalAmount: z.number().positive().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  displayOrder: z.number().int().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { orgId, userId } = getAuth(req)
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const church = await prisma.church.findUnique({ where: { clerkOrgId: orgId }, select: { id: true } })
    if (!church) return NextResponse.json({ error: 'Church not found' }, { status: 404 })

    const types = await prisma.donationType.findMany({
      where: { churchId: church.id },
      orderBy: [{ isCampaign: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json({ success: true, data: types })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch donation types' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId, userId, orgRole } = getAuth(req)
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (orgRole !== 'org:admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    const data = parsed.data

    const church = await prisma.church.findUnique({ where: { clerkOrgId: orgId }, select: { id: true } })
    if (!church) return NextResponse.json({ error: 'Church not found' }, { status: 404 })

    const created = await prisma.donationType.create({
      data: {
        churchId: church.id,
        name: data.name,
        description: data.description ?? null,
        isRecurringAllowed: true,
        isCampaign: data.isCampaign ?? true,
        isActive: data.isActive ?? true,
        goalAmount: data.goalAmount !== undefined && data.goalAmount !== null ? new Prisma.Decimal(data.goalAmount) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        displayOrder: data.displayOrder ?? 0,
      },
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (e) {
    if (e instanceof prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'A donation type with that name already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create donation type' }, { status: 500 })
  }
}
