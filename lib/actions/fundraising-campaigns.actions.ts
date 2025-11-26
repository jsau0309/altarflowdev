"use server";

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { parseDateOnly } from '@/lib/date-utils';
import DOMPurify from 'isomorphic-dompurify';

type ListParams = {
  clerkOrgId: string;
  page?: number;
  limit?: number;
  includeInactive?: boolean; // When false, compute isActive by dates/goal
};

export type FundraisingCampaignFE = {
  id: string;
  name: string;
  description: string | null;
  goalAmount: string | null; // serialized decimal
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  raised: number; // dollars
  progressPct: number | null;
  isActive: boolean;
};

type FieldErrors = Partial<Record<'name' | 'goalAmount' | 'startDate' | 'endDate', string>>;

const upsertSchema = z.object({
  clerkOrgId: z.string().min(1),
  name: z.string().trim().min(1, 'donations:donationsContent.campaigns.errors.nameRequired'),
  description: z.string().trim().max(10000).nullish(),
  goalAmount: z.number().positive('donations:donationsContent.campaigns.errors.invalidGoal').max(1_000_000_000).nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  isActive: z.boolean().optional(),
}).superRefine((val, ctx) => {
  if (val.goalAmount != null) {
    const twoDecimals = Number(val.goalAmount.toFixed(2));
    if (val.goalAmount !== twoDecimals) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'donations:donationsContent.campaigns.errors.invalidGoal', path: ['goalAmount'] });
    }
  }
  if (val.startDate && val.endDate) {
    const s = parseDateOnly(val.startDate);
    const e = parseDateOnly(val.endDate);
    if (s && e && s.getTime() > e.getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'donations:donationsContent.campaigns.errors.startAfterEnd', path: ['endDate'] });
    }
  }
});

async function getChurchUuid(clerkOrgId: string): Promise<string> {
  const church = await prisma.church.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (!church) throw new Error('Church not found for current organization');
  return church.id;
}

