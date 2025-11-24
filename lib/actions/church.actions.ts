"use server";

import { prisma } from '@/lib/db';
import { Church, DonationType } from "@prisma/client";
import { logger } from '@/lib/logger';

// Serialized version of DonationType for Client Components
type SerializedDonationType = Omit<DonationType, 'goalAmount'> & {
  goalAmount: string | null;
};

interface ChurchData {
  church: Church;
  donationTypes: SerializedDonationType[];
}

// In-memory cache for church data to reduce database load on public donation forms
// NOTE: This will be replaced by Upstash Redis in ALT-126 for production-grade caching
interface ChurchDataCache {
  data: ChurchData;
  timestamp: number;
}

const churchCache = new Map<string, ChurchDataCache>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds - short TTL for frequently changing data
const MAX_CACHE_ENTRIES = 100; // Limit cache size to prevent memory leak

/**
 * Evict expired or oldest entries if cache exceeds max size
 * LRU-style eviction: remove expired entries first, then oldest by timestamp
 */
function evictCacheIfNeeded() {
  const now = Date.now();
  
  // First pass: Remove expired entries
  for (const [slug, entry] of churchCache.entries()) {
    if (now - entry.timestamp >= CACHE_TTL_MS) {
      churchCache.delete(slug);
    }
  }
  
  // Second pass: If still over limit, remove oldest entries
  if (churchCache.size > MAX_CACHE_ENTRIES) {
    const entries = Array.from(churchCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp); // Sort by timestamp (oldest first)
    
    const toRemove = entries.slice(0, churchCache.size - MAX_CACHE_ENTRIES);
    toRemove.forEach(([slug]) => churchCache.delete(slug));
    
    logger.debug('Evicted old cache entries', {
      operation: 'actions.church.cache_eviction',
      entriesRemoved: toRemove.length,
      remainingEntries: churchCache.size,
    });
  }
}

export async function getChurchBySlug(slug: string): Promise<ChurchData | null> {
  // Check cache first
  const cached = churchCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    logger.debug('Returning cached church data', {
      operation: 'actions.church.cache_hit',
      slug,
      cacheAge: Date.now() - cached.timestamp,
    });
    return cached.data;
  }
  try {
    const church = await prisma.church.findUnique({
      where: { slug },
    });

    if (!church) {
      return null;
    }

    // Use UTC midnight for consistent date comparisons (database stores dates at UTC midnight)
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0); // Reset to UTC midnight for date-only comparison

    const donationTypes = await prisma.donationType.findMany({
      where: {
        churchId: church.id,
        isActive: true, // Only active donation types
        OR: [
          { isCampaign: false }, // System types (Tithe, Offering) always show
          { // For campaigns, check if they've started and haven't ended
            AND: [
              { isCampaign: true },
              { startDate: { lte: now } }, // Campaign has started
              {
                OR: [
                  { endDate: null }, // No end date (ongoing)
                  { endDate: { gte: now } } // End date hasn't passed
                ]
              }
            ]
          }
        ]
      },
      orderBy: [
        { isSystemType: 'desc' }, // System types first
        { name: 'asc' }
      ]
    });

    // Serialize Decimal fields to strings for Client Components
    const serializedDonationTypes: SerializedDonationType[] = donationTypes.map(dt => ({
      ...dt,
      goalAmount: dt.goalAmount ? dt.goalAmount.toString() : null,
    }));

    const churchData = { church, donationTypes: serializedDonationTypes };

    // Evict old entries before adding new one to prevent unbounded growth
    evictCacheIfNeeded();
    
    // Cache the result
    churchCache.set(slug, {
      data: churchData,
      timestamp: Date.now(),
    });

    logger.debug('Church data fetched and cached', {
      operation: 'actions.church.cache_miss',
      slug,
      donationTypesCount: donationTypes.length,
      cacheSize: churchCache.size,
    });

    return churchData;
  } catch (error) {
    logger.error(`Error fetching church by slug "${slug}":`, {
      operation: 'actions.church.error',
      slug,
      timestamp: new Date().toISOString(),
    }, error instanceof Error ? error : new Error(String(error)));
    // Optionally, rethrow or handle more gracefully
    return null;
  }
}

export async function getChurchById(id: string): Promise<Church | null> {
  try {
    const church = await prisma.church.findUnique({
      where: { id }
    });
    return church;
  } catch (error) {
    logger.error(`Error fetching church by ID "${id}":`, { operation: 'actions.error' }, error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getChurchByClerkOrgId(clerkOrgId: string): Promise<Church | null> {
  try {
    const church = await prisma.church.findUnique({
      where: { clerkOrgId } // Query by clerkOrgId
    });
    return church;
  } catch (error) {
    logger.error(`Error fetching church by Clerk Org ID "${clerkOrgId}":`, { operation: 'actions.error' }, error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
