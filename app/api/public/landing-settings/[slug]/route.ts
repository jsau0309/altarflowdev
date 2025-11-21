import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { logger } from '@/lib/logger';

// GET /api/public/landing-settings/[slug] - Get public landing page settings
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const church = await prisma.church.findUnique({
      where: { slug },
      select: { 
        id: true,
        name: true,
        settingsJson: true 
      }
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // Extract landing page settings from settingsJson
    const settings = (church.settingsJson as Record<string, Prisma.JsonValue>) || {};
    const landing = (settings.landing as Record<string, unknown>) || {};
    const landingSettings = {
      showDonateButton: (landing.showDonateButton as boolean | undefined) ?? true,
      showConnectButton: (landing.showConnectButton as boolean | undefined) ?? true,
      churchName: church.name
    };

    // Cache for 5 minutes
    return NextResponse.json(landingSettings, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error) {
    const { slug } = await params;
    logger.error(`[GET /api/public/landing-settings/${slug}] Error:`, { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}