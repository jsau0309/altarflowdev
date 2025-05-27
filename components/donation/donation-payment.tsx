"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { DonationFormData } from "./donation-form"
import { Gift, Loader2 } from "lucide-react"
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next'

import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

// Make sure to set this in your .env.local file
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface DonationPaymentProps {
  formData: DonationFormData;
  updateFormData: (data: Partial<DonationFormData>) => void;
  onBack: () => void;
  churchId: string;
  churchSlug: string; // Added churchSlug to construct dynamic return_url
}

// New Inner component for the payment form itself
interface CheckoutFormProps {
  formData: DonationFormData;
  onBack: () => void;
  churchId: string; // This is the internal DB UUID
  churchSlug: string; // Added to construct dynamic return_url
}

const CheckoutForm = ({ formData, onBack, churchId, churchSlug }: CheckoutFormProps) => {
  useEffect(() => {
    // Listen for CSP violations
    const handleCSPViolation = (e: SecurityPolicyViolationEvent) => {
      console.log('CSP Violation:', {
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
        originalPolicy: e.originalPolicy,
        sourceFile: e.sourceFile,
        lineNumber: e.lineNumber,
        columnNumber: e.columnNumber,
      });
    };
    document.addEventListener('securitypolicyviolation', handleCSPViolation);
    return () => {
      document.removeEventListener('securitypolicyviolation', handleCSPViolation);
    };
  }, []);
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useTranslation(['donations', 'common']);

  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentElementReady, setIsPaymentElementReady] = useState(false);

  // Calculate display amount based on formData
  const baseAmount = formData.amount || 0;
  let displayAmount = baseAmount;
  if (formData.coverFees && baseAmount > 0) {
    const fee = (baseAmount * 0.029) + 0.30;
    displayAmount = baseAmount + fee;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      setMessage(t('donations:donationPayment.stripeNotLoaded', "Stripe is not ready yet. Please wait a moment."));
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    const calculatedReturnUrl = `${window.location.origin}/${churchSlug}/donation-successful`;
    console.log('[CheckoutForm] Attempting stripe.confirmPayment with return_url:', calculatedReturnUrl, 'churchSlug:', churchSlug);

    const { error } = await stripe.confirmPayment({ // paymentIntent is not reliably returned here with redirect: 'always'
      elements,
      confirmParams: {
        // Make sure to change this to your payment completion page
        // This URL is where the user will be redirected after payment.
        return_url: `${window.location.origin}/${churchSlug}/donation-successful`,
      },
      redirect: "always" // Redirect is now always handled
    });

    // If we reach here, it means an error occurred before redirecting or redirect is not applicable for some reason.
    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message || t('donations:donationPayment.genericPaymentError', "An error occurred with your payment."));
      } else {
        setMessage(t('donations:donationPayment.unexpectedPaymentError', "An unexpected error occurred. Please try again."));
      }
    }
    // If no error, the redirect to `return_url` should have occurred.
    // Success, processing, or other statuses will be handled on the `donation-successful` page.

    setIsProcessing(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
        <div className="text-xl font-medium text-gray-500 dark:text-gray-400">$</div>
        <div className="text-4xl font-bold text-center text-gray-900 dark:text-white">
          {displayAmount.toFixed(2)}
        </div>
        <div className="text-xl font-medium text-gray-500 dark:text-gray-400">{t('common:currency.usd', 'USD')}</div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <span>{t('donations:donationPayment.donateToLabel', 'Donation to:')}</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formData.donationTypeName || t('donations:donationDetails.selectFundPlaceholder', 'Selected Fund')}
          </span>
        </div>
        {formData.donationType === "recurring" && (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('donations:donationPayment.recurringLabel', 'Recurring {{frequency}} donation',
               { frequency: formData.frequency ? t(`donations:frequencies.${formData.frequency}`, formData.frequency) : '' })}
          </div>
        )}
      </div>
      
      <PaymentElement 
        id="payment-element" 
        options={{ layout: "tabs" }} 
        onReady={() => {
          setIsPaymentElementReady(true);
        }}
      />

      {/* Fee coverage checkbox is handled by the parent, but we display its effect */}
      {/* The actual updateFormData for coverFees is in the parent DonationPayment component */}

      {message && <div id="payment-message" className={`p-3 rounded-md ${message.includes("Success") ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message}</div>}

      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1" disabled={isProcessing}>
          {t('common:back', 'Back')}
        </Button>
        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isProcessing || !stripe || !elements || !isPaymentElementReady}>
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Gift className="mr-2 h-4 w-4" />
          )}
          {isProcessing ? t('donations:donationPayment.processingButton', 'Processing...') : t('donations:donationPayment.submitButton', 'Donate now')}
        </Button>
      </div>
    </form>
  );
};


export default function DonationPayment({ formData, updateFormData, onBack, churchId, churchSlug }: DonationPaymentProps) {
  const { t } = useTranslation(['donations', 'common']);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoadingClientSecret, setIsLoadingClientSecret] = useState(true); // Start true as we usually fetch on mount
  const [initError, setInitError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = uuidv4();
      console.log(`[DonationPayment Mount] Initialized idempotencyKeyRef.current: ${idempotencyKeyRef.current}`);
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Effect to fetch client secret when relevant formData changes
  useEffect(() => {
    let isEffectMounted = true;
    
    console.log(`[DonationPayment useEffect] START. IdempotencyKey: ${idempotencyKeyRef.current}. Amount: ${formData.amount}, CoverFees: ${formData.coverFees}, TypeID: ${formData.donationTypeId}, ChurchID: ${churchId}, Anonymous: ${formData.isAnonymous}`);

    const initiateDonationPayment = async () => {
      if (!isEffectMounted) return;
      setIsLoadingClientSecret(true);
      setInitError(null); // Clear previous errors before a new attempt

      try {
        if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
          throw new Error(t('donations:donationPayment.stripeKeyMissing', "Stripe publishable key is not configured."));
        }

        if (!idempotencyKeyRef.current || !formData.donationTypeId || formData.amount <= 0 || !churchId) {
          console.log('[DonationPayment useEffect] Conditions not met for fetching client secret (e.g., amount is 0, or donation type not selected).');
          if (isEffectMounted && clientSecret) { // Clear stale client secret
            setClientSecret(null);
          }
          // No error to set here, just conditions not met.
          return; // Exit early, finally block will set loading to false
        }

        const response = await fetch('/api/donations/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            churchId: churchId,
            donationTypeId: formData.donationTypeId,
            baseAmount: Math.round(formData.amount * 100), // Convert to cents
            currency: 'usd', // Assuming USD, make dynamic if needed
            coverFees: formData.coverFees,
            idempotencyKey: idempotencyKeyRef.current,
            isAnonymous: formData.isAnonymous,
            ...(formData.firstName && !formData.isAnonymous && { firstName: formData.firstName }),
            ...(formData.lastName && !formData.isAnonymous && { lastName: formData.lastName }),
            ...(formData.email && !formData.isAnonymous && { donorEmail: formData.email }), // API expects donorEmail
            ...(formData.phone && !formData.isAnonymous && { phone: formData.phone }),
            ...(!formData.isAnonymous && (formData.address || formData.city || formData.state || formData.zipCode || formData.country) && {
              address: {
                ...(formData.address && { line1: formData.address }), // Assuming formData.address is street/line1
                ...(formData.city && { city: formData.city }),
                ...(formData.state && { state: formData.state }),
                ...(formData.zipCode && { postal_code: formData.zipCode }),
                ...(formData.country && { country: formData.country }),
              }
            })
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to initiate donation. Please try again.' }));
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        const data = await response.json();
        if (isEffectMounted) {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            throw new Error(t('donations:donationPayment.clientSecretError', 'Failed to retrieve client secret.'));
          }
        }
      } catch (error: any) {
        if (isEffectMounted) {
          console.error('[DonationPayment useEffect] Error in initiateDonationPayment:', error);
          setInitError(error.message || t('donations:donationPayment.initError', 'Error initializing payment form.'));
          setClientSecret(null); // Clear client secret on error
        }
      } finally {
        if (isEffectMounted) {
          setIsLoadingClientSecret(false);
        }
      }
    };

    initiateDonationPayment();

    // Cleanup function
    return () => {
      isEffectMounted = false;
      console.log(`[DonationPayment useEffect] CLEANUP. IdempotencyKey: ${idempotencyKeyRef.current}. Amount: ${formData.amount}. Effect instance is being cleaned up.`);
    };
  }, [
    formData.amount,
    formData.coverFees,
    formData.donationTypeId,
    formData.isAnonymous,
    formData.firstName,
    formData.lastName,
    formData.email,
    formData.phone, // Added
    formData.address, // Added (assuming this is street/line1)
    formData.city,    // Added
    formData.state,   // Added
    formData.zipCode, // Added
    formData.country, // Added
    churchId,
    t,
    // idempotencyKeyRef.current should not be a dependency here as it's stable after first mount.
    // clientSecret should not be a dependency; its change is an outcome, not a trigger.
  ]);

  const appearance: StripeElementsOptions['appearance'] = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#0570de',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      colorDanger: '#df1b41',
      fontFamily: 'Ideal Sans, system-ui, sans-serif',
      spacingUnit: '2px',
      borderRadius: '4px',
    }
  };

  // This top-level check for NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY can provide immediate feedback
  // if the key is missing, even before the useEffect runs or if it's somehow bypassed.
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
     return (
      <div className="space-y-6 p-4 border border-red-500 rounded-md bg-red-50">
        <h3 className="text-lg font-medium text-red-700">{t('donations:donationPayment.configErrorTitle', "Configuration Error")}</h3>
        <p className="text-red-600">{t('donations:donationPayment.stripeKeyMissingAdmin', "Stripe publishable key is missing. Please contact support or the site administrator.")}</p>
         <Button type="button" variant="outline" onClick={onBack} className="w-full sm:w-auto">
          {t('common:back', 'Back')}
        </Button>
      </div>
    );
  }

  if (isLoadingClientSecret) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
        <p className="ml-4 text-lg font-medium text-gray-700 dark:text-gray-300">{t('donations:donationPayment.loadingPaymentForm', 'Loading payment form...')}</p>
      </div>
    );
  }

  if (initError || !clientSecret) {
    return (
      <div className="space-y-6 p-4 border border-red-500 rounded-md bg-red-50">
        <h3 className="text-lg font-medium text-red-700">{t('donations:donationPayment.initiationErrorTitle', 'Payment Initialization Failed')}</h3>
        <p className="text-red-600">{initError || t('donations:donationPayment.clientSecretMissing', 'Could not retrieve payment details. Please try refreshing or contact support.')}</p>
        <Button type="button" variant="outline" onClick={onBack} className="w-full sm:w-auto">
          {t('common:back', 'Back')}
        </Button>
      </div>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret, // clientSecret is guaranteed to be a string here
    appearance: appearance,
  };
  
  return (
    <div className="space-y-6">
      <Elements options={options} stripe={stripePromise}>
        <CheckoutForm 
          formData={formData} 
          onBack={onBack} 
          churchId={churchId} 
          churchSlug={churchSlug}
        />
      </Elements>
    </div>
  );
}