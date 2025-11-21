'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@clerk/nextjs';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export default function OnboardingStep5() {
  const { t } = useTranslation(['onboarding', 'common', 'settings']);
  const router = useRouter();
  const { organization } = useOrganization();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    // If no organization, redirect to step 1
    if (!organization) {
      router.push('/onboarding/step-1');
    }
  }, [organization, router]);

  const handleContinue = async () => {
    try {
      setIsLoading(true);

      // Update onboarding step to complete
      const response = await fetch('/api/settings/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      // Move to completion step
      router.push('/onboarding/step-6');
    } catch (error) {
      logger.error('Error completing onboarding', { operation: 'ui.onboarding.complete_error' }, error instanceof Error ? error : new Error(String(error)));
      showToast(
        t('onboarding:step5.continueError', 'Failed to complete setup. Please try again.'),
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!organization) {
    return null;
  }

  const features = [
    t('settings:pricing.features.unlimitedMembers', 'Unlimited Members'),
    t('settings:pricing.features.unlimitedDonations', 'Unlimited Donations'),
    t('settings:pricing.features.taxReceipts', 'Automated Tax Receipts'),
    t('settings:pricing.features.financialReports', 'Financial Reports with AI Insights'),
    t('settings:pricing.features.onlineGiving', 'Online Giving & QR Codes'),
    t('settings:pricing.features.expenseTracking', 'Expense Tracking'),
    t('settings:pricing.features.memberCommunication', 'Member Communication (Email/SMS)'),
    t('settings:pricing.features.support', 'Priority Support'),
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
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
              <div className="w-12 h-1 bg-green-600"></div>
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                ✓
              </div>
              <div className="w-12 h-1 bg-green-600"></div>
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                ✓
              </div>
              <div className="w-12 h-1 bg-green-600"></div>
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                ✓
              </div>
              <div className="w-12 h-1 bg-blue-600"></div>
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
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
              {t('onboarding:step5.title', 'AltarFlow Pricing Plans')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {t('onboarding:step5.subtitle', 'Review our pricing options - you can upgrade anytime after setup')}
            </p>
          </div>

          {/* Pricing Cards - Display Only */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Monthly Plan */}
            <Card 
              className="opacity-90"
            >
              <CardHeader>
                <CardTitle>{t('settings:pricing.monthly.title', 'Monthly')}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">$99</span>
                  <span className="text-gray-600 dark:text-gray-300">/{t('settings:pricing.perMonth', 'month')}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('settings:pricing.monthly.description', 'Flexible month-to-month billing')}
                </p>
              </CardContent>
            </Card>

            {/* Annual Plan */}
            <Card 
              className="opacity-90 relative"
            >
              <div className="absolute -top-3 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                {t('settings:pricing.annual.badge', 'SAVE 30%')}
              </div>
              <CardHeader>
                <CardTitle>{t('settings:pricing.annual.title', 'Annual')}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">$69</span>
                  <span className="text-gray-600 dark:text-gray-300">/{t('settings:pricing.perMonth', 'month')}</span>
                  <span className="block text-sm mt-1">
                    {t('settings:pricing.annual.billedAs', 'Billed as $830/year')}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('settings:pricing.annual.description', 'Best value with annual commitment')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Features List */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              {t('settings:pricing.includesTitle', 'Everything you need to manage your church:')}
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleContinue}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-3"
              size="lg"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('common:processing', 'Processing...')}
                </span>
              ) : (
                t('onboarding:step5.continue', 'Continue to Complete Setup')
              )}
            </Button>
          </div>

          {/* Upgrade Note */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
            <p className="text-center text-sm text-blue-700 dark:text-blue-300">
              <strong>{t('onboarding:step5.noteTitle', 'Ready to upgrade?')}</strong> {t('onboarding:step5.noteText', 'You can upgrade to a paid plan anytime from your dashboard after completing setup.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}