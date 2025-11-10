import type { Metadata } from "next";
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getChurchBySlug } from '@/lib/actions/church.actions';
import { getBackgroundStyle } from '@/lib/landing-page/background-presets';
import { getTitleFont, getTitleSizeClass } from '@/lib/landing-page/font-config';
import { prisma } from '@/lib/db';
import { Facebook, Instagram, Twitter, Youtube, Globe, User } from 'lucide-react';
import { EventsSection } from '@/components/landing/events-section';

// Type definition for social media links
interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  website?: string;
}

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

  const { church } = churchData;

  // Get landing page configuration for custom metadata
  const landingConfig = await prisma.landingPageConfig.findUnique({
    where: { churchId: church.id }
  });

  // Use custom title or fall back to church name
  const displayTitle = landingConfig?.customTitle || church.name;

  // Use custom description or create a default one
  const description = landingConfig?.description ||
    `Connect with ${church.name}. Visit our landing page to learn more about our community.`;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://altarflow.com';
  const pageUrl = `${baseUrl}/${churchSlug}`;

  // Generate dynamic OG image URL (Linktree-style preview card)
  const ogImageUrl = `${baseUrl}/api/og/${churchSlug}`;

  return {
    title: displayTitle,
    description: description,
    openGraph: {
      title: displayTitle,
      description: description,
      url: pageUrl,
      siteName: 'Altarflow',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${displayTitle} - Share on Altarflow`,
        }
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: displayTitle,
      description: description,
      images: [ogImageUrl],
    },
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
      isEnabled: true
    },
    select: {
      slug: true
    },
    take: 1
  });

  const hasActiveFlow = activeFlows.length > 0;
  const connectSlug = hasActiveFlow ? activeFlows[0].slug : null;

  // Get published events
  const now = new Date();
  const allEvents = await prisma.event.findMany({
    where: {
      churchId: church.id,
      isPublished: true
    },
    orderBy: {
      eventDate: 'asc'
    }
  });

  // Split events into upcoming and past
  // Convert Date objects to ISO strings for client component compatibility
  const upcomingEvents = allEvents
    .filter(event => event.eventDate >= now)
    .map(event => ({
      id: event.id,
      churchId: event.churchId,
      title: event.title,
      description: event.description,
      eventDate: event.eventDate.toISOString(),
      eventTime: event.eventTime,
      address: event.address,
      isPublished: event.isPublished,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString()
    }));

  const pastEvents = allEvents
    .filter(event => event.eventDate < now)
    .reverse()
    .map(event => ({
      id: event.id,
      churchId: event.churchId,
      title: event.title,
      description: event.description,
      eventDate: event.eventDate.toISOString(),
      eventTime: event.eventTime,
      address: event.address,
      isPublished: event.isPublished,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString()
    }));

  // Get button configuration
  const buttonBackgroundColor = landingConfig?.buttonBackgroundColor || '#FFFFFF';
  const buttonTextColor = landingConfig?.buttonTextColor || '#1F2937';
  const eventTitleColor = landingConfig?.eventTitleColor || '#FFFFFF';
  const eventDetailsColor = landingConfig?.eventDetailsColor || '#FFFFFF';
  const { safeParseButtons } = await import('@/lib/validation/button-validation');
  let buttonsConfig = safeParseButtons(landingConfig?.buttons);

  // MIGRATION: Fall back to legacy button flags if new button system is empty
  // This preserves existing landing pages that were created before the button manager feature
  if (buttonsConfig.length === 0 && landingConfig) {
    const legacyButtons = [];

    // Add donate button if legacy flag is true
    if (landingConfig.showDonateButton) {
      legacyButtons.push({
        id: 'donate',
        type: 'preset' as const,
        label: landingConfig.donateButtonText || 'Donate',
        enabled: true,
        order: 0
      });
    }

    // Add connect button if legacy flag is true
    if (landingConfig.showConnectButton) {
      legacyButtons.push({
        id: 'connect',
        type: 'preset' as const,
        label: landingConfig.connectButtonText || 'Connect',
        enabled: true,
        order: 1
      });
    }

    buttonsConfig = legacyButtons;
  }

  // Process buttons: filter enabled, sort by order, and add URLs
  const visibleButtons = buttonsConfig
    .filter(btn => btn.enabled)
    .sort((a, b) => a.order - b.order)
    .map(btn => {
      if (btn.type === 'preset') {
        if (btn.id === 'donate' && hasActiveStripeAccount) {
          return {
            ...btn,
            url: `/donate/${churchSlug}`,
            available: true
          };
        } else if (btn.id === 'connect' && hasActiveFlow) {
          return {
            ...btn,
            url: `/connect/${connectSlug}`,
            available: true
          };
        }
        return { ...btn, available: false };
      } else {
        // Custom buttons always available if they have a URL
        return {
          ...btn,
          available: !!btn.url
        };
      }
    })
    .filter(btn => btn.available);

  const backgroundStyle = landingConfig
    ? getBackgroundStyle(landingConfig.backgroundType, landingConfig.backgroundValue)
    : 'linear-gradient(90deg, hsla(217, 91%, 60%, 1) 0%, hsla(0, 0%, 75%, 1) 99%)';

  // Parse social links with type safety
  const socialLinks: SocialLinks = (landingConfig?.socialLinks as SocialLinks) || {};
  const logoUrl = landingConfig?.logoUrl || null;
  const description = landingConfig?.description;
  const customTitle = landingConfig?.customTitle;
  const titleFont = landingConfig?.titleFont || 'Modern';
  const titleSize = landingConfig?.titleSize || 'Large';
  const titleColor = landingConfig?.titleColor || '#FFFFFF';

  const titleFontFamily = getTitleFont(titleFont);
  const titleSizeClass = getTitleSizeClass(titleSize);
  const displayTitle = customTitle || church.name;

  const announcementText = landingConfig?.announcementText;
  const announcementLink = landingConfig?.announcementLink;
  const showAnnouncement = landingConfig?.showAnnouncement || false;

  const socialIcons = [
    { key: 'facebook', icon: Facebook, url: socialLinks.facebook },
    { key: 'instagram', icon: Instagram, url: socialLinks.instagram },
    { key: 'twitter', icon: Twitter, url: socialLinks.twitter },
    { key: 'youtube', icon: Youtube, url: socialLinks.youtube },
    { key: 'website', icon: Globe, url: socialLinks.website },
  ].filter(social => social.url);

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-6 text-white ${showAnnouncement && announcementText ? 'pt-20' : ''}`}
      style={{ background: backgroundStyle }}
    >
      {/* Announcement Banner */}
      {showAnnouncement && announcementText && (
        <div className="fixed top-0 left-0 right-0 z-50 pt-safe">
          {announcementLink ? (
            <a
              href={announcementLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-6 py-3 text-center text-sm md:text-base font-medium transition-opacity hover:opacity-90"
              style={{
                backgroundColor: buttonBackgroundColor,
                color: buttonTextColor,
              }}
            >
              {announcementText}
            </a>
          ) : (
            <div
              className="w-full px-6 py-3 text-center text-sm md:text-base font-medium"
              style={{
                backgroundColor: buttonBackgroundColor,
                color: buttonTextColor,
              }}
            >
              {announcementText}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-center space-y-8 w-full max-w-md">
        {/* Logo */}
        <div className="mb-2">
          <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${church.name} logo`}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <User className="w-24 h-24 text-white/70" strokeWidth={1.5} />
            )}
          </div>
        </div>

        {/* Church Title */}
        <h1
          className={`${titleSizeClass} font-bold mb-3 text-center drop-shadow-lg`}
          style={{
            fontFamily: titleFontFamily,
            color: titleColor
          }}
        >
          {displayTitle}
        </h1>

        {/* Description */}
        {description && (
          <p className="text-white text-center mb-6 leading-relaxed drop-shadow-md max-w-lg text-sm md:text-base">
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
                className="p-3 rounded-full bg-white/30 backdrop-blur-sm hover:bg-white/40 transition-colors shadow-md"
                aria-label={key}
              >
                <Icon className="h-5 w-5 text-white" />
              </a>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {visibleButtons.length > 0 && (
          <div className="space-y-4 w-full max-w-sm">
            {visibleButtons.map((button) => (
              <Link
                key={button.id}
                href={button.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full font-semibold py-3 px-6 rounded-full text-base transition shadow-xl hover:shadow-2xl hover:scale-105"
                style={{
                  backgroundColor: buttonBackgroundColor,
                  color: buttonTextColor,
                }}
              >
                {button.label}
              </Link>
            ))}
          </div>
        )}

        {/* Events Section */}
        <EventsSection
          upcomingEvents={upcomingEvents}
          pastEvents={pastEvents}
          buttonBackgroundColor={buttonBackgroundColor}
          buttonTextColor={buttonTextColor}
          eventTitleColor={eventTitleColor}
          eventDetailsColor={eventDetailsColor}
        />
      </div>

      {/* Footer */}
      <footer className="text-center text-sm py-6 text-white/70 mt-8">
        {new Date().getFullYear()} Altarflow. All rights reserved.
      </footer>
    </div>
  );
}
