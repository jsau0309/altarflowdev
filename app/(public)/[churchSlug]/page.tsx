import type { Metadata } from "next";
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getChurchBySlug } from '@/lib/actions/church.actions';
import { getBackgroundStyle } from '@/lib/landing-page/background-presets';
import { prisma } from '@/lib/db';
import { Facebook, Instagram, Twitter, Youtube, Globe } from 'lucide-react';

interface LandingPageProps {
  params: Promise<{
    churchSlug: string;
  }>;
}

export async function generateMetadata(props: LandingPageProps): Promise<Metadata> {
  const { churchSlug } = await props.params;
  const churchData = await getChurchBySlug(churchSlug);

  if (!churchData) {
    return {
      title: "Church Not Found | Altarflow",
      description: "The requested church could not be found.",
    };
  }

  return {
    title: `${churchData.church.name} | Altarflow`,
    description: `Connect with ${churchData.church.name}`,
  };
}

export default async function LandingPage(props: LandingPageProps) {
  const { churchSlug } = await props.params;
  const churchData = await getChurchBySlug(churchSlug);

  if (!churchData) {
    notFound();
  }

  const { church } = churchData;

  // Get landing page configuration
  const landingConfig = await prisma.landingPageConfig.findUnique({
    where: { churchId: church.id }
  });

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
      slug: true
    },
    take: 1
  });

  const hasActiveFlow = activeFlows.length > 0;
  const connectSlug = hasActiveFlow ? activeFlows[0].slug : null;

  // Determine what to show based on config or defaults
  const showDonateButton = (landingConfig?.showDonateButton ?? false) && hasActiveStripeAccount;
  const showConnectButton = (landingConfig?.showConnectButton ?? false) && hasActiveFlow;

  const backgroundStyle = landingConfig
    ? getBackgroundStyle(landingConfig.backgroundType, landingConfig.backgroundValue)
    : 'linear-gradient(90deg, hsla(217, 91%, 60%, 1) 0%, hsla(0, 0%, 75%, 1) 99%)';

  const socialLinks = (landingConfig?.socialLinks as any) || {};
  const logoUrl = landingConfig?.logoUrl || '/images/Altarflow.svg';
  const description = landingConfig?.description;

  const socialIcons = [
    { key: 'facebook', icon: Facebook, url: socialLinks.facebook },
    { key: 'instagram', icon: Instagram, url: socialLinks.instagram },
    { key: 'twitter', icon: Twitter, url: socialLinks.twitter },
    { key: 'youtube', icon: Youtube, url: socialLinks.youtube },
    { key: 'website', icon: Globe, url: socialLinks.website },
  ].filter(social => social.url);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 text-white"
      style={{ background: backgroundStyle }}
    >
      <div className="bg-white text-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md text-center">
        {/* Logo */}
        <div className="mb-6">
          <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden bg-gray-100">
            <Image
              src={logoUrl}
              alt={`${church.name} logo`}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Church Name */}
        <h1 className="text-3xl font-bold mb-4 text-gray-900">
          {church.name}
        </h1>

        {/* Description */}
        {description && (
          <p className="text-gray-600 mb-6 leading-relaxed">
            {description}
          </p>
        )}

        {/* Social Links */}
        {socialIcons.length > 0 && (
          <div className="flex justify-center gap-4 mb-6">
            {socialIcons.map(({ key, icon: Icon, url }) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label={key}
              >
                <Icon className="h-5 w-5 text-gray-700" />
              </a>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {showDonateButton && (
            <Link
              href={`/donate/${churchSlug}`}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-lg transition duration-150 ease-in-out"
            >
              {landingConfig?.donateButtonText || 'Donate'}
            </Link>
          )}

          {showConnectButton && connectSlug && (
            <Link
              href={`/connect/${connectSlug}`}
              className="block w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg text-lg transition duration-150 ease-in-out"
            >
              {landingConfig?.connectButtonText || 'Connect'}
            </Link>
          )}

          {!showDonateButton && !showConnectButton && (
            <p className="text-gray-500 py-4">
              Welcome! Check back soon for more ways to connect.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs py-4 text-white text-opacity-80 mt-4">
        {new Date().getFullYear()} Altarflow. All rights reserved.
      </footer>
    </div>
  );
}
