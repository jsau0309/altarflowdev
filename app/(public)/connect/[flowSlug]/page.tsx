import type { Metadata } from "next";
import { notFound } from 'next/navigation';
import { getPublicFlowBySlug } from '@/lib/actions/flows.actions';
import ConnectForm from '@/components/connect/connect-form';
import { prisma } from '@/lib/db';
import { getBackgroundStyle } from '@/lib/landing-page/background-presets';
import type { ServiceTime, Ministry } from '@/components/member-form/types';
import { ConnectPageWrapper } from '@/components/public/connect-page-wrapper';

// Ensure page is dynamically rendered
export const dynamic = "force-dynamic";

// Type definition for connect form configuration
interface ConnectFormConfig {
  serviceTimes: ServiceTime[];
  ministries: Ministry[];
  settings: {
    enablePrayerRequests: boolean;
    enableReferralTracking: boolean;
    enableLifeStage: boolean;
  };
}

// Validation function to ensure config has the correct structure
function validateConnectFormConfig(config: unknown): ConnectFormConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Config must be an object');
  }

  const c = config as Record<string, unknown>;

  // Validate serviceTimes
  if (!Array.isArray(c.serviceTimes)) {
    throw new Error('serviceTimes must be an array');
  }

  // Validate ministries
  if (!Array.isArray(c.ministries)) {
    throw new Error('ministries must be an array');
  }

  // Validate settings
  if (!c.settings || typeof c.settings !== 'object') {
    throw new Error('settings must be an object');
  }

  const settings = c.settings as Record<string, unknown>;
  if (typeof settings.enablePrayerRequests !== 'boolean' ||
      typeof settings.enableReferralTracking !== 'boolean' ||
      typeof settings.enableLifeStage !== 'boolean') {
    throw new Error('settings must have boolean fields: enablePrayerRequests, enableReferralTracking, enableLifeStage');
  }

  // Return validated and typed config
  return {
    serviceTimes: c.serviceTimes as ServiceTime[],
    ministries: c.ministries as Ministry[],
    settings: {
      enablePrayerRequests: settings.enablePrayerRequests as boolean,
      enableReferralTracking: settings.enableReferralTracking as boolean,
      enableLifeStage: settings.enableLifeStage as boolean,
    }
  };
}

interface ConnectPageProps {
  params: Promise<{
    flowSlug: string;
  }>;
}

export async function generateMetadata(props: ConnectPageProps): Promise<Metadata> {
  const { flowSlug } = await props.params;

  if (!flowSlug) {
    return {
      title: "Connect Flow Not Found | Altarflow",
      description: "The requested connect flow could not be found.",
    };
  }

  const flowData = await getPublicFlowBySlug(flowSlug);

  if (!flowData) {
    return {
      title: "Connect Flow Not Found | Altarflow",
      description: "The requested connect flow could not be found or has been disabled.",
    };
  }

  // Get church information and landing config
  const church = await prisma.church.findUnique({
    where: { id: flowData.churchId },
    select: {
      id: true,
      name: true,
      LandingPageConfig: true
    }
  });

  const displayTitle = church?.LandingPageConfig?.customTitle || church?.name || flowData.churchName;

  // Use flow name or create a generic title
  const pageTitle = flowData.name ? `${flowData.name} - ${displayTitle}` : `Connect with ${displayTitle}`;
  const pageDescription = `Stay connected with ${displayTitle}. Fill out this form to get in touch with us.`;

  // Build absolute URLs - use church slug for OG image (same Linktree-style image as landing page)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://altarflow.com';
  const churchSlug = await prisma.church.findUnique({
    where: { id: flowData.churchId },
    select: { slug: true }
  });
  const ogImageUrl = churchSlug?.slug ? `${baseUrl}/api/og/${churchSlug.slug}` : `${baseUrl}/images/Altarflow.svg`;

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      type: 'website',
      url: `${baseUrl}/connect/${flowSlug}`,
      siteName: 'Altarflow',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${displayTitle} - Connect on Altarflow`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
      images: [ogImageUrl],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ConnectFlowPage({ params }: ConnectPageProps) {
  const { flowSlug } = await params;

  if (!flowSlug) {
    console.log("ConnectFlowPage: No flowSlug in params.");
    notFound(); // Slug is required
  }

  const flowData = await getPublicFlowBySlug(flowSlug);

  // Handle flow not found or disabled
  if (!flowData) {
    console.log(`ConnectFlowPage: Flow not found or disabled for slug: ${flowSlug}`);
    notFound();
  }

  // Get church information and landing config
  const church = await prisma.church.findUnique({
    where: { id: flowData.churchId },
    select: {
      id: true,
      name: true,
      LandingPageConfig: true
    }
  });

  // Get background style from landing config or use default
  const backgroundStyle = church?.LandingPageConfig
    ? getBackgroundStyle(church.LandingPageConfig.backgroundType, church.LandingPageConfig.backgroundValue)
    : 'linear-gradient(90deg, hsla(217, 91%, 60%, 1) 0%, hsla(0, 0%, 75%, 1) 99%)';

  // Get display title - use customTitle from landing config or fall back to church name
  const displayTitle = church?.LandingPageConfig?.customTitle || church?.name || flowData.churchName;

  // Validate and parse configJson with proper type checking
  let parsedConfig: ConnectFormConfig;
  try {
    // Validate the config structure and types
    parsedConfig = validateConnectFormConfig(flowData.configJson);
  } catch (error) {
    console.error(`ConnectFlowPage: Invalid configJson for slug ${flowSlug}:`, error);
    // Show specific error message based on validation failure
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="bg-white text-gray-900 p-8 rounded-lg shadow-md max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Form Configuration</h1>
          <p className="text-gray-600 mb-4">The form configuration is invalid or corrupted.</p>
          <p className="text-sm text-gray-500">Technical details: {errorMessage}</p>
          <p className="text-sm text-gray-500 mt-2">Please contact the church administrator to fix this issue.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 flex flex-col justify-center sm:py-12"
      style={{ background: backgroundStyle }}
    >
      <div className="container mx-auto">
        <ConnectPageWrapper>
          <ConnectForm
            flowId={flowData.id}
            churchName={displayTitle}
            config={parsedConfig}
          />
        </ConnectPageWrapper>
      </div>
    </div>
  );
}