export async function listFundraisingCampaigns(params: ListParams): Promise<{ campaigns: FundraisingCampaignFE[]; totalCount: number; }>{
  const { clerkOrgId, page = 1, limit = 10, includeInactive = true } = params;
  const churchId = await getChurchUuid(clerkOrgId);

  const skip = (Math.max(1, page) - 1) * limit;

  const [rows, totalCount] = await Promise.all([
    prisma.donationType.findMany({
      where: {
        churchId,
        isCampaign: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.donationType.count({ where: { churchId, isCampaign: true } }),
  ]);

  const campaigns: FundraisingCampaignFE[] = await Promise.all(rows.map(async (c) => {
    const agg = await prisma.donationTransaction.aggregate({
      _sum: { amount: true },
      where: {
        churchId,
        status: 'succeeded',
        donationTypeId: c.id,
      },
    });
    const raised = (agg._sum.amount ?? 0) / 100;
    const goal = c.goalAmount ? Number(c.goalAmount) : null;

    return {
      id: c.id,
      name: c.name,
      description: c.description ?? null,
      goalAmount: c.goalAmount ? c.goalAmount.toString() : null,
      startDate: c.startDate ? c.startDate.toISOString().split('T')[0] : null,
      endDate: c.endDate ? c.endDate.toISOString().split('T')[0] : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      raised,
      progressPct: (goal && goal > 0) ? Math.min(100, Math.round((raised / goal) * 100)) : null,
      isActive: c.isActive,
    };
  }));

  const filtered = includeInactive ? campaigns : campaigns.filter(c => c.isActive);
  return { campaigns: filtered, totalCount };
}

type UpsertInput = {
  clerkOrgId: string;
  name: string;
  description?: string | null;
  goalAmount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
};

export async function createFundraisingCampaign(input: UpsertInput): Promise<{ success: true; id: string } | { success: false; fieldErrors: FieldErrors }>{
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof FieldErrors;
      if (key) fieldErrors[key] = issue.message;
    }
    return { success: false, fieldErrors };
  }
  const churchId = await getChurchUuid(input.clerkOrgId);

  // Sanitize inputs to prevent XSS
  const sanitizedName = DOMPurify.sanitize(input.name, { ALLOWED_TAGS: [] }).trim();
  const sanitizedDescription = input.description
    ? DOMPurify.sanitize(input.description, {
        ALLOWED_TAGS: ['b', 'i', 'u', 'br', 'p', 'strong', 'em'],
        ALLOWED_ATTR: []
      }).trim()
    : null;

  const data: Prisma.DonationTypeCreateInput = {
    name: sanitizedName,
    description: sanitizedDescription,
    goalAmount: input.goalAmount != null ? new Prisma.Decimal(input.goalAmount.toFixed(2)) : null,
    startDate: parseDateOnly(input.startDate ?? null),
    endDate: parseDateOnly(input.endDate ?? null),
    isCampaign: true,
    isRecurringAllowed: false,
    isSystemType: false,
    isDeletable: true,
    isActive: input.isActive ?? true,
    Church: { connect: { id: churchId } },
  };

  const created = await prisma.donationType.create({ data, select: { id: true } });
  return { success: true, id: created.id };
}

export async function getFundraisingCampaignById(clerkOrgId: string, id: string): Promise<FundraisingCampaignFE | null> {
  const churchId = await getChurchUuid(clerkOrgId);
  const c = await prisma.donationType.findFirst({ where: { id, churchId, isCampaign: true } });
  if (!c) return null;

  const agg = await prisma.donationTransaction.aggregate({
    _sum: { amount: true },
    where: { churchId, status: 'succeeded', donationTypeId: id }
  });
  const raised = (agg._sum.amount ?? 0) / 100;
  const goal = c.goalAmount ? Number(c.goalAmount) : null;

  return {
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    goalAmount: c.goalAmount ? c.goalAmount.toString() : null,
    startDate: c.startDate ? c.startDate.toISOString().split('T')[0] : null,
    endDate: c.endDate ? c.endDate.toISOString().split('T')[0] : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    raised,
    progressPct: (goal && goal > 0) ? Math.min(100, Math.round((raised / goal) * 100)) : null,
    isActive: c.isActive,
  };
}

export async function updateFundraisingCampaign(clerkOrgId: string, id: string, input: Omit<UpsertInput, 'clerkOrgId'>): Promise<{ success: boolean }>{
  const churchId = await getChurchUuid(clerkOrgId);
  // Ensure ownership and check system type protection
  const existing = await prisma.donationType.findFirst({
    where: { id, churchId, isCampaign: true },
    select: { id: true, isSystemType: true, isDeletable: true }
  });
  if (!existing) throw new Error('Campaign not found');

  // Prevent modification of system types
  if (existing.isSystemType) {
    throw new Error('System donation types cannot be modified');
  }

  const parsed = upsertSchema.safeParse({ clerkOrgId, ...input });
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof FieldErrors;
      if (key) fieldErrors[key] = issue.message;
    }
    return { success: false as const, ...(fieldErrors && { fieldErrors }) };
  }

  // Sanitize inputs to prevent XSS
  const sanitizedName = input.name ? DOMPurify.sanitize(input.name, { ALLOWED_TAGS: [] }).trim() : undefined;
  const sanitizedDescription = input.description
    ? DOMPurify.sanitize(input.description, {
        ALLOWED_TAGS: ['b', 'i', 'u', 'br', 'p', 'strong', 'em'],
        ALLOWED_ATTR: []
      }).trim()
    : null;

  await prisma.donationType.update({
    where: { id },
    data: {
      name: sanitizedName,
      description: sanitizedDescription,
      goalAmount: input.goalAmount != null ? new Prisma.Decimal(input.goalAmount.toFixed(2)) : null,
      startDate: parseDateOnly(input.startDate ?? null),
      endDate: parseDateOnly(input.endDate ?? null),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      isCampaign: true,
      isRecurringAllowed: false,
      isSystemType: false,
      isDeletable: true,
    }
  });
  return { success: true };
}

export async function deleteFundraisingCampaign(clerkOrgId: string, id: string): Promise<{ success: boolean }>{
  const churchId = await getChurchUuid(clerkOrgId);
  const existing = await prisma.donationType.findFirst({
    where: { id, churchId, isCampaign: true },
    select: { id: true, isDeletable: true, isSystemType: true }
  });

  if (!existing) throw new Error('Campaign not found');

  // Prevent deletion of system types
  if (!existing.isDeletable || existing.isSystemType) {
    throw new Error('This donation type cannot be deleted');
  }

  // Use transaction for atomicity
  await prisma.$transaction(async (tx) => {
    const hasTransactions = await tx.donationTransaction.count({
      where: {
        churchId,
        donationTypeId: id,
      },
    });

    if (hasTransactions > 0) {
      // Soft delete if transactions exist
      await tx.donationType.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Hard delete if no transactions
      await tx.donationType.delete({ where: { id } });
    }
  });

  return { success: true };
}
