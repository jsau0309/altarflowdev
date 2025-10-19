import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { DonationType } from '@prisma/client';
import { toDateOnly, getTodayUTC } from '@/lib/date-utils';
import * as Sentry from '@sentry/nextjs';
import { rateLimit } from '@/lib/rate-limit';

// Simple in-memory cache for active campaigns
// Reduces database load by caching results for 5 minutes
type PublicCampaign = {
  id: string;
  name: string;
  description: string | null;
  goalAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  raised: number;
  progressPct: number | null;
};

type CacheEntry = {
  data: PublicCampaign[];
  timestamp: number;
};

const campaignCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Cache cleanup: Remove expired entries every 10 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of campaignCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      campaignCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

// Clear interval on process termination to prevent memory leak
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    clearInterval(cleanupInterval);
  });
  process.on('SIGINT', () => {
    clearInterval(cleanupInterval);
  });
}

// Rate limiter: 30 requests per minute per IP
const publicCampaignLimiter = rateLimit({ windowMs: 60000, max: 30 });

// GET /api/public/campaigns/[churchSlug]/active
// Returns active campaigns for the church identified by slug, with basic progress metrics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ churchSlug: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await publicCampaignLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': '0',
          }
        }
      );
    }

    const { churchSlug } = await params;
    if (!churchSlug) {
      return NextResponse.json({ error: 'Missing church slug' }, { status: 400 });
    }

    const church = await prisma.church.findUnique({
      where: { slug: churchSlug },
      select: { id: true },
    });
    if (!church) {
      return NextResponse.json({ error: 'Church not found' }, { status: 404 });
    }

    // Check cache first
    const cacheKey = `church:${church.id}`;
    const cached = campaignCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // Cache hit - return cached data
      return NextResponse.json(cached.data, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=300', // 5 minutes
        }
      });
    }

    // Fetch campaign donation types for the church
    const campaigns = await prisma.donationType.findMany({
      where: { churchId: church.id, isCampaign: true },
      orderBy: { createdAt: 'desc' },
    });

    const todayUTC = getTodayUTC();

    // For each campaign, compute raised from DonationTransaction linked to donationTypeId
    const results = await Promise.all(
      campaigns.map(async (c: DonationType) => {
        const raisedCents = await prisma.donationTransaction.aggregate({
          _sum: { amount: true },
          where: {
            churchId: church.id,
            status: 'succeeded',
            donationTypeId: c.id,
          },
        });

        const raised = (raisedCents._sum.amount ?? 0) / 100;
        const goal = c.goalAmount ? Number(c.goalAmount) : null;

        // Use date-only comparisons (strip time component)
        const startDateOnly = toDateOnly(c.startDate);
        const endDateOnly = toDateOnly(c.endDate);
        const withinDates = (
          (!startDateOnly || startDateOnly <= todayUTC) &&
          (!endDateOnly || endDateOnly >= todayUTC)
        );
        const underGoal = goal === null || raised < goal;
        // Campaign is active only if: admin hasn't deactivated it AND within date range AND under goal
        const isActive = c.isActive && withinDates && underGoal;

        return {
          id: c.id,
          name: c.name,
          description: c.description,
          goalAmount: goal,
          startDate: c.startDate?.toISOString() ?? null,
          endDate: c.endDate?.toISOString() ?? null,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          isActive,
          raised,
          progressPct: (goal && goal > 0) ? Math.min(100, Math.round((raised / goal) * 100)) : null,
        };
      })
    );

    // Return only active campaigns
    const active = results.filter(r => r.isActive);

    // Store in cache
    campaignCache.set(cacheKey, {
      data: active,
      timestamp: Date.now(),
    });

    return NextResponse.json(active, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=300', // 5 minutes
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching active campaigns by slug:', errorMessage);

    // Capture error in Sentry with context
    Sentry.captureException(error, {
      contexts: {
        campaign: {
          operation: 'fetch_active_campaigns',
        }
      },
      tags: {
        'api.endpoint': '/api/public/campaigns/[churchSlug]/active',
        'error.type': 'campaign_fetch_error',
      }
    });

    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}
