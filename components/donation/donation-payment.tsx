"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { DonationFormData } from "./donation-form"
import { Gift, Loader2 } from "lucide-react"

import { useTranslation } from 'react-i18next'

import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  LinkAuthenticationElement,
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
  donorId?: string; // ID of the verified Donor record
  churchName: string; // Added churchName, now required
  idempotencyKey: string; // Added idempotencyKey prop
}

// New Inner component for the payment form itself
interface CheckoutFormProps {
  formData: DonationFormData;
  onBack: () => void;
  churchId: string; // This is the internal DB UUID
  churchSlug: string; // Added to construct dynamic return_url
  churchName: string; // Added for return_url
}

const CheckoutForm = ({ formData, onBack, churchId, churchSlug, churchName }: CheckoutFormProps) => {
  useEffect(() => {
    // Listen for CSP violations
    const handleCSPViolation = (e: SecurityPolicyViolationEvent) => {
      // Debug logging removed: CSP violation details
      // Consider sending to error tracking service in production instead
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
  const [linkEmail, setLinkEmail] = useState(''); // State for LinkAuthenticationElement email

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
    // Debug logging removed: confirming Stripe payment

    const { error } = await stripe.confirmPayment({ // paymentIntent is not reliably returned here with redirect: 'always'
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/${churchSlug}/donation-successful?amount=${formData.amount}&churchName=${encodeURIComponent(churchName || '')}`,
        receipt_email: formData.email || linkEmail || undefined, // Send receipt if email is available
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <LinkAuthenticationElement
        id="link-authentication-element"
        // @ts-ignore - Stripe's event type can be broad, this captures the email if Link provides it.
        onChange={(event) => {
          // Update linkEmail state if user changes email within Link UI
          if (event.value) setLinkEmail(event.value.email);
        }}
      />
      <PaymentElement id="payment-element" onReady={() => setIsPaymentElementReady(true)} options={{
        layout: {
          type: 'accordion',
          defaultCollapsed: false,
          radios: false,
          spacedAccordionItems: true
        }
      }} />
      
      {/* Fee coverage display - logic handled by parent, shown here for context if needed */}
      {formData.coverFees && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('donations:donationPayment.feesCoveredMessage', { amount: baseAmount.toFixed(2) })}
        </div>
      )}

      <Button type="submit" disabled={!stripe || !elements || isProcessing || !isPaymentElementReady} className="w-full">
        {isProcessing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Gift className="mr-2 h-4 w-4" />
        )}
        {isProcessing ? t('donations:donationPayment.processing', 'Processing...') : `${t('donations:donationPayment.donate', 'Donate')} ${displayAmount.toFixed(2)}`}
      </Button>
      
      {message && <div id="payment-message" className="mt-2 text-sm text-red-600 dark:text-red-400">{message}</div>}
      
      <Button type="button" variant="outline" onClick={onBack} className="w-full">
        {t('common:back', 'Back')}
      </Button>
    </form>
  );
};


export default function DonationPayment({ formData, updateFormData, onBack, churchId, churchSlug, donorId, churchName, idempotencyKey }: DonationPaymentProps) {
  const { t } = useTranslation(['donations', 'common']);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoadingClientSecret, setIsLoadingClientSecret] = useState(true); // Start true as we usually fetch on mount
  const [initError, setInitError] = useState<string | null>(null);
  

  // Effect to fetch client secret when relevant formData changes
  useEffect(() => {
    let isEffectMounted = true;
    // Debug logging removed: donation payment effect starting

    const initiateDonationPayment = async () => {
      if (!isEffectMounted) return;
      setIsLoadingClientSecret(true);
      setInitError(null); // Clear previous errors before a new attempt

      try {
        if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
          throw new Error(t('donations:donationPayment.stripeKeyMissing', "Stripe publishable key is not configured."));
        }

        if (!formData.donationTypeId || formData.amount <= 0 || !churchId) {
          // Debug logging removed: conditions not met for client secret
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
            'X-Idempotency-Key': idempotencyKey, // Use the key from props
          },
          body: JSON.stringify({
            idempotencyKey: idempotencyKey, // Add idempotencyKey to the body
            churchId: churchId,
            donationTypeId: formData.donationTypeId,
            baseAmount: Math.round(formData.amount * 100), // Convert to cents
            currency: 'usd', // Assuming USD, make dynamic if needed
            coverFees: formData.coverFees,
            isAnonymous: formData.isAnonymous,
            ...(formData.firstName && !formData.isAnonymous && { firstName: formData.firstName }),
            ...(formData.lastName && !formData.isAnonymous && { lastName: formData.lastName }),
            ...(formData.email && !formData.isAnonymous && { donorEmail: formData.email }), // API expects donorEmail
            ...(formData.phone && !formData.isAnonymous && { phone: formData.phone }),

            // Address info (conditionally added, now flat)
            ...(formData.street && !formData.isAnonymous && { street: formData.street }),
            ...(formData.addressLine2 && !formData.isAnonymous && { addressLine2: formData.addressLine2 }),
            ...(formData.city && !formData.isAnonymous && { city: formData.city }),
            ...(formData.state && !formData.isAnonymous && { state: formData.state }),
            ...(formData.zipCode && !formData.isAnonymous && { zipCode: formData.zipCode }), // Matches flat Zod schema field
            ...(formData.country && !formData.isAnonymous && { country: formData.country }),
            // Note: formData.address (the full formatted string) is not being sent with this change.
            // If it's crucial, it would need its own flat field or specific handling.

            ...(donorId && { donorId: donorId }), // Include donorId if available
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
      // Debug logging removed: effect cleanup
    };
  }, [
    churchId,
    formData.amount,
    formData.coverFees,
    formData.email,
    donorId, // Added donorId as it's used in the API call
    // t, // t function from useTranslation is generally stable; add if translations inside effect change
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
      <div className="flex flex-col justify-center items-center p-8 w-full"> {/* Added w-full and flex-col */}
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" /> {/* Removed mx-auto */}
        <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">{t('donations:donationPayment.loadingPaymentForm', 'Loading payment form...')}</p> {/* Added mt-4 */}
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
    clientSecret: clientSecret!, // Ensured by checks above to be a string
    appearance: appearance
  };
  
  return (
    <div className="space-y-6">
      <Elements options={options} stripe={stripePromise}>
        <CheckoutForm formData={formData} onBack={onBack} churchId={churchId} churchSlug={churchSlug} churchName={churchName} />
    </Elements>
  </div>
  );
}

