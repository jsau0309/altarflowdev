// app/[churchSlug]/donation-successful/page.tsx
"use client";

import { Suspense, use as useReact, useEffect } from 'react'; // Added useReact
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button'; 
import { useTranslation } from "react-i18next";
import { useSearchParams } from 'next/navigation';
import { usePostHog } from '@/hooks/use-posthog';


interface PageProps {
  params: Promise<{ // params itself is a Promise
    churchSlug: string;
  }>;
}

interface DonationSuccessfulContentProps {
  churchSlug: string;
}

const DonationSuccessfulContent: React.FC<DonationSuccessfulContentProps> = ({ churchSlug }) => {
  const { t } = useTranslation('donations');
  const searchParams = useSearchParams();
  const { trackEvent } = usePostHog();

  useEffect(() => {
    // Track successful donation
    const amount = searchParams.get('amount');
    const churchName = searchParams.get('churchName');
    
    if (amount) {
      trackEvent('donation_completed', {
        amount: parseFloat(amount),
        church_slug: churchSlug,
        church_name: churchName || 'Unknown',
      });
    }
  }, [searchParams, churchSlug, trackEvent]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center" style={{ background: 'linear-gradient(90deg, hsla(217, 91%, 60%, 1) 0%, hsla(0, 0%, 75%, 1) 99%)' }}>
      {/* The background gradient is an attempt to match the example's feel. Adjust as needed. */}
      <div className="bg-white dark:bg-gray-800 px-6 py-8 rounded-lg shadow-md max-w-md w-full">
        {/* Optional: A generic 'thank you' icon could go here */}
        {/* e.g., <CheckCircleIcon className="w-16 h-16 mx-auto mb-6 text-green-500" /> */}
        
        <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">
          {t('donationSuccessful.title')}
        </h1>
        <p className="text-gray-700 dark:text-gray-300 mb-8 text-lg">
          {t('donationSuccessful.submissionMessage')}
        </p>
        
        <div className="space-y-3">
          <Button 
            asChild 
            variant="default" 
            className="w-full py-3 text-lg rounded-md transition-colors duration-150 ease-in-out"
          >
            {/* The link now points to the root of the church's page, assuming that's 'home' */}
            <Link href={`/${churchSlug}`}>
              {t('donationSuccessful.goHomeButton')}
            </Link>
          </Button>
        </div>
      </div>
       <p className="mt-10 text-sm text-black dark:text-gray-200 max-w-md w-full">
        {t('donationSuccessful.contactSupportMessage')}
      </p>
    </div>
  );
}


// Using Suspense for useSearchParams as recommended by Next.js
export default function DonationSuccessfulPage(props: PageProps) { // props.params is a Promise
  const params = useReact(props.params); // Unwrap the promise using React.use
  const churchSlug = params.churchSlug;

  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading page...</p>
      </div>
    }>
      <DonationSuccessfulContent churchSlug={churchSlug} />
    </Suspense>
  );
}