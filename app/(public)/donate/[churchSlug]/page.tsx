import type { Metadata } from "next";
import { notFound } from 'next/navigation';
import DonationForm from "@/components/donation/donation-form";
import { getChurchBySlug } from '@/lib/actions/church.actions';
import { prisma } from '@/lib/db';
import { getBackgroundStyle } from '@/lib/landing-page/background-presets';
import { DonationPageWrapper, DonationNotAvailable } from '@/components/public/donation-page-wrapper';

interface DonatePageProps {
  params: Promise<{ // params itself is a Promise
    churchSlug: string;
  }>;
}

export async function generateMetadata(props: DonatePageProps): Promise<Metadata> {
  const { churchSlug } = await props.params; // Await props.params
  const churchData = await getChurchBySlug(churchSlug);

  if (!churchData) {
    return {
      title: "Church Not Found | Altarflow",
      description: "The requested church could not be found.",
    };
  }

  const { church } = churchData;

  // Get landing page configuration for logo and branding
  const landingConfig = await prisma.landingPageConfig.findUnique({
    where: { churchId: church.id }
  });

  const displayTitle = landingConfig?.customTitle || church.name;
  const churchDescription = `Support ${displayTitle} with your generous donation. Give securely online to help our ministry and mission.`;

  // Build absolute URLs
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://altarflow.com';
  const ogImageUrl = `${baseUrl}/api/og/${churchSlug}`; // Use same Linktree-style OG image

  return {
    title: `Donate to ${displayTitle}`,
    description: churchDescription,
    openGraph: {
      title: `Donate to ${displayTitle}`,
      description: churchDescription,
      type: 'website',
      url: `${baseUrl}/donate/${churchSlug}`,
      siteName: 'Altarflow',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${displayTitle} - Donate on Altarflow`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Donate to ${displayTitle}`,
      description: churchDescription,
      images: [ogImageUrl],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function DonatePage(props: DonatePageProps) {
  const { churchSlug } = await props.params; // Await props.params
  const churchData = await getChurchBySlug(churchSlug);

  if (!churchData) {
    notFound();
  }

  const { church, donationTypes } = churchData;

  // Get landing page configuration for branding
  const landingConfig = await prisma.landingPageConfig.findUnique({
    where: { churchId: church.id }
  });

  // Check if church has a Stripe account and if it's active
  const stripeAccount = church.clerkOrgId
    ? await prisma.stripeConnectAccount.findUnique({
        where: { churchId: church.clerkOrgId }
      })
    : null;

  const hasActiveStripeAccount = stripeAccount &&
    stripeAccount.chargesEnabled &&
    stripeAccount.payoutsEnabled &&
    stripeAccount.detailsSubmitted;

  // Get landing page settings to check if donations are enabled
  // Check new button system first, fall back to legacy field
  // Import the safe parser at the top of the file
  const { safeParseButtons } = await import('@/lib/validation/button-validation');
  const buttons = safeParseButtons(landingConfig?.buttons);
  const donateButton = buttons.find(btn => btn.id === 'donate');
  const donationsEnabled = donateButton ? donateButton.enabled : (landingConfig?.showDonateButton ?? true);

  // Get background style from landing config or use default
  const backgroundStyle = landingConfig
    ? getBackgroundStyle(landingConfig.backgroundType, landingConfig.backgroundValue)
    : 'linear-gradient(90deg, hsla(217, 91%, 60%, 1) 0%, hsla(0, 0%, 75%, 1) 99%)';

  // Get church logo from landing config or use default
  const logoUrl = landingConfig?.logoUrl || '/images/Altarflow.svg';

  // Get display title - use customTitle from landing config or fall back to church name
  const displayTitle = landingConfig?.customTitle || church.name;

  // If donations are disabled or no active Stripe account, show error message
  if (!donationsEnabled || !hasActiveStripeAccount) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: backgroundStyle }}>
        <div className="w-full max-w-md space-y-8">
          <DonationNotAvailable
            logoUrl={logoUrl}
            displayTitle={displayTitle}
            hasActiveStripeAccount={!!hasActiveStripeAccount}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: backgroundStyle }}>
      <div className="w-full max-w-md space-y-8">
        <DonationPageWrapper
          logoUrl={logoUrl}
          displayTitle={displayTitle}
        >
          <DonationForm
            churchId={church.id}
            churchName={church.name}
            donationTypes={donationTypes}
            churchSlug={churchSlug}
          />
        </DonationPageWrapper>
      </div>
    </div>
  );
}
