'use client';

import { useOrganizationList, useOrganization } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function OnboardingStep2() {
  const { t } = useTranslation(['onboarding', 'common']);
  const router = useRouter();
  const { userMemberships, isLoaded, setActive } = useOrganizationList();
  const { organization } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If user has no organizations, redirect to step 1
    if (isLoaded && (!userMemberships || !userMemberships.data || userMemberships.data.length === 0)) {
      router.push('/onboarding/step-1');
      return;
    }

    // If only one organization and it's already active, go to step 3
    if (isLoaded && userMemberships && userMemberships.data && userMemberships.data.length === 1 && organization) {
      router.push('/onboarding/step-3');
    }
  }, [isLoaded, userMemberships, organization, router]);

  const handleSelectOrganization = async (orgId: string) => {
    try {
      setIsLoading(true);
      if (setActive) {
        await setActive({ organization: orgId });
      }
      router.push('/onboarding/step-3');
    } catch (error) {
      console.error('Error selecting organization:', error);
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    router.push('/onboarding/step-1');
  };

  // Don't show anything while checking
  if (!isLoaded || !userMemberships || !userMemberships.data || userMemberships.data.length === 0) {
    return null;
  }

  // Only show if user has multiple organizations
  if (userMemberships.data.length === 1) {
    return null;
  }

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
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                ✓
              </div>
              <div className="w-12 h-1 bg-blue-600"></div>
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
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
              {t('onboarding:step2.title', 'Select Your Church')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {t('onboarding:step2.subtitle', 'Choose which church you want to set up')}
            </p>
          </div>

          {/* Organizations List */}
          <div className="space-y-3 mb-6">
            {userMemberships.data.map((membership) => (
              <Card 
                key={membership.organization.id}
                className="cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => handleSelectOrganization(membership.organization.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {membership.organization.name}
                      </h3>
                      {membership.role === 'org:admin' && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          {t('common:admin', 'Admin')}
                        </span>
                      )}
                    </div>
                    <svg 
                      className="w-5 h-5 text-gray-400"
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Create New Button */}
          <div className="text-center">
            <Button
              variant="outline"
              onClick={handleCreateNew}
              disabled={isLoading}
            >
              {t('onboarding:step2.createNew', 'Create New Church')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}