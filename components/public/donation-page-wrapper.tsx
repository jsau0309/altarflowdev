"use client";

import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Lock } from 'lucide-react';
import { LanguageSwitcher } from './language-switcher';

interface DonationPageWrapperProps {
  logoUrl: string;
  displayTitle: string;
  children: React.ReactNode;
}

export function DonationPageWrapper({
  logoUrl,
  displayTitle,
  children,
}: DonationPageWrapperProps) {
  const { t } = useTranslation('donations');

  return (
    <>
      {/* Header with Language Switcher */}
      <div className="mt-8 flex flex-col items-center space-y-4 bg-white px-6 py-8 rounded-lg shadow-md">
        {/* Language Switcher at top right */}
        <div className="w-full flex justify-end">
          <LanguageSwitcher variant="compact" />
        </div>

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
        {children}
      </div>

      {/* Footer Sections */}
      <div className="w-full max-w-md space-y-3 text-center bg-white px-6 py-6 rounded-lg shadow-md">
        {/* Terms and Privacy */}
        <p className="text-xs text-gray-500">
          {t('publicPage.termsAndPrivacy')}{' '}
          <a
            href="/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline hover:text-gray-700"
          >
            {t('publicPage.termsOfService')}
          </a>
          {' '}{t('publicPage.and')}{' '}
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline hover:text-gray-700"
          >
            {t('publicPage.privacyPolicy')}
          </a>
          .
        </p>

        {/* Powered by Altarflow */}
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
          <span>{t('publicPage.poweredBy')}</span>
          <Image
            src="/images/Altarflow.svg"
            alt="Altarflow Logo"
            width={70}
            height={18}
          />
        </div>

        {/* Secure Transaction */}
        <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
          <Lock className="h-3 w-3" />
          <span>{t('publicPage.secureTransaction')}</span>
        </div>
      </div>
    </>
  );
}

interface DonationNotAvailableProps {
  logoUrl: string;
  displayTitle: string;
  hasActiveStripeAccount: boolean;
}

export function DonationNotAvailable({
  logoUrl,
  displayTitle,
  hasActiveStripeAccount,
}: DonationNotAvailableProps) {
  const { t } = useTranslation('donations');

  return (
    <div className="mt-8 flex flex-col items-center space-y-4 bg-white px-6 py-8 rounded-lg shadow-md">
      {/* Language Switcher at top right */}
      <div className="w-full flex justify-end">
        <LanguageSwitcher variant="compact" />
      </div>

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
          ? t('publicPage.notAvailable')
          : t('publicPage.temporarilyDisabled')}
      </p>
    </div>
  );
}
