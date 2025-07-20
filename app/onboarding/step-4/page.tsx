'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@clerk/nextjs';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';

export default function OnboardingStep4() {
  const { t, i18n } = useTranslation(['onboarding', 'common']);
  const router = useRouter();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [selectedTheme, setSelectedTheme] = useState(theme || 'light');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });

  useEffect(() => {
    // If no organization, redirect to step 1
    if (!organization) {
      router.push('/onboarding/step-1');
    }
  }, [organization, router]);

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      // Update preferences in database
      const response = await fetch('/api/settings/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language,
          theme: selectedTheme,
          notifications,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      // Apply language and theme changes
      i18n.changeLanguage(language);
      setTheme(selectedTheme);

      toast({
        title: t('onboarding:step4.success', 'Preferences saved'),
        description: t('onboarding:step4.successDescription', 'Your preferences have been updated.'),
      });

      // Move to next step
      router.push('/onboarding/step-5');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: t('common:error', 'Error'),
        description: t('onboarding:step4.error', 'Failed to save preferences. Please try again.'),
        variant: 'destructive',
      });
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
              <div className="w-12 h-1 bg-green-600"></div>
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                ✓
              </div>
              <div className="w-12 h-1 bg-blue-600"></div>
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
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
              {t('onboarding:step4.title', 'Set Your Preferences')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {t('onboarding:step4.subtitle', 'Customize your AltarFlow experience')}
            </p>
          </div>

          <div className="space-y-8">
            {/* Language Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                {t('onboarding:step4.language', 'Language')}
              </Label>
              <RadioGroup value={language} onValueChange={setLanguage}>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="en" id="en" />
                  <Label htmlFor="en" className="cursor-pointer">
                    English
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="es" id="es" />
                  <Label htmlFor="es" className="cursor-pointer">
                    Español
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Theme Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                {t('onboarding:step4.theme', 'Theme')}
              </Label>
              <RadioGroup value={selectedTheme} onValueChange={setSelectedTheme}>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light" className="cursor-pointer">
                    {t('onboarding:step4.lightTheme', 'Light')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark" className="cursor-pointer">
                    {t('onboarding:step4.darkTheme', 'Dark')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="system" id="system" />
                  <Label htmlFor="system" className="cursor-pointer">
                    {t('onboarding:step4.systemTheme', 'System')}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Notification Preferences */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                {t('onboarding:step4.notifications', 'Notifications')}
              </Label>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications" className="text-sm font-normal">
                      {t('onboarding:step4.emailNotifications', 'Email Notifications')}
                    </Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('onboarding:step4.emailNotificationsDesc', 'Receive updates and alerts via email')}
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={notifications.email}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, email: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push-notifications" className="text-sm font-normal">
                      {t('onboarding:step4.pushNotifications', 'Push Notifications')}
                    </Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('onboarding:step4.pushNotificationsDesc', 'Get instant updates in your browser')}
                    </p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={notifications.push}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, push: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sms-notifications" className="text-sm font-normal">
                      {t('onboarding:step4.smsNotifications', 'SMS Notifications')}
                    </Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('onboarding:step4.smsNotificationsDesc', 'Receive text messages for important updates')}
                    </p>
                  </div>
                  <Switch
                    id="sms-notifications"
                    checked={notifications.sms}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, sms: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => router.push('/onboarding/step-3')}
                disabled={isLoading}
              >
                ← {t('common:back', 'Back')}
              </Button>
              <Button
                onClick={handleSubmit}
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
          </div>
        </div>
      </div>
    </div>
  );
}