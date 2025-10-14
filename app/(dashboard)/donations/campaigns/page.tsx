import { Suspense } from 'react'
import { getAuth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import CampaignsClient from './page_client'

export default async function CampaignsPage() {
  const { orgId } = await getAuth()
  if (!orgId) notFound()

  const church = await prisma.church.findUnique({ where: { clerkOrgId: orgId }, select: { id: true, name: true } })
  if (!church) notFound()

  const donationTypes = await prisma.donationType.findMany({
    where: { churchId: church.id },
    orderBy: [{ isCampaign: 'asc' }, { isActive: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }],
  })

  return (
    <Suspense>
      <CampaignsClient churchName={church.name} donationTypes={donationTypes as any} />
    </Suspense>
  )
}
