import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { BackgroundType } from "@prisma/client";
import { validateAndSanitizeUrl, validateUrlObject } from "@/lib/validation/url-validation";
import { validateDescription, validateCustomTitle } from "@/lib/validation/input-validation";
import { validateButtons, safeParseButtons } from "@/lib/validation/button-validation";

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
  customTitle?: string | null;
  titleFont?: string;
  titleSize?: string;
  titleColor?: string;
  backgroundType?: BackgroundType;
  backgroundValue?: string | null;
  socialLinks?: SocialLinks;
  showDonateButton?: boolean;
  showConnectButton?: boolean;
  donateButtonText?: string;
  connectButtonText?: string;
  buttonBackgroundColor?: string;
  buttonTextColor?: string;
  buttons?: any; // JSON array of button configurations
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
        clerkOrgId: true,
        LandingPageConfig: true
      }
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // Check Stripe Connect status
    const stripeAccount = church.clerkOrgId
      ? await prisma.stripeConnectAccount.findUnique({
          where: { churchId: church.clerkOrgId }
        })
      : null;

    const hasStripeAccount = stripeAccount &&
      stripeAccount.chargesEnabled &&
      stripeAccount.payoutsEnabled &&
      stripeAccount.detailsSubmitted;

    // Check for active flows
    const activeFlows = await prisma.flow.findMany({
      where: {
        churchId: church.id,
        isEnabled: true
      },
      take: 1
    });

    const hasActiveFlow = activeFlows.length > 0;

    // If no config exists, return defaults with preset buttons
    if (!church.LandingPageConfig) {
      return NextResponse.json({
        config: {
          logoUrl: null,
          description: null,
          customTitle: null,
          titleFont: 'Modern',
          titleSize: 'Large',
          titleColor: '#1F2937',
          backgroundType: 'PRESET',
          backgroundValue: 'preset-1', // Default preset
          socialLinks: {},
          showDonateButton: false,
          showConnectButton: false,
          donateButtonText: 'Donate',
          connectButtonText: 'Connect',
          buttonBackgroundColor: '#FFFFFF',
          buttonTextColor: '#1F2937',
          buttons: [
            {
              id: 'donate',
              type: 'preset',
              label: 'Donate',
              enabled: true,
              order: 0,
            },
            {
              id: 'connect',
              type: 'preset',
              label: 'Connect',
              enabled: true,
              order: 1,
            },
          ],
        },
        churchSlug: church.slug,
        churchName: church.name,
        hasStripeAccount: !!hasStripeAccount,
        hasActiveFlow: hasActiveFlow,
        hasConfig: false
      });
    }

    // Ensure preset buttons always exist with English defaults - using safe parsing
    let buttons = safeParseButtons(church.LandingPageConfig.buttons);

    if (buttons.length === 0) {
      // Initialize with default English labels
      buttons = [
        {
          id: 'donate',
          type: 'preset',
          label: 'Donate',
          enabled: true,
          order: 0,
        },
        {
          id: 'connect',
          type: 'preset',
          label: 'Connect',
          enabled: true,
          order: 1,
        },
      ];
    } else {
      // Ensure donate and connect buttons exist
      const hasDonate = buttons.some(btn => btn.id === 'donate');
      const hasConnect = buttons.some(btn => btn.id === 'connect');

      if (!hasDonate) {
        buttons.push({
          id: 'donate',
          type: 'preset',
          label: 'Donate',
          enabled: true,
          order: buttons.length,
        });
      }

      if (!hasConnect) {
        buttons.push({
          id: 'connect',
          type: 'preset',
          label: 'Connect',
          enabled: true,
          order: buttons.length,
        });
      }

      buttons.sort((a, b) => a.order - b.order);
    }

    return NextResponse.json({
      config: {
        logoUrl: church.LandingPageConfig.logoUrl ?? null,
        logoPath: church.LandingPageConfig.logoPath ?? null,
        description: church.LandingPageConfig.description ?? null,
        customTitle: church.LandingPageConfig.customTitle ?? null,
        titleFont: church.LandingPageConfig.titleFont ?? 'Modern',
        titleSize: church.LandingPageConfig.titleSize ?? 'Large',
        titleColor: church.LandingPageConfig.titleColor ?? '#1F2937',
        backgroundType: church.LandingPageConfig.backgroundType ?? 'PRESET',
        backgroundValue: church.LandingPageConfig.backgroundValue ?? 'preset-1',
        socialLinks: church.LandingPageConfig.socialLinks ?? {},
        showDonateButton: church.LandingPageConfig.showDonateButton ?? false,
        showConnectButton: church.LandingPageConfig.showConnectButton ?? false,
        donateButtonText: church.LandingPageConfig.donateButtonText ?? 'Donate',
        connectButtonText: church.LandingPageConfig.connectButtonText ?? 'Connect',
        buttonBackgroundColor: church.LandingPageConfig.buttonBackgroundColor ?? '#FFFFFF',
        buttonTextColor: church.LandingPageConfig.buttonTextColor ?? '#1F2937',
        buttons: buttons,
      },
      churchSlug: church.slug,
      churchName: church.name,
      hasStripeAccount: !!hasStripeAccount,
      hasActiveFlow: hasActiveFlow,
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

    // Validate description length
    if (body.description) {
      const descValidation = validateDescription(body.description);
      if (!descValidation.isValid) {
        return NextResponse.json(
          { error: descValidation.error },
          { status: 400 }
        );
      }
    }

    // Validate custom title length
    if (body.customTitle) {
      const titleValidation = validateCustomTitle(body.customTitle);
      if (!titleValidation.isValid) {
        return NextResponse.json(
          { error: titleValidation.error },
          { status: 400 }
        );
      }
    }

    // Validate and sanitize social links URLs
    if (body.socialLinks) {
      const validatedLinks = validateUrlObject(body.socialLinks as Record<string, string | null | undefined>);

      // Check if any URLs were invalid
      for (const [platform, originalUrl] of Object.entries(body.socialLinks)) {
        if (originalUrl && !validatedLinks[platform]) {
          return NextResponse.json(
            { error: `Invalid URL for ${platform}. Only http:// and https:// protocols are allowed.` },
            { status: 400 }
          );
        }
      }

      // Use validated URLs
      body.socialLinks = validatedLinks as SocialLinks;
    }

    // Validate buttons if provided
    if (body.buttons) {
      const buttonValidation = validateButtons(body.buttons);
      if (!buttonValidation.isValid) {
        return NextResponse.json(
          { error: `Button validation failed: ${buttonValidation.errors.join(', ')}` },
          { status: 400 }
        );
      }

      // Validate custom button URLs
      for (const button of buttonValidation.validButtons) {
        if (button.type === 'custom' && button.url) {
          const validUrl = validateAndSanitizeUrl(button.url);
          if (!validUrl) {
            return NextResponse.json(
              { error: `Invalid URL for button "${button.label}". Only http:// and https:// protocols are allowed.` },
              { status: 400 }
            );
          }
          button.url = validUrl;
        }
      }

      body.buttons = buttonValidation.validButtons;
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
        customTitle: body.customTitle ?? null,
        titleFont: body.titleFont ?? 'Modern',
        titleSize: body.titleSize ?? 'Large',
        titleColor: body.titleColor ?? '#1F2937',
        backgroundType: body.backgroundType ?? 'PRESET',
        backgroundValue: body.backgroundValue ?? 'preset-1',
        socialLinks: (body.socialLinks || {}) as any,
        showDonateButton: body.showDonateButton ?? false,
        showConnectButton: body.showConnectButton ?? false,
        donateButtonText: body.donateButtonText ?? 'Donate',
        connectButtonText: body.connectButtonText ?? 'Connect',
        buttonBackgroundColor: body.buttonBackgroundColor ?? '#FFFFFF',
        buttonTextColor: body.buttonTextColor ?? '#1F2937',
        buttons: (body.buttons || [
          {
            id: 'donate',
            type: 'preset',
            label: 'Donate',
            enabled: true,
            order: 0,
          },
          {
            id: 'connect',
            type: 'preset',
            label: 'Connect',
            enabled: true,
            order: 1,
          },
        ]) as any,
      },
      update: {
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
        ...(body.logoPath !== undefined && { logoPath: body.logoPath }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.customTitle !== undefined && { customTitle: body.customTitle }),
        ...(body.titleFont !== undefined && { titleFont: body.titleFont }),
        ...(body.titleSize !== undefined && { titleSize: body.titleSize }),
        ...(body.titleColor !== undefined && { titleColor: body.titleColor }),
        ...(body.backgroundType !== undefined && { backgroundType: body.backgroundType }),
        ...(body.backgroundValue !== undefined && { backgroundValue: body.backgroundValue }),
        ...(body.socialLinks !== undefined && { socialLinks: body.socialLinks as any }),
        ...(body.showDonateButton !== undefined && { showDonateButton: body.showDonateButton }),
        ...(body.showConnectButton !== undefined && { showConnectButton: body.showConnectButton }),
        ...(body.donateButtonText !== undefined && { donateButtonText: body.donateButtonText }),
        ...(body.connectButtonText !== undefined && { connectButtonText: body.connectButtonText }),
        ...(body.buttonBackgroundColor !== undefined && { buttonBackgroundColor: body.buttonBackgroundColor }),
        ...(body.buttonTextColor !== undefined && { buttonTextColor: body.buttonTextColor }),
        ...(body.buttons !== undefined && { buttons: body.buttons as any }),
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
