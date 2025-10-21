import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { BackgroundType } from "@prisma/client";

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  website?: string;
}

interface LandingConfigUpdateData {
  logoUrl?: string | null;
  logoPath?: string | null;
  description?: string | null;
  backgroundType?: BackgroundType;
  backgroundValue?: string | null;
  socialLinks?: SocialLinks;
  showDonateButton?: boolean;
  showConnectButton?: boolean;
  donateButtonText?: string;
  connectButtonText?: string;
}

// GET /api/settings/landing-config - Get landing page configuration
export async function GET() {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json(
        { error: "Unauthorized - No organization" },
        { status: 401 }
      );
    }

    const church = await prisma.church.findFirst({
      where: { clerkOrgId: orgId },
      select: {
        id: true,
        slug: true,
        name: true,
        LandingPageConfig: true
      }
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // If no config exists, return defaults
    if (!church.LandingPageConfig) {
      return NextResponse.json({
        config: {
          logoUrl: null,
          description: null,
          backgroundType: 'PRESET',
          backgroundValue: 'preset-1', // Default preset
          socialLinks: {},
          showDonateButton: false,
          showConnectButton: false,
          donateButtonText: 'Donate',
          connectButtonText: 'Connect',
        },
        churchSlug: church.slug,
        churchName: church.name,
        hasConfig: false
      });
    }

    return NextResponse.json({
      config: {
        logoUrl: church.LandingPageConfig.logoUrl,
        logoPath: church.LandingPageConfig.logoPath,
        description: church.LandingPageConfig.description,
        backgroundType: church.LandingPageConfig.backgroundType,
        backgroundValue: church.LandingPageConfig.backgroundValue,
        socialLinks: church.LandingPageConfig.socialLinks || {},
        showDonateButton: church.LandingPageConfig.showDonateButton,
        showConnectButton: church.LandingPageConfig.showConnectButton,
        donateButtonText: church.LandingPageConfig.donateButtonText,
        connectButtonText: church.LandingPageConfig.connectButtonText,
      },
      churchSlug: church.slug,
      churchName: church.name,
      hasConfig: true
    });
  } catch (error) {
    console.error("[GET /api/settings/landing-config] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/settings/landing-config - Update or create landing page configuration
export async function PUT(request: Request) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json(
        { error: "Unauthorized - No organization" },
        { status: 401 }
      );
    }

    const body: LandingConfigUpdateData = await request.json();

    // Validate background type if provided
    if (body.backgroundType && !['PRESET', 'GRADIENT', 'SOLID', 'IMAGE'].includes(body.backgroundType)) {
      return NextResponse.json(
        { error: "Invalid background type" },
        { status: 400 }
      );
    }

    const church = await prisma.church.findFirst({
      where: { clerkOrgId: orgId },
      select: { id: true }
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // Upsert the landing page config
    const config = await prisma.landingPageConfig.upsert({
      where: { churchId: church.id },
      create: {
        churchId: church.id,
        logoUrl: body.logoUrl ?? null,
        logoPath: body.logoPath ?? null,
        description: body.description ?? null,
        backgroundType: body.backgroundType ?? 'PRESET',
        backgroundValue: body.backgroundValue ?? 'preset-1',
        socialLinks: body.socialLinks || {},
        showDonateButton: body.showDonateButton ?? false,
        showConnectButton: body.showConnectButton ?? false,
        donateButtonText: body.donateButtonText ?? 'Donate',
        connectButtonText: body.connectButtonText ?? 'Connect',
      },
      update: {
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
        ...(body.logoPath !== undefined && { logoPath: body.logoPath }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.backgroundType !== undefined && { backgroundType: body.backgroundType }),
        ...(body.backgroundValue !== undefined && { backgroundValue: body.backgroundValue }),
        ...(body.socialLinks !== undefined && { socialLinks: body.socialLinks }),
        ...(body.showDonateButton !== undefined && { showDonateButton: body.showDonateButton }),
        ...(body.showConnectButton !== undefined && { showConnectButton: body.showConnectButton }),
        ...(body.donateButtonText !== undefined && { donateButtonText: body.donateButtonText }),
        ...(body.connectButtonText !== undefined && { connectButtonText: body.connectButtonText }),
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      config
    });
  } catch (error) {
    console.error("[PUT /api/settings/landing-config] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
