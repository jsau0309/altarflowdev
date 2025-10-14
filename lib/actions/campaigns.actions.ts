"use server";

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export type CampaignType = Prisma.DonationTypeGetPayload<{}>;

export async function listDonationTypes(orgId: string) {
  const church = await prisma.church.findUnique({ where: { clerkOrgId: orgId }, select: { id: true } });
  if (!church) return [];
  return prisma.donationType.findMany({ where: { churchId: church.id }, orderBy: [{ isCampaign: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }] });
}

export async function listActiveDonationTypes(orgId: string) {
  const church = await prisma.church.findUnique({ where: { clerkOrgId: orgId }, select: { id: true } });
  if (!church) return [];
  const now = new Date();
  return prisma.donationType.findMany({
    where: {
      churchId: church.id,
      OR: [
        { isCampaign: false },
        { isCampaign: true, isActive: true, startDate: { lte: now } },
      ],
    },
    orderBy: [{ isCampaign: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function getDonationTypeStats(donationTypeId: string) {
  const [totals, donors, txCount, type] = await Promise.all([
    prisma.donationTransaction.aggregate({
      where: { donationTypeId, status: { in: ['succeeded', 'succeeded\n'] } },
      _sum: { amount: true, processingFeeCoveredByDonor: true },
    }),
    prisma.donationTransaction.count({ where: { donationTypeId, status: { in: ['succeeded', 'succeeded\n'] }, donorId: { not: null } } }),
    prisma.donationTransaction.count({ where: { donationTypeId, status: { in: ['succeeded', 'succeeded\n'] } } }),
    prisma.donationType.findUnique({ where: { id: donationTypeId }, select: { goalAmount: true, endDate: true, startDate: true } }),
  ]);

  const gross = ((totals._sum.amount || 0) as unknown as number) / 100;
  const feesCovered = ((totals._sum.processingFeeCoveredByDonor || 0) as unknown as number) / 100;
  const totalRaised = gross + feesCovered;

  const goalAmount = type?.goalAmount ? parseFloat(type.goalAmount.toString()) : null;
  const progressPercent = goalAmount ? Math.min(100, Math.round((totalRaised / goalAmount) * 100)) : 0;
  const isGoalReached = goalAmount ? totalRaised >= goalAmount : false;

  let daysRemaining: number | null = null;
  if (type?.endDate) {
    const now = new Date();
    const diff = Math.ceil((type.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    daysRemaining = Math.max(diff, 0);
  }

  return {
    totalRaised,
    donorCount: donors,
    transactionCount: txCount,
    goalAmount,
    progressPercent,
    isGoalReached,
    daysRemaining,
  };
}
