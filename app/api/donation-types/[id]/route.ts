import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getAuth } from '@clerk/nextjs/server'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  goalAmount: z.number().positive().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  displayOrder: z.number().int().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const type = await prisma.donationType.findUnique({ where: { id } })
    if (!type) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: type })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch donation type' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId, userId, orgRole } = getAuth(req)
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (orgRole !== 'org:admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    const data = parsed.data

    // Ensure record belongs to church
    const church = await prisma.church.findUnique({ where: { clerkOrgId: orgId }, select: { id: true } })
    if (!church) return NextResponse.json({ error: 'Church not found' }, { status: 404 })

    const existing = await prisma.donationType.findUnique({ where: { id } })
    if (!existing || existing.churchId !== church.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.donationType.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        isActive: data.isActive ?? undefined,
        goalAmount: data.goalAmount === undefined ? undefined : (data.goalAmount === null ? null : new Prisma.Decimal(data.goalAmount)),
        endDate: data.endDate === undefined ? undefined : (data.endDate ? new Date(data.endDate) : null),
        startDate: data.startDate === undefined ? undefined : (data.startDate ? new Date(data.startDate) : null),
        displayOrder: data.displayOrder ?? undefined,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update donation type' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId, userId, orgRole } = getAuth(req)
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (orgRole !== 'org:admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    // Soft delete: set isActive = false
    const updated = await prisma.donationType.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete donation type' }, { status: 500 })
  }
}
