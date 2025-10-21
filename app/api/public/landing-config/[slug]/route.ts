import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/public/landing-config/[slug] - Get public landing page configuration
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
        clerkOrgId: true,
        LandingPageConfig: true,
        settingsJson: true,
      }
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // Check Stripe account status
    const stripeAccount = church.clerkOrgId
      ? await prisma.stripeConnectAccount.findUnique({
          where: { churchId: church.clerkOrgId }
        })
      : null;

    const hasActiveStripeAccount = stripeAccount &&
      stripeAccount.chargesEnabled &&
      stripeAccount.payoutsEnabled &&
      stripeAccount.detailsSubmitted;

    // Check for active flows
    const activeFlows = await prisma.flow.findMany({
      where: {
        churchId: church.id,
        status: 'PUBLISHED'
      },
      select: {
        id: true,
        slug: true,
        flowType: true
      },
      take: 1
    });

    const hasActiveFlow = activeFlows.length > 0;
    const connectSlug = hasActiveFlow ? activeFlows[0].slug : null;

    // If landing page config exists, use it
    if (church.LandingPageConfig) {
      const config = church.LandingPageConfig;

      return NextResponse.json({
        churchName: church.name,
        logoUrl: config.logoUrl,
        description: config.description,
        backgroundType: config.backgroundType,
        backgroundValue: config.backgroundValue,
        socialLinks: config.socialLinks || {},
        showDonateButton: config.showDonateButton && hasActiveStripeAccount,
        showConnectButton: config.showConnectButton && hasActiveFlow,
        donateButtonText: config.donateButtonText,
        connectButtonText: config.connectButtonText,
        connectSlug,
        hasStripeAccount: hasActiveStripeAccount,
        hasFlow: hasActiveFlow,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      });
    }

    // Fallback to old settingsJson for backward compatibility
    const settings = church.settingsJson as any || {};
    const landingSettings = settings.landing || {};

    return NextResponse.json({
      churchName: church.name,
      logoUrl: null,
      description: null,
      backgroundType: 'PRESET',
      backgroundValue: 'preset-1',
      socialLinks: {},
      showDonateButton: (landingSettings.showDonateButton ?? true) && hasActiveStripeAccount,
      showConnectButton: (landingSettings.showConnectButton ?? true) && hasActiveFlow,
      donateButtonText: 'Donate',
      connectButtonText: 'Connect',
      connectSlug,
      hasStripeAccount: hasActiveStripeAccount,
      hasFlow: hasActiveFlow,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error) {
    const { slug } = await params;
    console.error(`[GET /api/public/landing-config/${slug}] Error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
