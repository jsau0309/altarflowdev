// app/[churchSlug]/donation-successful/page.tsx
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { loadStripe, Stripe, PaymentIntent } from '@stripe/stripe-js';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Assuming you have this
// You might want a more specific translation hook if needed, or use a generic one
// import { useTranslation } from 'react-i18next'; // Or your preferred i18n library

// Initialize Stripe.js with your publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PageProps {
  params: {
    churchSlug: string;
  };
}

function DonationSuccessfulContent({ churchSlug }: { churchSlug: string }) {
  // const { t } = useTranslation('donations'); // Example for translations
  const searchParams = useSearchParams();
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentIntent.Status | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    stripePromise.then(stripeInstance => {
      setStripe(stripeInstance);
    });
  }, []);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = searchParams.get('payment_intent_client_secret');

    if (!clientSecret) {
      setMessage("Error: Payment information not found. Please contact support if you made a payment.");
      setIsLoading(false);
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent, error }) => {
      setIsLoading(false);
      if (error) {
        setMessage(`Error retrieving payment details: ${error.message}`);
        setPaymentStatus('requires_payment_method'); // Or some other error status
      } else if (paymentIntent) {
        setPaymentStatus(paymentIntent.status);
        switch (paymentIntent.status) {
          case 'succeeded':
            setMessage("Thank you! Your donation was successful.");
            break;
          case 'processing':
            setMessage("Your payment is processing. We'll update you when it's complete.");
            break;
          case 'requires_payment_method':
            setMessage("Payment failed. Please try another payment method.");
            // Optionally, redirect back to the donation form or offer a retry.
            break;
          default:
            setMessage(`Payment status: ${paymentIntent.status}. Please contact support if you have questions.`);
            break;
        }
      } else {
         setMessage("Could not retrieve payment details. Please contact support.");
      }
    });
  }, [stripe, searchParams]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          Confirming your donation status...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
        {paymentStatus === 'succeeded' && (
          <svg className="w-16 h-16 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        )}
        {/* Add icons for other statuses if desired */}
        <h1 className={`text-2xl font-semibold mb-2 ${
          paymentStatus === 'succeeded' ? 'text-green-600 dark:text-green-400' : 
          paymentStatus === 'processing' ? 'text-blue-600 dark:text-blue-400' :
          'text-red-600 dark:text-red-400'
        }`}>
          {paymentStatus === 'succeeded' ? "Donation Successful!" : 
           paymentStatus === 'processing' ? "Donation Processing" :
           "Donation Status"}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        
        <div className="space-y-3">
          {paymentStatus === 'succeeded' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              A confirmation email will be sent to you shortly (if an email was provided).
            </p>
          )}
          <Button asChild variant="default" className="w-full">
            <Link href={`/${churchSlug}`}>
              Return to {churchSlug.replace(/-/g, ' ')}'s Page
            </Link>
          </Button>
          {(paymentStatus === 'requires_payment_method' || paymentStatus === 'canceled') && (
             <Button asChild variant="outline" className="w-full">
                <Link href={`/${churchSlug}/donate`}> {/* Assuming /donate is your donation form page */}
                    Try Donating Again
                </Link>
            </Button>
          )}
        </div>
      </div>
       <p className="mt-8 text-xs text-gray-500 dark:text-gray-400">
        If you have any questions, please contact support.
      </p>
    </div>
  );
}


// Using Suspense for useSearchParams as recommended by Next.js
export default function DonationSuccessfulPage({ params }: PageProps) {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading page...</p>
      </div>
    }>
      <DonationSuccessfulContent churchSlug={params.churchSlug} />
    </Suspense>
  );
}