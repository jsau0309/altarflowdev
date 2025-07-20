'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@clerk/nextjs';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function OnboardingStep6() {
  const { t } = useTranslation(['onboarding', 'common']);
  const router = useRouter();
  const { organization } = useOrganization();

  useEffect(() => {
    // If no organization, redirect to step 1
    if (!organization) {
      router.push('/onboarding/step-1');
      return;
    }

    // Trigger confetti animation
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, [organization, router]);

  const handleComplete = () => {
    router.push('/dashboard');
  };

  if (!organization) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 text-center">
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

          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <CheckCircle className="w-20 h-20 text-green-600" />
              <div className="absolute inset-0 animate-ping">
                <CheckCircle className="w-20 h-20 text-green-600 opacity-50" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('onboarding:step6.title', 'Congratulations!')} 🎉
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-lg mx-auto">
            {t('onboarding:step6.subtitle', 'Your church is all set up and ready to use AltarFlow.')}
          </p>

          {/* What's Next Section */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-8 text-left max-w-lg mx-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              {t('onboarding:step6.whatsNext', "What's next?")}
            </h3>
            <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>{t('onboarding:step6.next1', 'Add your first members to start building your database')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>{t('onboarding:step6.next2', 'Set up donation funds to track different giving categories')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>{t('onboarding:step6.next3', 'Connect your Stripe account to accept online donations')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>{t('onboarding:step6.next4', 'Customize your public donation page and QR codes')}</span>
              </li>
            </ul>
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleComplete}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            {t('onboarding:step6.goToDashboard', 'Go to Dashboard')} →
          </Button>

          {/* Help Text */}
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            {t('onboarding:step6.helpText', 'Need help? Check out our')} {' '}
            <a href="/help" className="text-blue-600 hover:text-blue-500 underline">
              {t('onboarding:step6.gettingStarted', 'getting started guide')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}