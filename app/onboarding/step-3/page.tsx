'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@clerk/nextjs';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

// Form validation schema
const churchDetailsSchema = z.object({
  address: z.string().min(1, 'Address is required for tax receipts'),
  email: z.string().email('Invalid email address').min(1, 'Email is required for receipts'),
  phone: z.string()
    .regex(/^\d{0,10}$/, 'Phone must be digits only, maximum 10 digits')
    .optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
});

type ChurchDetailsForm = z.infer<typeof churchDetailsSchema>;

export default function OnboardingStep3() {
  const { t } = useTranslation(['onboarding', 'common']);
  const router = useRouter();
  const { organization } = useOrganization();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChurchDetailsForm>({
    resolver: zodResolver(churchDetailsSchema),
  });

  useEffect(() => {
    // If no organization, redirect to step 1
    if (!organization) {
      router.push('/onboarding/step-1');
      return;
    }

    // Check if church record exists in database (webhook might still be processing)
    let retryCount = 0;
    const maxRetries = 10; // Stop after 10 seconds
    
    const checkChurchExists = async () => {
      try {
        const response = await fetch('/api/settings/onboarding-status');
        const data = await response.json();
        
        if (response.ok && data.onboardingStep >= 3) {
          // Church exists and we're at step 3 or beyond, stop polling
          return;
        }
        
        if (retryCount < maxRetries) {
          // Church not found yet, webhook might still be processing
          retryCount++;
          setTimeout(checkChurchExists, 1000); // Retry after 1 second
        } else {
          console.log('Stopped checking for church after maximum retries');
        }
      } catch (error) {
        console.error('Error checking church status:', error);
      }
    };

    checkChurchExists();
  }, [organization, router]);

  const onSubmit = async (data: ChurchDetailsForm) => {
    try {
      setIsLoading(true);

      // Update church details in database
      const response = await fetch('/api/settings/church-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: organization?.name || '', // Include name as it's required
          address: data.address,
          email: data.email,
          phone: data.phone || null,
          website: data.website || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update church details');
      }

      showToast(
        t('onboarding:step3.success', 'Church details saved successfully'),
        'success'
      );

      // Move to next step
      router.push('/onboarding/step-4');
    } catch (error) {
      console.error('Error saving church details:', error);
      showToast(
        t('onboarding:step3.error', 'Failed to save church details. Please try again.'),
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!organization) {
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
              <div className="w-12 h-1 bg-green-600"></div>
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                ✓
              </div>
              <div className="w-12 h-1 bg-blue-600"></div>
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
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
              {t('onboarding:step3.title', 'Church Details')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {t('onboarding:step3.subtitle', 'This information will appear on tax receipts')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Church Name (Read-only) */}
            <div>
              <Label htmlFor="churchName">{t('onboarding:step3.churchName', 'Church Name')}</Label>
              <Input
                id="churchName"
                value={organization.name}
                disabled
                className="bg-gray-50 dark:bg-gray-700"
              />
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="address">
                {t('onboarding:step3.address', 'Church Address')} *
              </Label>
              <Input
                id="address"
                placeholder={t('onboarding:step3.addressPlaceholder', '123 Main St, City, State ZIP')}
                {...register('address')}
                className={errors.address ? 'border-red-500' : ''}
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">
                {t('onboarding:step3.email', 'Church Email')} *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('onboarding:step3.emailPlaceholder', 'contact@yourchurch.org')}
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone">
                {t('onboarding:step3.phone', 'Church Phone')}
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t('onboarding:step3.phonePlaceholder', '5551234567')}
                {...register('phone', {
                  onChange: (e) => {
                    // Only allow digits and limit to 10 characters
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    e.target.value = value;
                  }
                })}
                maxLength={10}
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('onboarding:step3.phoneNote', 'Enter 10 digits only (no spaces or special characters)')}
              </p>
            </div>

            {/* Website */}
            <div>
              <Label htmlFor="website">
                {t('onboarding:step3.website', 'Church Website')}
              </Label>
              <Input
                id="website"
                type="url"
                placeholder={t('onboarding:step3.websitePlaceholder', 'https://yourchurch.org')}
                {...register('website')}
                className={errors.website ? 'border-red-500' : ''}
              />
              {errors.website && (
                <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
              )}
            </div>

            {/* Required Fields Note */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              * {t('onboarding:step3.requiredNote', 'Required for compliance')}
            </p>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('common:saving', 'Saving...')}
                  </span>
                ) : (
                  <>
                    {t('common:continue', 'Continue')} →
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}