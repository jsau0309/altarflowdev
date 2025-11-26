"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button"
import type { DonationFormData } from "./donation-form"
import { Gift, Loader2 } from "lucide-react"

import { useTranslation } from 'react-i18next'
import { usePostHog } from '@/hooks/use-posthog'

import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  LinkAuthenticationElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

// Load Stripe with optional Connect account
const getStripePromise = (stripeAccount?: string | null) => {
  if (stripeAccount) {
    return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, {
      stripeAccount: stripeAccount
    });
  }
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

interface DonationPaymentProps {
  formData: DonationFormData;
  updateFormData: (data: Partial<DonationFormData>) => void;
  onBack: () => void;
  churchId: string;
  churchSlug: string; // Added churchSlug to construct dynamic return_url
  donorId?: string; // ID of the verified Donor record
  churchName: string; // Added churchName, now required
  clientSecret?: string; // Payment intent client secret (created early after OTP)
  stripeAccount?: string; // Stripe Connect account ID
}

// New Inner component for the payment form itself
interface CheckoutFormProps {
  formData: DonationFormData;
  onBack: () => void;
  churchId: string; // This is the internal DB UUID
  churchSlug: string; // Added to construct dynamic return_url
  churchName: string; // Added for return_url
}

const CheckoutForm = ({ formData, onBack, churchId: _churchId, churchSlug, churchName }: CheckoutFormProps) => {
  useEffect(() => {
    // Listen for CSP violations
    const handleCSPViolation = () => {
      // Debug logging removed: CSP violation details
      // Consider sending to error tracking service in production instead
    };
    document.addEventListener('securitypolicyviolation', handleCSPViolation);
    
    // Suppress WKWebView postMessage errors in WebView environments
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorString = args[0]?.toString() || '';
      // Filter out WKWebView postMessage errors which are harmless
      if (errorString.includes('WKWebView') || errorString.includes('postMessage')) {
        return; // Suppress this specific error
      }
      originalConsoleError.apply(console, args);
    };
    
    // Global error handler to suppress WKWebView errors from appearing in UI
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message?.includes('WKWebView') || event.message?.includes('postMessage')) {
        event.preventDefault(); // Prevent the error from appearing in the UI
        return false;
      }
    };
    window.addEventListener('error', handleGlobalError);
    
    return () => {
      document.removeEventListener('securitypolicyviolation', handleCSPViolation);
      console.error = originalConsoleError; // Restore original console.error
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useTranslation(['donations', 'common']);
  const { trackEvent } = usePostHog();

  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentElementReady, setIsPaymentElementReady] = useState(false);

  // Calculate display amount based on formData
  const baseAmount = formData.amount || 0;
  let displayAmount = baseAmount;
  if (formData.coverFees && baseAmount > 0) {
    const STRIPE_PERCENTAGE_FEE_RATE = 0.029;
    const STRIPE_FIXED_FEE_CENTS = 30;
    const PLATFORM_FEE_RATE = 0.01; // 1% platform fee

    const baseAmountInCents = Math.round(baseAmount * 100);

    // Correct gross-up calculation: combine both percentage fees in the divisor
    // Formula: final_amount = (base_amount + fixed_fee) / (1 - stripe_rate - platform_rate)
    const finalAmountForStripeInCents = Math.ceil(
      (baseAmountInCents + STRIPE_FIXED_FEE_CENTS) /
      (1 - STRIPE_PERCENTAGE_FEE_RATE - PLATFORM_FEE_RATE)
    );

    displayAmount = finalAmountForStripeInCents / 100;
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

    // Track donation attempt
    trackEvent('donation_initiated', {
      amount: displayAmount,
      donation_type: formData.donationTypeName || 'Unknown',
      donation_type_category: formData.donationTypeIsCampaign ? 'campaign' : 'fund',
      church_slug: churchSlug,
      covers_fees: formData.coverFees || false,
    });

    // Build success URL using URLSearchParams for safer parameter encoding
    const successParams = new URLSearchParams({
      amount: formData.amount.toString(),
      churchName: churchName || '',
      fundName: formData.donationTypeName || ''
    });
    const calculatedReturnUrl = `${window.location.origin}/${churchSlug}/donation-successful?${successParams.toString()}`;
    // Debug logging removed: confirming Stripe payment

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: calculatedReturnUrl,
        // receipt_email removed - we send custom receipts via webhook/Resend instead
      },
      redirect: "if_required" // Changed to if_required to handle redirect better
    });

    // Handle the response
    if (error) {
      // Error occurred
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message || t('donations:donationPayment.genericPaymentError', "An error occurred with your payment."));
      } else {
        setMessage(t('donations:donationPayment.unexpectedPaymentError', "An unexpected error occurred. Please try again."));
      }
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment succeeded but redirect didn't happen automatically (e.g., in WebView)
      // Clear the session storage to allow future donations
      const donationKey = `donation_${churchSlug}_${formData.donationTypeId}_${formData.amount}_${formData.coverFees}_${formData.donationTypeIsCampaign ? 'campaign' : 'fund'}`;
      sessionStorage.removeItem(donationKey);

      // Manually redirect to success page (reuse the same URL constructed above)
      window.location.href = calculatedReturnUrl;
    } else {
      // Payment is processing or requires additional action
      // The redirect should have happened automatically
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <LinkAuthenticationElement
        id="link-authentication-element"
      />
      <PaymentElement id="payment-element" onReady={() => setIsPaymentElementReady(true)} options={{
        layout: {
          type: 'accordion',
          defaultCollapsed: false,
          radios: false,
          spacedAccordionItems: true
        },
        // Explicitly enable wallets (Apple Pay, Google Pay)
        wallets: {
          applePay: 'auto',
          googlePay: 'auto'
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


export default function DonationPayment({
  formData,
  onBack,
  churchId,
  churchSlug,
  donorId,
  churchName,
  clientSecret: propClientSecret,
  stripeAccount: propStripeAccount
}: DonationPaymentProps) {
  const { t, i18n } = useTranslation(['donations', 'common']);

  // For verified donors: use clientSecret passed as prop (created early after OTP)
  // For anonymous/international: create clientSecret here on mount
  const [clientSecret, setClientSecret] = useState<string | null>(propClientSecret || null);
  const [stripeAccount, setStripeAccount] = useState<string | null>(propStripeAccount || null);
  // Start in loading state if we don't have a clientSecret yet (anonymous/international donors)
  // This prevents error flash before useEffect creates the payment intent
  const [isLoadingClientSecret, setIsLoadingClientSecret] = useState(!propClientSecret);
  const [initError, setInitError] = useState<string | null>(null);
  const initializationRef = useRef<AbortController | null>(null);
  const hasInitiatedRef = useRef<boolean>(false);

  // Payment intent creation:
  // - Verified donors: Created early (after OTP) in DonationInfo - enables Stripe Link
  // - Anonymous/International donors: Created here on mount - same as before ALT-75

  // Function to create payment intent for anonymous/international donors
  const initiateDonationPayment = useCallback(async () => {
    // Skip if we already have clientSecret (verified donor)
    if (propClientSecret) {
      return;
    }

    // Prevent multiple simultaneous calls or re-initialization
    if (initializationRef.current || hasInitiatedRef.current) {
      return;
    }

    // Mark as initiated to prevent race conditions
    hasInitiatedRef.current = true;

    // Check required fields
    if (!formData.donationTypeId || formData.amount <= 0 || !churchId) {
      setIsLoadingClientSecret(false);
      setInitError('Missing required donation information. Please go back and complete all fields.');
      return;
    }

    const abortController = new AbortController();
    initializationRef.current = abortController;

    setIsLoadingClientSecret(true);
    setInitError(null);

    try {
      const uniqueIdempotencyKey = `${crypto.randomUUID()}_${formData.donationTypeId}_${formData.amount}_${formData.coverFees}_${Date.now()}`;

      const response = await fetch('/api/donations/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': uniqueIdempotencyKey,
        },
        body: JSON.stringify({
          idempotencyKey: uniqueIdempotencyKey,
          churchId: churchId,
          donationTypeId: formData.donationTypeId,
          baseAmount: Math.round(formData.amount * 100),
          currency: 'usd',
          coverFees: formData.coverFees,
          isAnonymous: formData.isAnonymous,
          isInternational: formData.isInternational || false,
          ...(formData.firstName && { firstName: formData.firstName }),
          ...(formData.lastName && { lastName: formData.lastName }),
          ...(formData.email && { donorEmail: formData.email }),
          ...(formData.phone && !formData.isAnonymous && { phone: formData.phone }),
          ...(formData.donorCountry && { donorCountry: formData.donorCountry }),
          ...(formData.street && !formData.isAnonymous && { street: formData.street }),
          ...(formData.addressLine2 && !formData.isAnonymous && { addressLine2: formData.addressLine2 }),
          ...(formData.city && !formData.isAnonymous && { city: formData.city }),
          ...(formData.state && !formData.isAnonymous && { state: formData.state }),
          ...(formData.zipCode && !formData.isAnonymous && { zipCode: formData.zipCode }),
          ...(formData.country && !formData.isAnonymous && { country: formData.country }),
          ...(donorId && { donorId: donorId }),
          donorLanguage: (i18n.language === 'es' || i18n.language.startsWith('es-')) ? 'es' : 'en', // Normalize language code
        }),
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) {
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to initiate donation.' }));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setStripeAccount(data.stripeAccount || null);
        setIsLoadingClientSecret(false);
        initializationRef.current = null;
      } else {
        throw new Error(t('donations:donationPayment.clientSecretError', 'Failed to retrieve client secret.'));
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Don't change loading state if aborted - let the new request handle it
        initializationRef.current = null;
        hasInitiatedRef.current = false;
        return;
      }
      setInitError(error instanceof Error ? error.message : t('donations:donationPayment.initError', 'Error initializing payment form.'));
      setClientSecret(null);
      setIsLoadingClientSecret(false);
      initializationRef.current = null;
      hasInitiatedRef.current = false; // Reset on error to allow retry
    }
  }, [formData, churchId, donorId, propClientSecret, t, i18n.language]);

  // Effect to initialize payment for anonymous/international donors
  useEffect(() => {
    if (!propClientSecret && formData.donationTypeId && formData.amount > 0 && churchId) {
      initiateDonationPayment();
    }

    return () => {
      if (initializationRef.current) {
        initializationRef.current.abort();
        initializationRef.current = null;
        hasInitiatedRef.current = false; // Reset on cleanup to allow re-initialization
      }
    };
  }, [initiateDonationPayment, propClientSecret, formData.donationTypeId, formData.amount, churchId]);

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

  // Configuration check
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

  // Show loading state while creating payment intent for anonymous/international donors
  if (isLoadingClientSecret) {
    return (
      <div className="flex flex-col justify-center items-center p-8 w-full">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">{t('donations:donationPayment.loadingPaymentForm', 'Loading payment form...')}</p>
      </div>
    );
  }

  // Show error if payment intent creation failed
  if (initError || (!clientSecret && !isLoadingClientSecret)) {
    return (
      <div className="space-y-6 p-4 border border-red-500 rounded-md bg-red-50">
        <h3 className="text-lg font-medium text-red-700">{t('donations:donationPayment.initiationErrorTitle', 'Payment Initialization Failed')}</h3>
        <p className="text-red-600">{initError || t('donations:donationPayment.clientSecretMissing', 'Could not retrieve payment details. Please try going back and verifying your information again.')}</p>
        <Button type="button" variant="outline" onClick={onBack} className="w-full sm:w-auto">
          {t('common:back', 'Back')}
        </Button>
      </div>
    );
  }

  // At this point, we should have a clientSecret (either from prop or created here)
  if (!clientSecret) {
    return null; // Still initializing
  }

  const options: StripeElementsOptions = {
    clientSecret: clientSecret!, // Ensured by checks above to be a string
    appearance: appearance,
    locale: i18n.language === 'es' ? 'es' : 'en' // Set Stripe UI language based on current i18n language
  };
  
  return (
    <div className="space-y-6">
      <Elements options={options} stripe={getStripePromise(stripeAccount)}>
        <CheckoutForm formData={formData} onBack={onBack} churchId={churchId} churchSlug={churchSlug} churchName={churchName} />
      </Elements>
    </div>
  );
}