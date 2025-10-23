import type { Metadata } from "next";
import { notFound } from 'next/navigation';
import Image from 'next/image';
import DonationForm from "@/components/donation/donation-form";
import { getChurchBySlug } from '@/lib/actions/church.actions';
import { Lock } from 'lucide-react'; // Added for Secure Transaction icon
import { prisma } from '@/lib/db';
import { getBackgroundStyle } from '@/lib/landing-page/background-presets';

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
          <div className="mt-8 flex flex-col items-center space-y-4 bg-white px-6 py-8 rounded-lg shadow-md">
            <div className="relative w-48 h-24">
              <Image
                src={logoUrl}
                alt={`${displayTitle} logo`}
                fill
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 text-center">
              {displayTitle}
            </h1>
            <p className="text-gray-600 text-center">
              {!hasActiveStripeAccount
                ? "Donations are not available at this time. Please contact the church for more information."
                : "This donation page has been temporarily disabled."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: backgroundStyle }}>
      <div className="w-full max-w-md space-y-8">
        {/* New Header Structure */}
        <div className="mt-8 flex flex-col items-center space-y-4 bg-white px-6 py-8 rounded-lg shadow-md">
          <div className="relative w-48 h-24">
            <Image
              src={logoUrl}
              alt={`${displayTitle} logo`}
              fill
              className="object-contain"
              priority
            />
          </div>
          {/* Church Name Display */}
          <h1 className="text-2xl font-bold text-gray-900 text-center">
            {displayTitle}
          </h1>
        </div>

        {/* Donation Form Card */}
        <div className="bg-white px-6 py-8 rounded-lg shadow-md">
          <DonationForm
            churchId={church.id}
            churchName={church.name} // churchName is still passed to the form if needed internally
            donationTypes={donationTypes}
            churchSlug={churchSlug}
          />
        </div>

        {/* Footer Sections */}
        <div className="w-full max-w-md space-y-3 text-center bg-white px-6 py-6 rounded-lg shadow-md">
          {/* Terms and Privacy */}
          <p className="text-xs text-gray-500">
            By continuing, you agree to Altarflow&apos;s{' '}
            <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="font-medium underline hover:text-gray-700">Terms of Service</a>
            {' and '}
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-medium underline hover:text-gray-700">Privacy Policy</a>.
          </p>

          {/* Powered by Altarflow */}
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
            <span>Powered by</span>
            <Image
              src="/images/Altarflow.svg"
              alt="Altarflow Logo"
              width={70} // Adjusted size for footer
              height={18} // Adjusted size for footer
            />
          </div>

          {/* Secure Transaction */}
          <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
            <Lock className="h-3 w-3" />
            <span>Secure Transaction</span>
          </div>
        </div>

      </div>
    </div>
  );
}
