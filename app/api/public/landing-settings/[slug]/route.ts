import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/public/landing-settings/[slug] - Get public landing page settings
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const church = await prisma.church.findUnique({
      where: { slug: params.slug },
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
    const settings = church.settingsJson as any || {};
    const landingSettings = {
      showDonateButton: settings.landing?.showDonateButton ?? true,
      showConnectButton: settings.landing?.showConnectButton ?? true,
      churchName: church.name
    };

    // Cache for 5 minutes
    return NextResponse.json(landingSettings, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error) {
    console.error(`[GET /api/public/landing-settings/${params.slug}] Error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}