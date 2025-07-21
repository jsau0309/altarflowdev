'use client';

import { CreateOrganization, useOrganizationList } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';

export default function OnboardingStep1() {
  const { t } = useTranslation(['onboarding', 'common']);
  const router = useRouter();
  const { userMemberships, isLoaded } = useOrganizationList();

  // Check if user already has organizations
  useEffect(() => {
    if (isLoaded && userMemberships && userMemberships.data && userMemberships.data.length > 0) {
      // User has organizations, redirect to step 2
      router.push('/onboarding/step-2');
    }
  }, [isLoaded, userMemberships, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/images/Altarflow.svg"
              alt="AltarFlow Logo"
              width={150}
              height={45}
              className="h-10 w-auto"
            />
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600"></div>
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center text-sm">
                2
              </div>
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600"></div>
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center text-sm">
                3
              </div>
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600"></div>
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center text-sm">
                4
              </div>
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600"></div>
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center text-sm">
                5
              </div>
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600"></div>
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center text-sm">
                6
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
              {t('onboarding:step1.title', 'Create Your Church Organization')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {t('onboarding:step1.subtitle', 'Enter your church name to get started')}
            </p>
          </div>

          {/* Create Organization Component */}
          <div className="w-full">
            <CreateOrganization
              afterCreateOrganizationUrl="/onboarding/step-3"
              skipInvitationScreen={true}
              appearance={{
                elements: {
                  rootBox: "w-full flex justify-center",
                  card: "shadow-none border-0 max-w-sm w-full",
                  formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
                  formFieldInput: "border-gray-300 dark:border-gray-600",
                  formFieldLabel: "text-gray-700 dark:text-gray-300",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                }
              }}
            />
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('onboarding:step1.helpText', 'This will be the name displayed to your members and on receipts')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}