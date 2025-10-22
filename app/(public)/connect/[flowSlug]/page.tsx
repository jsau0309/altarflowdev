import type { Metadata } from "next";
import { notFound } from 'next/navigation';
import { getPublicFlowBySlug } from '@/lib/actions/flows.actions';
import ConnectForm from '@/components/connect/connect-form';
import { prisma } from '@/lib/db';
import { getBackgroundStyle } from '@/lib/landing-page/background-presets';

// Ensure page is dynamically rendered
export const dynamic = "force-dynamic";

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

  // TODO: Proper parsing and validation of configJson before passing to client
  let parsedConfig: any;
  try {
    if (typeof flowData.configJson === 'object' && flowData.configJson !== null) {
      // Assuming configJson is already an object from Prisma JSON type
      parsedConfig = flowData.configJson;
    } else {
      throw new Error("Invalid configJson format");
    }
  } catch (error) {
    console.error(`ConnectFlowPage: Error parsing configJson for slug ${flowSlug}:`, error);
    // Handle parsing error - maybe show a generic error message
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="bg-white text-gray-900 p-8 rounded-lg shadow-md max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Form Configuration</h1>
          <p className="text-gray-600">There was a problem loading the form settings. Please try again later.</p>
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
        {/* Render the new ConnectForm client component, passing required props */}
        <ConnectForm
          flowId={flowData.id}
          churchName={displayTitle}
          // Pass the parsed config safely
          config={parsedConfig}
        />
      </div>
    </div>
  );
}