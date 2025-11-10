"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Facebook, Instagram, Twitter, Youtube, Globe, User, Share2 } from 'lucide-react';
import { getBackgroundStyle } from '@/lib/landing-page/background-presets';
import { getTitleFont, getTitleSizeClass } from '@/lib/landing-page/font-config';
import { LandingShareModal } from './landing-share-modal';
import { EventsSection } from '@/components/landing/events-section';

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  website?: string;
}

interface ButtonConfig {
  id: string;
  type: 'preset' | 'custom';
  label: string;
  url?: string;
  enabled: boolean;
  order: number;
}

interface Event {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  address: string;
  isPublished: boolean;
}

interface LandingPagePreviewProps {
  churchName: string;
  churchSlug: string;
  logoUrl: string | null;
  description: string | null;
  customTitle: string | null;
  titleFont: string;
  titleSize: string;
  titleColor: string;
  backgroundType: string;
  backgroundValue: string | null;
  socialLinks: SocialLinks;
  showDonateButton: boolean;
  showConnectButton: boolean;
  donateButtonText: string;
  connectButtonText: string;
  buttonBackgroundColor?: string;
  buttonTextColor?: string;
  buttons?: ButtonConfig[];
  ogBackgroundColor?: string;
  onOgColorChange?: (color: string) => void;
  announcementText?: string | null;
  announcementLink?: string | null;
  showAnnouncement?: boolean;
  upcomingEvents?: Event[];
  pastEvents?: Event[];
  eventTitleColor?: string;
  eventDetailsColor?: string;
}

export function LandingPagePreview({
  churchName,
  churchSlug,
  logoUrl,
  description,
  customTitle,
  titleFont,
  titleSize,
  titleColor,
  backgroundType,
  backgroundValue,
  socialLinks,
  showDonateButton,
  showConnectButton,
  donateButtonText,
  connectButtonText,
  buttonBackgroundColor = '#FFFFFF',
  buttonTextColor = '#1F2937',
  buttons = [],
  ogBackgroundColor = '#3B82F6',
  onOgColorChange,
  announcementText = null,
  announcementLink = null,
  showAnnouncement = false,
  upcomingEvents = [],
  pastEvents = [],
  eventTitleColor = '#FFFFFF',
  eventDetailsColor = '#FFFFFF',
}: LandingPagePreviewProps) {
  const [showShareModal, setShowShareModal] = useState(false);

  const backgroundStyle = getBackgroundStyle(backgroundType, backgroundValue);
  const titleFontFamily = getTitleFont(titleFont);
  const titleSizeClass = getTitleSizeClass(titleSize);
  const displayTitle = customTitle || churchName || 'Your Church Name';

  const landingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${churchSlug}`
    : `https://altarflow.com/${churchSlug}`;

  // Process buttons for preview
  const visibleButtons = buttons
    .filter(btn => btn.enabled)
    .sort((a, b) => a.order - b.order);

  const socialIcons = [
    { key: 'facebook', icon: Facebook, url: socialLinks.facebook },
    { key: 'instagram', icon: Instagram, url: socialLinks.instagram },
    { key: 'twitter', icon: Twitter, url: socialLinks.twitter },
    { key: 'youtube', icon: Youtube, url: socialLinks.youtube },
    { key: 'website', icon: Globe, url: socialLinks.website },
  ].filter(social => social.url);

  return (
    <div className="sticky top-6">
      {/* Shareable URL Header - Replaces "Live Preview" */}
      <div className="mb-4">
        <button
          onClick={() => setShowShareModal(true)}
          className="w-full px-4 py-2.5 flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 border rounded-lg transition-colors group"
        >
          <span className="text-sm font-medium text-foreground truncate">
            altarflow.com/{churchSlug}
          </span>
          <Share2 className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
        </button>
      </div>

      {/* Preview Content (No Phone Frame) */}
      <div className="relative mx-auto rounded-3xl shadow-2xl overflow-hidden" style={{ width: '375px', height: '667px' }}>
        {/* Landing Page Content */}
        <div
          className="w-full h-full flex flex-col items-center p-8 pt-12 text-white overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30"
          style={{ background: backgroundStyle }}
        >
          {/* Announcement Banner */}
          {showAnnouncement && announcementText && (
            <div className="w-full -mx-8 -mt-12 mb-6">
              {announcementLink ? (
                <a
                  href={announcementLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-6 py-3 text-center text-sm font-medium transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: buttonBackgroundColor,
                    color: buttonTextColor,
                  }}
                >
                  {announcementText}
                </a>
              ) : (
                <div
                  className="w-full px-6 py-3 text-center text-sm font-medium"
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

          {/* Logo */}
          <div className="mb-2">
            <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`${churchName} logo`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <User className="w-16 h-16 text-white/70" strokeWidth={1.5} />
              )}
            </div>
          </div>

          {/* Church Title */}
          <h1
            className={`${titleSizeClass} font-bold mb-2 text-center drop-shadow-lg`}
            style={{
              fontFamily: titleFontFamily,
              color: titleColor
            }}
          >
            {displayTitle}
          </h1>

          {/* Description */}
          {description && (
            <p className="text-white text-center mb-4 text-sm leading-relaxed drop-shadow-md max-w-xs">
              {description}
            </p>
          )}

          {/* Social Links */}
          {socialIcons.length > 0 && (
            <div className="flex justify-center gap-3 mb-4">
              {socialIcons.map(({ key, icon: Icon }) => (
                <div
                  key={key}
                  className="p-2.5 rounded-full bg-white/30 backdrop-blur-sm hover:bg-white/40 transition-colors shadow-md"
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          {visibleButtons.length > 0 && (
            <div className="space-y-3 w-full max-w-xs">
              {visibleButtons.map((button) => (
                <div
                  key={button.id}
                  className="flex items-center justify-center w-full font-semibold py-3 px-6 rounded-full text-sm shadow-lg hover:shadow-xl transition-shadow"
                  style={{
                    backgroundColor: buttonBackgroundColor,
                    color: buttonTextColor,
                  }}
                >
                  {button.label}
                </div>
              ))}
            </div>
          )}

          {/* Events Section */}
          {(upcomingEvents.length > 0 || pastEvents.length > 0) && (
            <EventsSection
              upcomingEvents={upcomingEvents}
              pastEvents={pastEvents}
              buttonBackgroundColor={buttonBackgroundColor}
              buttonTextColor={buttonTextColor}
              eventTitleColor={eventTitleColor}
              eventDetailsColor={eventDetailsColor}
            />
          )}

          {/* Footer */}
          <footer className="text-center text-[10px] py-3 text-white/70 mt-auto">
            {new Date().getFullYear()} Altarflow. All rights reserved.
          </footer>
        </div>
      </div>

      {/* Share Modal */}
      <LandingShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={landingUrl}
        churchSlug={churchSlug}
        churchName={displayTitle}
        logoUrl={logoUrl}
        ogBackgroundColor={ogBackgroundColor}
        onOgColorChange={onOgColorChange || (() => {})}
      />
    </div>
  );
}
