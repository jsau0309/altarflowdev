"use client";

import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from "react-i18next";
import { useSearchParams } from 'next/navigation';
import { usePostHog } from '@/hooks/use-posthog';
import { Confetti, ConfettiRef } from '@/components/ui/confetti';


interface DonationSuccessfulContentProps {
  churchSlug: string;
  backgroundStyle: string;
  logoUrl: string;
  displayTitle: string;
}

function DonationSuccessfulInner({ churchSlug, backgroundStyle, logoUrl, displayTitle }: DonationSuccessfulContentProps) {
  const { t } = useTranslation('donations');
  const searchParams = useSearchParams();
  const { trackEvent } = usePostHog();
  const confettiRef = useRef<ConfettiRef>(null);

  // Get donation details from URL params with validation
  const amountStr = searchParams.get('amount');
  const amount = amountStr && !isNaN(parseFloat(amountStr)) && parseFloat(amountStr) > 0
    ? parseFloat(amountStr).toFixed(2)
    : null;
  const fundName = searchParams.get('fundName') || searchParams.get('campaignName');
  const donationDate = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Translate system donation types (Tithe, Offering) but keep user-created campaign names as-is
  const getTranslatedFundName = (name: string | null): string | null => {
    if (!name) return null;

    // Check if it's a system donation type
    const systemTypes: { [key: string]: string } = {
      'Tithe': 'tithe',
      'Offering': 'offering'
    };

    if (systemTypes[name]) {
      // It's a system type, return translated version
      return t(`funds.${systemTypes[name]}`);
    }

    // It's a user-created campaign, return as-is
    return name;
  };

  const displayFundName = getTranslatedFundName(fundName);

  useEffect(() => {
    // Track successful donation
    const churchName = searchParams.get('churchName');

    if (amount) {
      trackEvent('donation_completed', {
        amount: parseFloat(amount),
        church_slug: churchSlug,
        church_name: churchName || 'Unknown',
      });
    }

    // Trigger fireworks confetti with proper cleanup
    const timers: NodeJS.Timeout[] = [];

    const timer1 = setTimeout(() => {
      confettiRef.current?.fire({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
      });

      // Second burst for fireworks effect
      const timer2 = setTimeout(() => {
        confettiRef.current?.fire({
          particleCount: 100,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 }
        });
      }, 250);
      timers.push(timer2);

      const timer3 = setTimeout(() => {
        confettiRef.current?.fire({
          particleCount: 100,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 }
        });
      }, 400);
      timers.push(timer3);
    }, 500);
    timers.push(timer1);

    // Cleanup all timers on unmount
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [searchParams, churchSlug, trackEvent, amount]);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 text-center" style={{ background: backgroundStyle }}>
      {/* Confetti Canvas */}
      <Confetti
        ref={confettiRef}
        className="absolute inset-0 pointer-events-none w-full h-full"
        manualstart={true}
      />

      <div className="bg-white px-8 py-10 rounded-2xl shadow-xl max-w-lg w-full relative z-10">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          </div>
        </div>

        {/* Title and Subtitle */}
        <h1 className="text-4xl font-bold mb-3 text-gray-900">
          {t('donationSuccessful.title')}
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          {t('donationSuccessful.subtitle')}
        </p>

        {/* Donation Summary Card */}
        {amount && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6 text-center">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              {t('donationSuccessful.donationSummary')}
            </h2>
            <div className="space-y-3">
              {/* Amount */}
              <div className="text-5xl font-bold text-gray-900">${amount}</div>

              {/* Fund Name */}
              {displayFundName && (
                <div className="text-base text-gray-600 mt-2">
                  {displayFundName}
                </div>
              )}

              {/* Date */}
              <div className="text-sm text-gray-500 mt-3">
                {donationDate}
              </div>
            </div>
          </div>
        )}

        {/* Receipt Message */}
        <p className="text-sm text-gray-600 mb-6">
          {t('donationSuccessful.receiptSent')}
        </p>

        {/* Return to Landing Page Button */}
        <Button
          asChild
          variant="default"
          className="w-full py-6 text-lg rounded-lg font-semibold transition-all duration-150 ease-in-out hover:scale-105"
        >
          <Link href={`/${churchSlug}`}>
            {t('donationSuccessful.goHomeButton')}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function DonationSuccessfulContent(props: DonationSuccessfulContentProps) {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading page...</p>
      </div>
    }>
      <DonationSuccessfulInner {...props} />
    </Suspense>
  );
}
