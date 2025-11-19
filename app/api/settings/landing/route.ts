import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

interface LandingPageSettings {
  showDonateButton: boolean;
  showConnectButton: boolean;
}

// GET /api/settings/landing - Get landing page settings
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
    const landingSettings: LandingPageSettings = {
      showDonateButton: (landing.showDonateButton as boolean | undefined) ?? false,
      showConnectButton: (landing.showConnectButton as boolean | undefined) ?? false,
    };

    return NextResponse.json({
      settings: landingSettings,
      churchSlug: church.slug
    });
  } catch (error) {
    console.error("[GET /api/settings/landing] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/settings/landing - Update landing page settings
export async function PUT(request: Request) {
  try {
    const { orgId } = await auth();
    
    if (!orgId) {
      return NextResponse.json(
        { error: "Unauthorized - No organization" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { showDonateButton, showConnectButton } = body;

    // Validate input
    if (typeof showDonateButton !== "boolean" || typeof showConnectButton !== "boolean") {
      return NextResponse.json(
        { error: "Invalid settings format" },
        { status: 400 }
      );
    }

    // Both buttons can be disabled - this is valid for new churches
    // or churches that want to temporarily disable the landing page features

    const church = await prisma.church.findFirst({
      where: { clerkOrgId: orgId },
      select: { id: true, settingsJson: true }
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // Update settings
    const currentSettings = (church.settingsJson as Record<string, Prisma.JsonValue>) || {};
    const updatedSettings = {
      ...currentSettings,
      landing: {
        showDonateButton,
        showConnectButton,
        updatedAt: new Date().toISOString()
      }
    };

    await prisma.church.update({
      where: { id: church.id },
      data: { settingsJson: updatedSettings }
    });

    return NextResponse.json({
      success: true,
      settings: {
        showDonateButton,
        showConnectButton
      }
    });
  } catch (error) {
    console.error("[PUT /api/settings/landing] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}